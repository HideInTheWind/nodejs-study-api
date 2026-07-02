import { Router } from "express";
import prisma from "./lib/prisma.ts";
import type { Request, Response, NextFunction } from "express";
import type { Order } from "./generated/prisma/client.ts";
import { isPositiveInteger } from "./utils/tools.ts";
import { authenticate } from "./middleware/auth.ts";
import { enqueueOrderEmail } from "./queue/emailQueue.ts";

const router = Router();
router.use(authenticate);

/**
 * 无效返回函数
 * @param res
 * @param id
 * @returns
 */
const parseTodoId = (res: Response, raw: string): number | null => {
  const id = Number(raw);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return null;
  }
  return id;
};

/**
 *
 * @param id
 * @returns
 */
const findOrderById = async (id: number): Promise<Order | null> => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });

  return order;
};

/**
 * 获取所有商品
 * @param req
 * @param res
 * @param next
 * @returns
 */

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: {
        id: "asc",
      },
      include: {
        user: true,
        orderItems: true,
      },
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

/**
 * 获取一个商品
 * @param req
 * @param res
 * @param next
 * @returns
 */

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const orderId = parseTodoId(res, id as string);
    if (!orderId) return;
    const order = await findOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * 创建一个订单
 * @param req
 * @param res
 * @param next
 * @returns
 */

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;

    // 校验

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items must be an array" });
    }

    for (const item of items) {
      const { productId, quantity } = item;
      if (productId == null || quantity == null) {
        return res
          .status(400)
          .json({ error: "Each item needs productId and quantity" });
      }
      const quantityIsPositiveInteger = isPositiveInteger(item.quantity);
      if (!quantityIsPositiveInteger) {
        return res
          .status(400)
          .json({ error: "quantity must be a positive integer" });
      }
    }

    // 事务逻辑

    const order = await prisma.$transaction(async (tx) => {
      // ① 先检查：商品存在 + 库存是否足够
      for (const item of items) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity);
        const product = await tx.product.findUnique({
          where: { id: productId },
        });
        if (!product) {
          throw new Error(`Product ${productId} not found`);
        }
        if (product.stock < quantity) {
          throw new Error(`Insufficient stock for product ${productId}`);
        }
      }

      // 创建订单
      const newOrder = await tx.order.create({
        data: {
          userId: req.userId!,
        },
      });

      // 创建订单明细
      for (const item of items) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity);

        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId,
            quantity,
            price: product!.price,
          },
        });

        await tx.product.update({
          where: {
            id: productId,
          },
          data: {
            stock: {
              decrement: quantity,
            },
          },
        });
      }

      return await tx.order.findUnique({
        where: {
          id: newOrder.id,
        },
        include: {
          user: true,
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    if (order?.user?.email) {
      await enqueueOrderEmail({
        orderId: order.id,
        userId: order.userId,
        email: order.user.email,
      });
    }
    return res.status(201).json(order);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("not found") ||
        error.message.includes("Insufficient stock"))
    ) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
