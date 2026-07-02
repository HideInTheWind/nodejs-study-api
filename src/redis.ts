import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(redisUrl);

redis.on("connect", () => {
  console.log("已经连接");
});

redis.on("error", (err) => {
  console.log("redis 连接错误", err.message);
});
