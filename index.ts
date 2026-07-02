import express from "express";
import authRouter from "./src/auth.ts";
import todoRouter from "./src/todo.ts";
import productRouter from "./src/product.ts";
import orderRouter from "./src/order.ts";
import type { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@/swagger.ts";
import { redis } from "@/redis.ts";

interface HttpError extends Error {
  status?: number;
}
// const express = require("express");

// 创建一个应用实例 app。
const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log("请求来了", req.url, req.method, req.path);
  // 交给下一个中间件或路由；不调 next()，请求就会卡住，客户端一直转圈。
  next();
});

const allowedOrigins = [
  // ✅ 生产写法：按环境变量白名单来
  // "https://你的前端域名.com",
  // "https://www.你的前端域名.com",
  "http://localhost:10086",
  "http://192.168.88.119:10086",
];
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    // 否则 Nginx、Cloudflare 等可能缓存错 origin 的响应，线上会出现「偶发 CORS 失败」。
    // 防止 CDN 把 A 域名的 CORS 响应缓存给 B 域名

    res.set("Vary", "Origin");
    //允许跨域带 Cookie / 凭证
    res.set("Access-Control-Allow-Credentials", "true");
  }
  res.set({
    // "Access-Control-Allow-Origin": "http://192.168.88.119:10086/", // 允许哪个前端来源访问
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", // 允许哪些 HTTP 方法
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // 允许哪些请求头
    "Access-Control-Max-Age": "86400", // 预检 OPTIONS 结果缓存 24 小时，少发预检
    "Access-Control-Expose-Headers": "Content-Disposition, Content-Length", // 允许浏览器访问哪些响应头
  });

  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }
  next();
});

// app.use(cors({
//   origin: "http://localhost:5173",
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type"],
// }));

// 解析 JSON 请求体（以后用 JSON 发也可以）
app.use(express.json());
// 解析 Postman 的 x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

const PORT = 8080;

// 注册一条路由：当有人用 GET 访问 /health 时，执行后面的函数。
app.get("/health", (req: Request, res: Response) => {
  console.log("health", req, res);
  // 把对象转成 JSON，作为 HTTP 响应体 返回给浏览器/客户端。同时 Express 会自动设置 Content-Type: application/json。
  res.json({
    status: "ok",
    message: "API is running",
  });
});

//
app.use("/api/auth", authRouter);

// 挂载 todo 路由模块
app.use("/api/todos", todoRouter);

// 挂载 product 路由模块
app.use("/api/products", productRouter);

// 挂载 order 路由模块
app.use("/api/orders", orderRouter);

// 挂载 swagger 路由模块
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 *  404 兜底路由: 当所有路由都匹配失败时，执行这个中间件。
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    error: "route not Found",
  });
});

/**
 * 500 错误处理中间件: 当有错误发生时，执行这个中间件。
 */
app.use((error: HttpError, req: Request, res: Response, next: NextFunction) => {
  res.status(error.status || 500);
  res.json({
    error: error.message,
    success: false,
  });
});

// 启动服务器
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
