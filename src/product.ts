import { Router } from "express";
import prisma from "./lib/prisma.ts";
import type { Request, Response, NextFunction } from "express";
import type { Product } from "./generated/prisma/client.ts";
import { redis } from "./redis.ts";

const router = Router();

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
const findProductById = async (id: number): Promise<Product | null> => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  return product;
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
    const cacheKey = "products:list";
    const CACHE_TTL = 60; // 缓存多久，单位s

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }
    const products = await prisma.product.findMany({
      orderBy: {
        id: "asc",
      },
    });
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(products));
    res.json(products);
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
    const productId = parseTodoId(res, id as string);
    if (!productId) return;
    const product = await findProductById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
});

export default router;
