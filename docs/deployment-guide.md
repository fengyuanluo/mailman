# Mailman 部署指南

本指南详细介绍了 Mailman 智能邮件管理系统的各种部署方式，从最简单的一键部署到完整的开发环境搭建，让不同技术水平的用户都能找到适合自己的部署方法。

## 📋 目录

- [快速选择部署方式](#快速选择部署方式)
- [方式一：Docker All-in-One 一键部署（推荐新手）](#方式一docker-all-in-one-一键部署推荐新手)
- [方式二：Docker Compose 生产环境部署](#方式二docker-compose-生产环境部署)
- [方式三：Docker Compose 开发环境部署](#方式三docker-compose-开发环境部署)
- [方式四：分离式 Docker 镜像部署](#方式四分离式-docker-镜像部署)
- [方式五：源代码直接启动（开发用）](#方式五源代码直接启动开发用)
- [AI服务配置指南](#ai服务配置指南)
- [环境变量详细说明](#环境变量详细说明)
- [常见问题解答](#常见问题解答)
- [故障排除](#故障排除)

## 🚀 快速选择部署方式

根据您的需求和技术背景，选择最适合的部署方式：

| 部署方式 | 适用人群 | 优点 | 缺点 | 推荐指数 |
|---------|----------|------|------|----------|
| **All-in-One** | 新手、快速体验 | 一键部署、配置简单 | 不易定制、资源占用较高 | ⭐⭐⭐⭐⭐ |
| **Docker Compose 生产** | 运维人员、生产环境 | 服务分离、易维护、性能好 | 配置较复杂 | ⭐⭐⭐⭐ |
| **Docker Compose 开发** | 开发人员 | 热重载、易调试 | 仅适合开发 | ⭐⭐⭐⭐ |
| **分离式 Docker** | 高级用户 | 最大灵活性 | 配置复杂 | ⭐⭐⭐ |
| **源代码启动** | 开发人员 | 完全控制、易调试 | 环境配置复杂 | ⭐⭐ |

---

## 方式一：Docker All-in-One 一键部署（推荐新手）

这是最简单的部署方式，所有服务都打包在一个 Docker 镜像中，非常适合新手快速体验 Mailman。

### 🔧 前置要求

- 安装 Docker（[Docker 安装指南](https://docs.docker.com/get-docker/)）
- 确保 80 和 8080 端口未被占用

### 📖 部署步骤

#### 步骤 1：基础部署（使用 SQLite 数据库）

```bash
# 直接运行 Mailman（数据存储在容器内，重启后数据会丢失）
docker run -d \
  --name mailman \
  -p 80:80 \
  -p 8080:8080 \
  ghcr.io/seongminhwan/mailman-all:latest
```

#### 步骤 2：数据持久化部署（推荐）

```bash
# 1. 创建数据目录
mkdir -p ./mailman-data

# 2. 运行容器并挂载数据目录
docker run -d \
  --name mailman \
  -p 80:80 \
  -p 8080:8080 \
  -v $(pwd)/mailman-data:/app \
  -e DB_DRIVER=sqlite \
  -e DB_NAME=/app/mailman.db \
  --restart unless-stopped \
  ghcr.io/seongminhwan/mailman-all:latest
```

#### 步骤 3：完整配置部署（包含 OpenAI）

```bash
# 包含 OpenAI API 的完整部署
docker run -d \
  --name mailman \
  -p 80:80 \
  -p 8080:8080 \
  -v $(pwd)/mailman-data:/app \
  -e DB_DRIVER=sqlite \
  -e DB_NAME=/app/mailman.db \
  # -e OPENAI_API_KEY=your-openai-api-key \  # 已废弃，现在通过Web界面配置AI服务
  # -e OPENAI_BASE_URL=https://api.openai.com/v1 \  # 已废弃
  # -e OPENAI_MODEL=gpt-3.5-turbo \  # 已废弃
  -e LOG_LEVEL=INFO \
  --restart unless-stopped \
  ghcr.io/seongminhwan/mailman-all:latest
```

### 🌐 访问应用

部署完成后，在浏览器中访问：
- **前端界面**：http://localhost
- **后端 API**：http://localhost:8080
- **API 文档**：http://localhost:8080/swagger/index.html

### 🛠️ 管理容器

```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs mailman

# 停止容器
docker stop mailman

# 启动容器
docker start mailman

# 删除容器
docker rm mailman

# 更新镜像
docker pull ghcr.io/seongminhwan/mailman-all:latest
docker stop mailman && docker rm mailman
# 然后重新运行上面的部署命令
```

---

## 方式二：Docker Compose 生产环境部署

这种方式将前端、后端和数据库分别部署在不同的容器中，适合生产环境使用，具有更好的性能和可维护性。

### 🔧 前置要求

- 安装 Docker 和 Docker Compose
- 了解基本的命令行操作

### 📖 部署步骤

#### 步骤 1：克隆项目

```bash
git clone https://github.com/seongminhwan/mailman.git
cd mailman
```

#### 步骤 2：配置环境变量

```bash
# 复制环境变量配置文件
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用其他编辑器如 vim、code 等
```

在 `.env` 文件中设置以下内容：

```env
# 数据库配置（请修改为强密码）
MYSQL_ROOT_PASSWORD=your_strong_root_password_123
MYSQL_DATABASE=mailman
MYSQL_USER=mailman
MYSQL_PASSWORD=your_strong_mailman_password_456

# AI服务配置说明
# 注意：AI服务配置已改为通过Web界面管理，不再使用环境变量
# 部署完成后，请通过前端界面的"AI配置"页面进行配置
# OPENAI_API_KEY=sk-your-openai-api-key  # 已废弃
# OPENAI_BASE_URL=https://api.openai.com/v1  # 已废弃
# OPENAI_MODEL=gpt-3.5-turbo  # 已废弃

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
```

#### 步骤 3：启动服务

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 查看启动状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 步骤 4：等待服务就绪

```bash
# 检查服务健康状态
docker-compose ps

# 等待 MySQL 完成初始化（约 1-2 分钟）
docker-compose logs mysql
```

### 🌐 访问应用

- **前端界面**：http://localhost
- **后端 API**：http://localhost:8080（仅限容器间访问）
- **API 文档**：通过前端界面访问

### 🛠️ 管理服务

```bash
# 查看服务状态
docker-compose ps

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mysql

# 重启特定服务
docker-compose restart backend

# 停止所有服务
docker-compose down

# 停止并删除所有数据
docker-compose down -v

# 更新服务
docker-compose pull
docker-compose up -d
```

---

## 方式三：Docker Compose 开发环境部署

这种方式专为开发人员设计，支持代码热重载，修改代码后无需重新构建容器。

### 🔧 前置要求

- 安装 Docker 和 Docker Compose
- 安装 Git
- 基本的开发环境了解

### 📖 部署步骤

#### 步骤 1：克隆项目

```bash
git clone https://github.com/seongminhwan/mailman.git
cd mailman
```

#### 步骤 2：配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置与生产环境类似
```

#### 步骤 3：启动开发环境

```bash
# 使用开发配置启动
docker-compose -f docker-compose.dev.yml up -d

# 查看启动状态
docker-compose -f docker-compose.dev.yml ps
```

### 🌐 访问应用

- **前端界面**：http://localhost:3000
- **后端 API**：http://localhost:8080
- **数据库**：localhost:3307（可用 MySQL 客户端连接）

### 💻 开发工作流

```bash
# 查看实时日志
docker-compose -f docker-compose.dev.yml logs -f

# 进入后端容器调试
docker-compose -f docker-compose.dev.yml exec backend sh

# 进入前端容器调试
docker-compose -f docker-compose.dev.yml exec frontend sh

# 重启开发服务
docker-compose -f docker-compose.dev.yml restart
```

### 🔄 代码热重载

- **前端**：修改 `frontend/` 目录下的代码会自动重载
- **后端**：修改 `backend/` 目录下的代码会自动重新编译

---

## 方式四：分离式 Docker 镜像部署

这种方式给您最大的灵活性，可以单独部署前端、后端，并使用外部数据库。

### 📖 部署步骤

#### 步骤 1：部署数据库

```bash
# 启动 MySQL 数据库
docker run -d \
  --name mailman-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass123 \
  -e MYSQL_DATABASE=mailman \
  -e MYSQL_USER=mailman \
  -e MYSQL_PASSWORD=mailmanpass456 \
  -p 3306:3306 \
  -v mailman_mysql_data:/var/lib/mysql \
  --restart unless-stopped \
  mysql:8.0
```

#### 步骤 2：部署后端

```bash
# 构建后端镜像
docker build -t mailman-backend ./backend

# 运行后端容器
docker run -d \
  --name mailman-backend \
  -p 8080:8080 \
  -e DB_DRIVER=mysql \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=3306 \
  -e DB_USER=mailman \
  -e DB_PASSWORD=mailmanpass456 \
  -e DB_NAME=mailman \
  # -e OPENAI_API_KEY=your-openai-key \  # 已废弃，现在通过Web界面配置AI服务
  --restart unless-stopped \
  mailman-backend
```

#### 步骤 3：部署前端

```bash
# 构建前端镜像
docker build -f ./frontend/Dockerfile.nginx -t mailman-frontend ./frontend

# 运行前端容器
docker run -d \
  --name mailman-frontend \
  -p 80:80 \
  --restart unless-stopped \
  mailman-frontend
```

---

## 方式五：源代码直接启动（开发用）

这种方式直接在本地环境运行源代码，适合深度开发和调试。

### 🔧 前置要求

- Go 1.23+
- Node.js 18+
- MySQL 8.0+
- Git

### 📖 部署步骤

#### 步骤 1：准备环境

```bash
# 克隆项目
git clone https://github.com/seongminhwan/mailman.git
cd mailman

# 启动 MySQL 数据库
docker run -d \
  --name mailman-mysql-local \
  -e MYSQL_ROOT_PASSWORD=rootpass123 \
  -e MYSQL_DATABASE=mailman \
  -e MYSQL_USER=mailman \
  -e MYSQL_PASSWORD=mailmanpass456 \
  -p 3306:3306 \
  mysql:8.0
```

#### 步骤 2：启动后端

```bash
# 进入后端目录
cd backend

# 安装依赖
go mod download

# 设置环境变量
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=mailman
export DB_PASSWORD=mailmanpass456
export DB_NAME=mailman
export DB_DRIVER=mysql
# export OPENAI_API_KEY=your-openai-api-key  # 已废弃，现在通过Web界面配置AI服务

# 启动后端服务
go run cmd/mailman/main.go
```

#### 步骤 3：启动前端（新终端）

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 🌐 访问应用

- **前端界面**：http://localhost:3000
- **后端 API**：http://localhost:8080

---

## 🤖 AI服务配置指南

Mailman 支持多种AI服务提供商，包括 OpenAI、Claude 和 Gemini。AI配置通过Web界面管理，不再使用环境变量。

### 🌐 通过Web界面配置AI服务

#### 步骤 1：访问AI配置页面

1. 登录到 Mailman 前端界面
2. 进入"设置"或"AI配置"页面
3. 点击"添加AI配置"按钮

#### 步骤 2：选择AI服务提供商

支持的AI服务提供商：

| 提供商 | 支持模型 | 配置要求 |
|--------|----------|----------|
| **OpenAI** | GPT-3.5, GPT-4, GPT-4o | API密钥、基础URL |
| **Claude** | Claude-3, Claude-3.5 | API密钥、基础URL |
| **Gemini** | Gemini Pro, Gemini Ultra | API密钥、基础URL |

#### 步骤 3：填写配置信息

**基本配置**：
- **配置名称**：为这个配置起一个易于识别的名字（如"默认OpenAI"、"生产环境Claude"）
- **AI提供商**：选择提供商类型（OpenAI/Claude/Gemini）
- **API密钥**：输入您的API密钥
- **基础URL**：API服务地址（通常使用默认值）
- **默认模型**：选择要使用的模型

**高级配置**：
- **自定义头部**：如需要，可以添加自定义HTTP头部
- **激活状态**：设置是否激活此配置

#### 步骤 4：测试连接

1. 填写完配置后，点击"测试连接"按钮
2. 系统会验证API密钥和连接是否正常
3. 确认测试通过后，保存配置

#### 步骤 5：激活配置

1. 保存成功后，将配置设置为"激活"状态
2. 系统会使用激活的配置来处理AI请求

### 🔑 获取API密钥

#### OpenAI API密钥
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录您的账户
3. 进入"API Keys"页面
4. 点击"Create new secret key"
5. 复制生成的API密钥

#### Claude API密钥
1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 登录您的账户
3. 进入"API Keys"页面
4. 创建新的API密钥
5. 复制生成的密钥

#### Gemini API密钥
1. 访问 [Google AI Studio](https://makersuite.google.com/)
2. 登录您的Google账户
3. 创建新的API密钥
4. 复制生成的密钥

### 💡 配置建议

**生产环境建议**：
- 使用强密码保护API密钥
- 定期轮换API密钥
- 监控API使用量和费用
- 设置适当的速率限制

**开发环境建议**：
- 可以使用较低成本的模型进行测试
- 设置合理的Token限制
- 使用测试专用的API密钥

---

## 🔧 环境变量详细说明

### 数据库配置

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `DB_DRIVER` | 数据库类型 | `mysql` | `mysql` 或 `sqlite` |
| `DB_HOST` | 数据库主机 | `localhost` | `localhost` 或 `mysql` |
| `DB_PORT` | 数据库端口 | `3306` | `3306` |
| `DB_USER` | 数据库用户名 | - | `mailman` |
| `DB_PASSWORD` | 数据库密码 | - | `your_password` |
| `DB_NAME` | 数据库名称 | `mailman` | `mailman` |

### OpenAI 配置（可选）

**⚠️ 注意：AI服务配置已改为通过Web界面管理，不再使用环境变量。**

### 服务器配置

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `SERVER_HOST` | 服务器主机 | `0.0.0.0` | `0.0.0.0` |
| `SERVER_PORT` | 服务器端口 | `8080` | `8080` |
| `LOG_LEVEL` | 日志级别 | `INFO` | `DEBUG`, `INFO`, `WARN`, `ERROR` |

---

## ❓ 常见问题解答

### Q1：哪种部署方式最适合我？

**A1：** 
- **新手或快速体验**：选择 All-in-One 部署
- **生产环境**：选择 Docker Compose 生产环境部署
- **开发人员**：选择 Docker Compose 开发环境部署或源代码启动
- **高级用户需要定制**：选择分离式 Docker 镜像部署

### Q2：端口被占用怎么办？

**A2：** 可以修改端口映射：
```bash
# 将前端映射到 8081 端口
docker run -p 8081:80 -p 8080:8080 ...

# 或在 docker-compose.yml 中修改
ports:
  - "8081:80"  # 前端
  - "8082:8080"  # 后端
```

### Q3：如何备份数据？

**A3：**
- **All-in-One 部署**：备份挂载的数据目录
- **Docker Compose**：备份 MySQL 数据卷
```bash
# 备份 MySQL 数据
docker exec mailman-mysql mysqldump -u root -p mailman > backup.sql

# 备份数据卷
docker run --rm -v mailman_mysql_data:/data -v $(pwd):/backup ubuntu tar czf /backup/mysql_backup.tar.gz /data
```

### Q4：如何更新到最新版本？

**A4：**
```bash
# All-in-One 部署
docker pull ghcr.io/seongminhwan/mailman-all:latest
docker stop mailman && docker rm mailman
# 重新运行部署命令

# Docker Compose 部署
git pull origin main
docker-compose pull
docker-compose up -d
```

### Q5：忘记了数据库密码怎么办？

**A5：** 检查 `.env` 文件或重新设置：
```bash
# 查看当前配置
cat .env

# 重置密码（会清空数据）
docker-compose down -v
# 修改 .env 文件中的密码
docker-compose up -d
```

---

## 🛠️ 故障排除

### 1. 容器启动失败

**症状**：容器无法启动或立即退出

**解决方案**：
```bash
# 查看容器日志
docker logs mailman

# 检查端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :8080

# 检查容器状态
docker ps -a
```

### 2. 数据库连接失败

**症状**：后端日志显示数据库连接错误

**解决方案**：
```bash
# 检查数据库容器状态
docker ps | grep mysql

# 查看数据库日志
docker logs mailman-mysql

# 测试数据库连接
docker exec -it mailman-mysql mysql -u mailman -p
```

### 3. 前端无法访问后端

**症状**：前端界面显示 API 连接错误

**解决方案**：
```bash
# 检查后端服务状态
curl http://localhost:8080/health

# 检查网络连接
docker network ls
docker network inspect mailman_mailman-network
```

### 4. AI 功能无法使用

**症状**：AI 相关功能报错

**解决方案**：
```bash
# AI配置现在通过Web界面管理
# 1. 登录到前端界面
# 2. 进入"设置"或"AI配置"页面
# 3. 添加您的AI服务提供商配置（OpenAI、Claude、Gemini等）
# 4. 设置API密钥、基础URL和模型等参数
# 5. 测试连接确保配置正确
```

### 5. 性能问题

**症状**：系统响应缓慢

**解决方案**：
```bash
# 检查容器资源使用
docker stats

# 检查磁盘空间
df -h

# 清理无用的 Docker 资源
docker system prune -a
```

---

## 📞 获取帮助

如果您在部署过程中遇到问题，可以：

1. **查看日志**：使用 `docker logs` 命令查看详细错误信息
2. **检查配置**：确认环境变量和配置文件设置正确
3. **参考文档**：查看项目的 [README.md](../README.md) 文件
4. **提交 Issue**：在 [GitHub](https://github.com/seongminhwan/mailman/issues) 上提交问题

---

**祝您部署顺利！🎉**