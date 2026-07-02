# Node 学习进度快照（更新于 2026-06-28）



## 学习规划



- 总规划：`studyNode.md` 12 周路线

- 阶段总结：`summary01.md`（鉴权 + 工程化 + Redis + Docker 笔记）

- Docker 笔记：`docker.md`

- 学习方式：**一步一步、我自己动手，AI 只讲解和验收，不要一次性生成一堆代码**

- 语言：**TypeScript**



## 已完成



### 第 1–2 周：后端基础 ✅



- Express + 中间件 + CORS + REST

- Todo API（最初是内存版）

- 项目：`D:\yunyanshijie\skill_test\nodejs`



### 第 3–4 周：数据库 + ORM ✅



- [x] Prisma 7 + PostgreSQL `nodejs_study`

- [x] Todo CRUD 接数据库

- [x] 第 9 课：User + Todo 一对多

- [x] 第 10 课：Product / Order / OrderItem

- [x] 第 11 课：事务 `$transaction` 下单扣库存

- [x] ER 图



### 第 5–6 周：鉴权与权限 ✅



- [x] 第 12 课：`User.password` 字段 + migration

- [x] 第 13 课：bcrypt + `POST /api/auth/register`

- [x] 第 14 课：登录 + JWT `POST /api/auth/login`

- [x] 第 15 课：`src/middleware/auth.ts`，Todo 只能操作自己的



### 第 7–8 周：工程化 ✅



- [x] 第 16 课：Order 加鉴权（`authenticate` + `userId` 从 token 取；403 归属校验；POST 201 返回完整订单）

- [x] 第 17 课：Swagger 接口文档（`/api-docs`，Auth / Todo / Product / Order）

- [x] 第 18 课：Jest + supertest（`npm test` 8 个用例全绿）

- [x] ~~第 19 课：分层重构~~（**跳过**，不做了）



### 第 9–10 周：Redis + 常见业务 ✅



- [x] 第 20 课第 1 步：Redis 连接（WSL + Docker + `ioredis`，`PING → PONG`）

- [x] 第 20 课第 2 步：`GET /api/products` Cache-Aside + TTL（`products:list`，60s）

- [x] 第 20 课第 3 步：登录/注册限流（`src/middleware/rateLimit.ts`，INCR + EXPIRE，429）

- [x] 第 20 课第 4 步：下单后邮件 mock 队列（`LPUSH` / `BRPOP`，`npm run worker:email`）



### 第 11–12 周：Docker + Compose ✅（本地容器化已完成）



- [x] 第 21 课第 1 步：Docker 概念（Image / Container / Volume / Network）+ hello-world

- [x] 第 21 课第 2 步：`Dockerfile` + `.dockerignore`，`docker build -t nodejs-api .`，单容器 API 跑通 `/health`

- [x] 第 21 课第 3 步（上）：`docker-compose.yml` 先起 `postgres` + `redis`（`5433:5432` 映射，Volume `pgdata`）

- [x] 第 21 课第 3 步（下）：compose 加 `api`，服务名互联（`postgres:5432` / `redis:6379`）

- [x] 第 21 课第 3 步（完）：compose 加 `worker`（`command: npm run worker:email`），下单 → `[Mock Email]` 全链路验证

- [x] 第 21 课第 4 步：环境变量整理（`POSTGRES_PASSWORD` + compose 引用 `${POSTGRES_PASSWORD}` / `${JWT_SECRET}`）



## 进行中



### 第 11–12 周：云部署 ⏳



- 目标：API 公网可访问；云上 PostgreSQL + Redis；Worker 可选同平台部署

- 推荐平台：**Railway**（或 Render，二选一）

- 待做：代码推 GitHub → 建云 PG/Redis → 部署 API（Dockerfile）→ 生产 migrate → 部署 Worker → 验证

- 之后（云部署完成后）：项目文档（架构图、技术选型、难点 3 条）



## 技术栈现状



- Express 5 + TypeScript (tsx)

- Prisma 7.8 + `@prisma/adapter-pg` + pg

- PostgreSQL 18，库名 `nodejs_study`

- Redis 7（ioredis：缓存 / 限流 / 队列）

- bcryptjs + jsonwebtoken

- swagger-ui-express + swagger-jsdoc

- Jest 30 + ts-jest + supertest（**维持现状 8 用例，不再扩展**）

- Docker + Docker Compose（四服务一键启动）



## 本地双数据库说明（重要）



当前存在 **两套 PostgreSQL**，数据互不相通：



| 连接方式 | 用途 |

|----------|------|

| `.env` → `localhost:5432` | 本机直装 PG；`npm run dev`、默认 `npm test` |

| Compose 映射 → `localhost:5433` | Compose 的 `pgdata` 卷；宿主机 migrate/studio/test 连这套库时用 |

