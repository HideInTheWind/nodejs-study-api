import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "./lib/prisma.ts";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { rateLimit } from "./middleware/rateLimit.ts";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

const router = Router();

/**
 * 注册用户
 */
router.post(
  "/register",
  rateLimit({ windowSec: 60, max: 3, keyPrefix: "ratelimit:register" }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = req.body;

      // 校验字段格式
      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof name != "string"
      ) {
        return res
          .status(400)
          .json({ error: "email, password, name are required" });
      }

      const trimmedEmail = email.trim();
      const trimmedName = name.trim();
      if (!trimmedEmail || !password || !trimmedName) {
        return res
          .status(400)
          .json({ error: "email, password, name cannot be empty" });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "password must be at least 6 characters" });
      }

      // 加密
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: trimmedEmail,
          name: trimmedName,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
      return res.status(201).json(user);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        // 409 Conflict：资源冲突（邮箱已被占用）
        return res.status(409).json({ error: "Email already registered" });
      }
      next(error);
    }
  },
);

/**
 * 登录
 */
router.post(
  "/login",
  rateLimit({ windowSec: 60, max: 5, keyPrefix: "ratelimit:login" }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      if (typeof email !== "string" || typeof password !== "string") {
        return res
          .status(400)
          .json({ error: "email and password are required" });
      }
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        return res
          .status(400)
          .json({ error: "email and password cannot be empty" });
      }

      const user = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        {
          expiresIn: "7d",
        },
      );
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
