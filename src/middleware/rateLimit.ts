import { redis } from "../redis.ts";
import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowSec: number; // 时间窗口（秒）
  max: number; // 窗口内最多几次
  keyPrefix: string; // 如 "ratelimit:login"
}

export const rateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { windowSec, max, keyPrefix } = options;

      // 为什么用 IP 而不是 email？
      // 攻击者可以换邮箱，IP 更通用
      const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";

      const key = `${keyPrefix}:${ip}`;
      // INCR 是原子的，并发安全（多个请求同时 +1 不会乱）
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      if (count > max) {
        return res
          .status(429)
          .json({ error: "Too Many Requests, please try again later" });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
