# 如何理解 Docker

可以把 Docker 想成：把应用和它需要的一切（代码、运行时、库、配置）打包成一个标准「箱子」，在任何机器上都能同样运行。

Docker Desktop 界面正好对应 Docker 的几个核心概念，下文结合界面逐项说明。

## 用生活类比理解

| Docker 概念      | 类比                                                      |
| ---------------- | --------------------------------------------------------- |
| 镜像 (Image)     | 一道菜的菜谱 / 模具 — 只读模板，描述「这个应用长什么样」  |
| 容器 (Container) | 按菜谱做出来的菜 — 镜像跑起来后的实例                     |
| Docker Engine    | 厨房 — 负责构建、运行、管理容器（底部「Engine running」） |
| 端口映射 (Ports) | 窗口 — 让外面能访问容器里的服务，如 `6379:6379`           |
| Volume           | 冰箱 — 数据持久化，容器删了数据还在                       |

## 解决什么问题？

**痛点：**「在我电脑上能跑，在你电脑上不行」— 环境不一致。

**传统方式：** 装 Node、Redis、MySQL，版本、路径、系统差异都可能导致问题。

**Docker 方式：**

- 开发、测试、生产用同一套镜像
- 不污染本机环境（Redis 在容器里，不必在本机安装）
- 一键启停、可复制、可迁移

## Docker ：镜像、容器、网络、卷

### 1. 镜像（Image）

**是什么：**

- 一套已经装好的迷你操作系统 + 程序文件 + 启动方式，可以直接运行
- 只读模板，分层存储，不能直接「改完就保存」（要 commit 或重新 build）
- 格式一般是 `名称:标签`，如 `redis:7-alpine`（`redis`：官方 Redis 镜像；`7-alpine`：Redis 7 + Alpine 小体积 Linux 基础镜像）
- 一个镜像可以创建多个容器（同一菜谱做多道菜）

#### 镜像里实际有什么？

以 `redis:7-alpine` 为例，打开后大致是这样一棵目录树：

```text
/                                    ← 一个完整的 Linux 根目录（Alpine，很小）
├── bin/sh, ls ...                   ← 基础命令
├── usr/local/bin/redis-server       ← Redis 7 程序
├── etc/redis/...                    ← 默认配置
└── 默认启动命令: redis-server
```

除 `redis-server` 外，官方 Redis 镜像还自带 `redis-cli`，可直接在容器里连本机 Redis，例如 `docker exec -it redis-study redis-cli`。

以你自己的 Node 项目为例，镜像可能是：

```text
/
├── node:18 的运行环境               ← Node.js 18
├── /app/package.json
├── /app/node_modules/               ← 依赖
├── /app/dist/                       ← 打包后的前端/后端代码
└── 默认启动命令: node /app/dist/server.js
```

每个应用不一样，是因为每个镜像的内容不一样——有人帮你做好（官方镜像），或你自己用 Dockerfile 做。

#### 两种镜像来源

| 来源       | 谁做的                       | 例子                                 |
| ---------- | ---------------------------- | ------------------------------------ |
| 别人做好的 | Docker Hub 官方/社区         | `redis:7-alpine`、`node:18`、`nginx` |
| 你自己做的 | 写 Dockerfile → docker build | 你的 projectManagement 前端项目      |

#### Dockerfile：自定义应用的「组装说明书」

每个应用不同，就用不同的 Dockerfile，例如：

```dockerfile
# 第1层：基础环境
FROM node:18-alpine

# 第2层：拷贝依赖清单，安装依赖
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 第3层：拷贝你的代码
COPY . .

# 第4层：构建 + 定义怎么启动
RUN npm run build
CMD ["npm", "start"]
```

`docker build` 会按这份说明书一层层叠起来，最后得到镜像 `my-project:v1.0.0`。

所以 镜像 = 具体文件 + 运行环境 +

#### 完整流程：

```text
获取镜像（二选一）
├── docker pull redis:7-alpine ← 下载别人做好的
└── docker build -t my-nodejs-api:v1 . ← 自己构建
↓
运行容器
└── docker run ... redis:7-alpine ← 从镜像创建并启动实例
```

### 2. 容器（Container）

**是什么：**

- 容器是 **镜像跑起来的一个实例**
- 每行是一个独立环境，有自己的 ID、状态、端口、进程

**表里各列含义：**

| 列           | 示例           | 说明                 |
| ------------ | -------------- | -------------------- |
| Name         | redis-study    | 容器名字（你起的）   |
| Container ID | 9fe36f791e5a   | 唯一 ID              |
| Image        | redis:7-alpine | 它从哪个镜像创建     |
| Port(s)      | 6379:6379      | 端口映射，和网络有关 |
| Status       | 已停止         | 当前是否在跑         |

#### 容器里实际有什么？