| compose `api` → `postgres:5432` | 容器内视角，连 Compose PG |



**操作 Compose 库时**（migrate / studio / test），在 PowerShell 临时覆盖（不必改 `.env`）：



```powershell

$env:DATABASE_URL="postgresql://postgres:你的密码@localhost:5433/nodejs_study?schema=public"

npx prisma migrate deploy   # 或 studio / npm test

```



Shell 环境变量优先级高于 `.env` 文件。



## 关键文件



| 文件 | 作用 |

|------|------|

| `Dockerfile` | Node 22 bookworm-slim，`npm ci` + `prisma generate` + `npm start` |

| `.dockerignore` | 排除 `node_modules`、`.env`、`.git`、`tests`、`*.md` |

| `docker-compose.yml` | postgres + redis + api + worker；PG 端口 `5433:5432` |

| `src/redis.ts` | Redis 单例客户端 |

| `src/product.ts` | 商品列表 Cache-Aside 缓存 |

| `src/middleware/rateLimit.ts` | 登录/注册固定窗口限流 |

| `src/queue/emailQueue.ts` | 邮件任务入队（`email:queue`） |

| `src/workers/emailWorker.ts` | 邮件消费者（`npm run worker:email`） |



## 常用命令



```powershell

# 一键启动（项目根目录）

docker compose up -d --build

docker compose ps

docker compose logs api --tail 30

docker compose logs worker --tail 10

curl http://localhost:8080/health



# 停止（Volume 保留）

docker compose down



# 停止并删 Volume（慎用，丢库）

docker compose down -v

```



## API 路由一览



| 路由 | 需登录 | 说明 |

|------|--------|------|

| `GET /health` | 否 | 健康检查 |

| `GET /api-docs` | 否 | Swagger UI |

| `POST /api/auth/register` | 否 | 注册（限流 60s/3 次） |

| `POST /api/auth/login` | 否 | 登录，返回 JWT（限流 60s/5 次） |

| `/api/todos` | **是** | Todo CRUD，Bearer token |

| `GET /api/products` | 否 | 商品列表（Redis 缓存 TTL 60s） |

| `GET /api/products/:id` | 否 | 单个商品（直查 DB） |

| `/api/orders` | **是** | 订单查询 + 事务下单（成功后邮件入队） |



## 测试现状（`npm test` → 8 passed，不再扩展）



| 文件 | 内容 |

|------|------|

| `tests/health.test.ts` | GET /health |

| `tests/auth.test.ts` | Todo 测试（401 / CRUD / 403） |

| `tests/order.test.ts` | 下单 + 库存扣减 + 401 |

| `tests/setup.ts` | dotenv + `NODE_ENV=test` |



> 已知：测试结束时有 Redis 连接未关闭的 worker 警告，不影响断言；暂不处理。



## 已知待办（非阻塞）



- [ ] `.env.example` 补充 `POSTGRES_PASSWORD` 与 Compose 端口 `5433` 说明

- [ ] `src/swagger.ts` 中 `POST /api/orders` 的 `properties` 应放在 `schema` 内部

- [ ] 云部署完成后写项目文档（架构图、技术选型、难点 3 条）



## 已跳过（明确不做）



- ~~第 19 课分层~~：`repository → service → controller`

- ~~扩展 Jest~~：限流 429、缓存 HIT 等新用例



## 下一步



> **第 22 课第 1 步（云部署准备）**：选 Railway（推荐）或 Render；确认代码在 GitHub；理清云上需要的环境变量清单。



> 建议顺序：

> 1. 代码 push 到 GitHub（`.env` 已在 `.gitignore`，勿提交密钥）

> 2. Railway 新建 Project → 添加 **PostgreSQL** + **Redis** 插件

> 3. 从 GitHub 部署 **API**（Root Directory 项目根，Build：`Dockerfile`）

> 4. 配置环境变量：`DATABASE_URL`、`REDIS_URL`、`JWT_SECRET`（用 Railway 提供的连接串）

> 5. 生产环境跑 `prisma migrate deploy`（Railway 一次性命令或本地连生产库）

> 6. 再部署 **Worker**（同一 repo，Start Command：`npm run worker:email`，只需 `REDIS_URL`）

> 7. 公网访问 `/health`、`/api-docs` 验证



> 云上连接串规则（与本地 compose 相同思路）：

> - API / Worker 容器内：用平台提供的 **内部 hostname**（不是 `localhost`）

> - 本地 CLI 连云 PG：用平台提供的 **外部连接串**



> 新对话开场可复制：

>

> 请先读 `@studyNode.md`、`@PROGRESS.md`、`@docker.md` 里的进度快照。从 PROGRESS.md 的「下一步」继续 **第 22 课云部署（Railway）**。要求：一步一步带学，我自己动手改代码、跑命令，不要一次性生成大量文件，后续都用 TypeScript。


