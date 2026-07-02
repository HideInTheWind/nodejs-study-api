

# 1. 基础镜像：Node 22，Debian slim（Prisma 比 alpine 少踩坑）
# 基础镜像：后面所有构建步骤都基于它，
# Node 22：Node.js 22 版本
# Debian slim：bookworm-slim 就是 Debian 12 精简版，体积比完整 Debian 小，
# Prisma 比 alpine 少踩坑：Prisma 在 Alpine（musl libc）上常遇到兼容问题，Debian 更稳
FROM node:22-bookworm-slim

# 2. 在容器里创建并进入 /app 目录，后面的 COPY、RUN 默认都在这里执行

WORKDIR /app

# 3. 先只复制依赖清单 → 利用 Docker 层缓存
COPY package.json package-lock.json ./

# 4. 安装生产+开发依赖（tsx、prisma 都在 devDependencies，运行时需要）
RUN npm ci

# 5. 复制 Prisma  schema，生成 Client
COPY prisma ./prisma
RUN npx prisma generate

# 6. 复制其余源码
COPY . .

# 7. 声明端口（文档作用，实际映射靠 docker run -p）
EXPOSE 8080

# 8. 启动命令（等同 npm start → tsx ./index.ts）
CMD ["npm", "start"]