容器 **不是** 镜像的完整拷贝，而是 **镜像 + 一层薄薄的「可写层」+ 正在跑的进程**：

```text
容器 redis-study 运行时的结构：

┌─────────────────────────────────┐
│  可写层（临时）                   │  ← 运行时产生的改动写在这里
│  例如：/data/dump.rdb、日志、pid  │     删容器后，这层默认消失
├─────────────────────────────────┤
│  镜像层（只读，来自 redis:7-alpine）│  ← redis-server、Alpine 系统
│  所有容器共享同一套镜像层，不重复占空间 │
└─────────────────────────────────┘

同时还在跑：
  进程: redis-server（主进程，容器活着就靠它）
  网络: 内网 IP + 你映射的 6379 端口
  可选: 挂载的卷（见第 4 节）
```

#### 容器是怎么来的？

容器 **不能凭空创建**，必须来自某个镜像：

```bash
# 一条命令做两件事：① 从镜像创建容器  ② 启动它
docker run -d --name redis-study -p 6379:6379 redis:7-alpine
#            │         │              │              │
#            │         │              │              └── 用哪个镜像
#            │         │              └── 端口映射（见网络一节）
#            │         └── 给容器起名
#            └── 后台运行
```

执行后 Docker 内部大致做了这些：

```text
1. 检查本地有没有 redis:7-alpine 镜像 → 没有就自动 pull
2. 在镜像之上创建可写层
3. 分配网络（内网 IP）
4. 执行镜像里定义的启动命令 → redis-server 跑起来
5. 容器状态变为 Running，出现在 Docker Desktop 的 Containers 列表
```

#### 一个镜像 → 多个容器

**正确理解：** 一个容器 = 镜像的 **一份运行实例**，通常只跑 **一个主服务**。

```text
         redis:7-alpine（同一个镜像）
              │
      ┌───────┴───────┐
      ▼               ▼
 redis-study      redis-test
 端口 6379         端口 6380
 独立进程          独立进程
 数据默认不共享    数据默认不共享
```

```bash
docker run -d --name redis-study  -p 6379:6379 redis:7-alpine
docker run -d --name redis-test   -p 6380:6379 redis:7-alpine
# 两次 run，同一个镜像，得到两个互不影响的容器
```

### 3. 网络（Network）

**是什么：**

- Docker 会在你的电脑上建一张 **虚拟局域网**，让多个容器像同一 WiFi 下的设备一样互访
- 每个容器启动时会 **自动分配一个内网 IP**（如 `172.17.0.2`）
- `-p 6379:6379` 是 **端口映射**（开一扇门），和 IP 分配是 **两件不同的事**

#### 网络里实际有什么？

以默认的 `bridge` 网络为例，跑起 `redis-study` 和 `nodejs` 后，大致是这样：

```text
你的电脑 (Host)
  IP: 192.168.x.x（局域网）
  localhost = 127.0.0.1
│
│  Docker 虚拟网络 bridge（172.17.0.0/16）
│  ┌──────────────────────────────────────────────┐
│  │                                              │
│  │   redis-study          nodejs                │
│  │   IP: 172.17.0.2       IP: 172.17.0.3       │
│  │   监听 :6379            监听 :3000            │
│  │                                              │
│  └──────────────────────────────────────────────┘
│
└── -p 6379:6379 把 Host 的 6379 转发到 redis-study 的 6379
```

每个容器内部就像一台小电脑，有 **自己的 IP、端口、网卡**，和宿主机、和其他容器隔离。

#### 三种通信方式：端口映射 vs 内网互访 vs 访问宿主机

很多人只见过 `-p`，以为网络就是端口号。其实有三类常见场景：

**方式 1：从宿主机访问容器 → 用端口映射**

```bash
docker run -d --name redis-study -p 6379:6379 redis:7-alpine
#                              └── 宿主机端口:容器端口
```

```text
你的 Node 应用（宿主机）
    │
    │  连接 localhost:6379
    ▼
你电脑的 6379 端口  ←── Docker 在这里“接客”
    │
    │  NAT / 端口映射（-p 6379:6379 配置的规则）
    ▼
容器 redis-study 内部:  redis-server 在 172.17.0.2:6379 上监听
```

`-p` **没有**给容器分配一个对外的公网 IP，只是在宿主机上 **开一个端口转发到容器**。

**方式 2：容器之间互访 → 用内网 IP 或容器名**

```bash
# 在 nodejs 容器里连 redis（同一 bridge 网络下）
redis-cli -h 172.17.0.2 -p 6379
```

更推荐 **自定义网络 + 容器名**（Docker 内置 DNS，不用记 IP）：

```bash
docker network create my-net

docker run -d --name redis-study --network my-net redis:7-alpine
docker run -d --name nodejs      --network my-net node:18

# nodejs 里直接写主机名，IP 变了也不影响
# 连接串: redis-study:6379
```

