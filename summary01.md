# Docker 使用流程（第 21 课）

## 流程概览

```
1. 概念验证（hello-world / volume）
2. Dockerfile 构建 API 镜像 → docker run 单容器
3. Compose 起 postgres + redis → migrate
4. Compose 加 api → 服务名互联
5. Compose 加 worker → 全链路
6. 环境变量整理 → docker compose up -d --build 一键启动
```

---

## 1. 概念验证

```powershell
docker version
docker run --rm hello-world
docker ps -a

# Volume 体验
docker run --rm -v demo-vol:/data alpine sh -c "echo hello > /data/test.txt && cat /data/test.txt"
docker volume ls
docker volume rm demo-vol   # 可选清理
```

---

## 2. Dockerfile —— 单容器跑 API

**文件：** `Dockerfile`、`.dockerignore`

```powershell
docker build -t nodejs-api .

docker run --rm -p 8080:8080 `
  -e DATABASE_URL="postgresql://postgres:密码@host.docker.internal:5432/nodejs_study?schema=public" `
  -e REDIS_URL="redis://host.docker.internal:6379" `
  -e JWT_SECRET="你的JWT_SECRET" `
  nodejs-api

curl http://localhost:8080/health
```

> API 在容器内连宿主机服务 → 用 `host.docker.internal`，不用 `localhost`。

---

## 3. Compose —— postgres + redis

**文件：** `docker-compose.yml`（先只写 postgres、redis）

```powershell
docker compose up -d
docker compose ps

docker exec nodejs-redis redis-cli ping   # 期望 PONG

# 初始化 Compose 空库（端口看 compose 映射，本项目是 5433）
$env:DATABASE_URL="postgresql://postgres:密码@localhost:5433/nodejs_study?schema=public"
npx prisma migrate deploy
```

> 端口冲突时改 compose 映射，如 `"5433:5432"`；宿主机 migrate 用**映射后的端口**（5433），不是 5432。

---

## 4. Compose —— 加 api

在 `docker-compose.yml` 追加 `api` 服务后：

```powershell
docker compose up -d --build api
docker compose ps
docker compose logs api --tail 30

curl http://localhost:8080/health
curl http://localhost:8080/api/products
```

> 容器内连 PG/Redis → `@postgres:5432`、`redis://redis:6379`（服务名，不是 localhost）。

---

## 5. Compose —— 加 worker

在 `docker-compose.yml` 追加 `worker` 服务后：

```powershell
docker compose up -d worker
docker compose logs worker --tail 10

# 下单后看 worker 是否消费
docker compose logs worker --tail 5
```

---

## 6. 环境变量 + 一键启动

**.env（宿主机 / compose 变量替换）：**

```env
POSTGRES_PASSWORD=你的密码
DATABASE_URL="postgresql://postgres:密码@localhost:5432/nodejs_study?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="..."
```

**compose 里 api 环境变量（容器内）：**

```yaml
DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/nodejs_study?schema=public
REDIS_URL: redis://redis:6379
JWT_SECRET: ${JWT_SECRET}
```

**操作 Compose 库时（migrate / studio / test），临时覆盖，不必改 .env：**

```powershell
$env:DATABASE_URL="postgresql://postgres:密码@localhost:5433/nodejs_study?schema=public"
npx prisma migrate deploy
npx prisma studio
npm test
```

**日常命令：**

```powershell
# 一键启动全部
docker compose up -d --build

# 查看状态 / 日志
docker compose ps
docker compose logs api --tail 30
docker compose logs worker --tail 10

# 停止（Volume 保留）
docker compose down

# 停止并删 Volume（慎用，丢库）
docker compose down -v
```

---

## 连接串速查

| 场景 | DATABASE_URL | REDIS_URL |
|------|--------------|-----------|
| 宿主机 `npm run dev` | `@localhost:5432` | `redis://localhost:6379` |
| 单容器 `docker run` API | `@host.docker.internal:5432` | `redis://host.docker.internal:6379` |
| Compose 内 api / worker | `@postgres:5432` | `redis://redis:6379` |
| 宿主机操作 Compose 库 | `@localhost:5433` | `redis://localhost:6379` |
