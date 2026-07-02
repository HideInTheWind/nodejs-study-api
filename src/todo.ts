import { Router } from "express";
import prisma from "./lib/prisma.ts";
import type { Request, Response, NextFunction } from "express";
import type { Todo } from "./generated/prisma/client.ts";
import { authenticate } from "./middleware/auth.ts";

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
const findTodoById = async (id: number): Promise<Todo | null> => {
  const todo = await prisma.todo.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  return todo;
};

/**
 * 获取所有待办事项
 */

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { userId: req.userId },
      orderBy: {
        id: "asc",
      },
      include: {
        user: true,
      },
    });

    res.json(todos);
  } catch (error) {
    next(error);
  }
});
/**
 * 获取一个待办事项
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const todoId = parseTodoId(res, id as string);
    if (todoId === null) return;

    const todo = await findTodoById(todoId);
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    if (todo.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(todo);
  } catch (error) {
    next(error);
  }
});

/**
 * 创建一个新的待办事项
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const newTodo = await prisma.todo.create({
      data: {
        title,
        done: false,
        userId: req.userId!,
      },
    });
    res.status(201).json(newTodo);
  } catch (error) {
    next(error);
  }
});

/**
 * 更新一个待办事项
 */
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const todoId = parseTodoId(res, id as string);
    if (todoId === null) return;

    const existing = await findTodoById(todoId);
    if (!existing) {
      return res.status(404).json({ error: "Todo not found" });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { title, done } = req.body;
    const updated = await prisma.todo.update({
      where: { id: todoId },
      data: {
        ...(title != undefined && { title }),
        ...(done != undefined && { done }),
      },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * 删除一个待办事项
 */
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const todoId = parseTodoId(res, id as string);
      if (todoId === null) return;

      const existing = await findTodoById(todoId);

      if (!existing) return res.status(404).json({ error: "Todo not found" });
      if (existing.userId !== req.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await prisma.todo.delete({ where: { id: todoId } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