**方式 3：从容器访问宿主机上的服务 → 用 `host.docker.internal`**

适用场景：PostgreSQL、Redis 等 **装在你本机（或 WSL）上**，而 Node API **跑在容器里**。

```bash
docker run --rm -p 8080:8080 `
  -e DATABASE_URL="postgresql://postgres:你的密码@host.docker.internal:5432/nodejs_study?schema=public" `
  -e REDIS_URL="redis://host.docker.internal:6379" `
  -e JWT_SECRET="你的JWT_SECRET" `
  nodejs-api
```

| 部分             | 含义                                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| `docker run`     | 从镜像创建并启动一个容器                                                        |
| `--rm`           | 容器停止后自动删除，不留 stopped 容器                                           |
| `-p 8080:8080`   | 端口映射：宿主机8080 → 容器内8080；浏览器访问 localhost:8080 即访问容器里的 API |
| `-e KEY="value"` | 向容器内注入环境变量，Node 应用通过 process.env 读取                            |
| `` ` ``          | PowerShell 换行续行符（bash 里用 \）                                            |
| `nodejs-api`     | 要运行的镜像名（需先 docker build -t nodejs-api .）                             |

```text
容器 nodejs-api 内部
    │
    │  连接 host.docker.internal:5432 / :6379
    │  （不能写 localhost —— 容器里的 localhost 是容器自己，不是宿主机）
    ▼
Docker 提供的「回到宿主机」的特殊主机名
    │
    │  host.docker.internal → 转发到宿主机
    ▼
你的电脑 (Host)
  localhost:5432  ← PostgreSQL 监听在这里
  localhost:6379  ← Redis 监听在这里
```

**为什么不能写 `localhost`？**

容器里的 `localhost` 永远指 **容器自己**，不是宿主机，也不是别的容器：

| 谁在连          | 想连谁           | 写 `localhost:6379` 实际连到哪里                                                        |
| --------------- | ---------------- | --------------------------------------------------------------------------------------- |
| 你在宿主机上    | redis-study 容器 | 宿主机自己 → 经 `-p` 转发进容器 ✅                                                      |
| nodejs-api 容器 | redis-study 容器 | **nodejs-api 自己** → 连不上 redis-study ❌（应用 `redis-study:6379`，见方式 2）        |
| nodejs-api 容器 | 宿主机上的 Redis | **nodejs-api 自己** → 容器内没有 Redis ❌（应用 `host.docker.internal:6379`，见方式 3） |

**为什么 `host.docker.internal:6379` 有时「也能连上」？**

如果 `redis-study` 做了 `-p 6379:6379`，理论上：

```text
nodejs-api 容器
  → host.docker.internal:6379
  → 宿主机 6379
  → 端口映射
  → redis-study 容器
```

能通，但这是 **绕宿主机一圈**，不是容器直连。

**Windows / Mac（Docker Desktop）：** `host.docker.internal` 默认可用，无需额外配置。

**Linux：** 部分环境没有该主机名，启动时需加：

```bash
docker run --add-host=host.docker.internal:host-gateway ...
```

#### Windows 上要注意的一点

Docker Desktop 在 Windows 上跑在 **WSL2 虚拟机**里：

- 用 `localhost:6379` 访问容器 → 一般没问题（Desktop 做了转发）
- 容器 IP `172.17.0.x` → 主要在 Docker 内部有效，Windows 上不一定能直接 ping 通
- **从本机访问容器，优先用** `localhost + 端口映射`
- **容器里连宿主机上的服务，用** `host.docker.internal`，不要用 `localhost`

### 4. 卷（Volume）

**是什么：**

- **挂在容器上的独立硬盘**，专门存 **要长期保留的数据**
- 典型用途：数据库文件、用户上传、需要保留的配置

#### 卷里实际有什么？

以 Redis 为例，数据默认写在 `/data` 目录。

**用卷（数据在独立存储）：**

```text
容器 redis-study
└── /data  ──挂载──►  卷 redis-data
     （容器里看到的 /data，实际读写的是卷里的文件）

docker rm redis-study  →  容器没了，但卷 redis-data 还在
docker run 新容器 -v redis-data:/data  →  数据完整恢复
```

#### 三种挂载方式（知道 volume 即可）

| 方式                    | 写法示例              | 谁管理           | 典型场景                 |
| ----------------------- | --------------------- | ---------------- | ------------------------ |
| **卷 volume**           | `-v redis-data:/data` | Docker           | 数据库、生产数据（推荐） |
| **绑定挂载 bind mount** | `-v D:/mydata:/data`  | 你指定宿主机路径 | 开发时同步本地代码       |
| **tmpfs**               | `--tmpfs /tmp`        | 内存             | 临时文件，重启即没       |

小白阶段 **优先用 volume**：路径不用自己管，备份迁移也方便。
