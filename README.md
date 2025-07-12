# Mailman - 智能邮件管理系统

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Go Version](https://img.shields.io/badge/Go-1.23+-blue.svg)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14.0+-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org)

Mailman 是一个功能强大的现代化邮件管理系统，提供邮件同步、智能解析、触发器自动化和AI助手等功能。支持多种邮件协议，具有直观的Web界面和强大的后端API。

- [快速部署](./docs/deployment-guide.md)
- [gmail oauth2配置](./docs/oauth2-setup-guide.md)
## 🚀 主要特性

### 📧 邮件管理

- **多账户支持**：管理多个邮件账户（Gmail、Outlook、IMAP等）
- **OAuth2认证**：支持Gmail、Outlook等OAuth2安全认证
- **实时同步**：自动同步邮件，支持增量同步和定时同步
- **智能解析**：自动解析邮件内容，提取关键信息和附件
- **全局搜索**：强大的全局邮件搜索，支持高级过滤和实时搜索
- **邮件提取**：智能提取邮件中的结构化数据
- **邮件工具**：丰富的邮件处理工具集

### 🤖 AI集成

- **多AI支持**：支持OpenAI、Claude、Gemini等多种AI提供商
- **数据库配置**：通过Web界面灵活配置和管理AI服务
- **智能提取**：使用AI提取邮件中的结构化数据和关键信息
- **模板生成**：AI助手生成邮件提取模板和处理规则
- **内容分析**：智能分析邮件内容，提取业务数据
- **可视化配置**：拖拽式AI配置界面，无需编程知识

### ⚡ 自动化功能

- **触发器系统**：基于条件的邮件处理自动化
- **定时任务**：邮件同步和处理的定时调度
- **事件监听**：实时监听邮件事件
- **工作流管理**：复杂的邮件处理工作流

### 🛡️ 安全特性

- **多重认证**：支持用户名密码、OAuth2等多种认证方式
- **OAuth2集成**：完整的OAuth2流程，支持Gmail、Outlook等主流邮件服务
- **会话管理**：安全的用户会话管理和自动过期机制
- **数据加密**：敏感数据加密存储，API密钥安全管理
- **权限控制**：基于角色的访问控制和细粒度权限管理
- **安全传输**：HTTPS/WSS加密通信

## 🏗️ 技术架构

### 后端技术栈

- **语言**：Go 1.23+
- **框架**：Gorilla Mux
- **数据库**：MySQL 8.0 + GORM
- **文档**：Swagger/OpenAPI
- **实时通信**：WebSocket
- **邮件协议**：IMAP, SMTP

### 前端技术栈

- **框架**：Next.js 14.0+ (App Router)
- **语言**：TypeScript 5.3+
- **样式**：Tailwind CSS + CSS-in-JS
- **UI组件**：Radix UI, Headless UI, 自定义组件库
- **状态管理**：Zustand + React Context
- **HTTP客户端**：Axios + React Query (TanStack Query)
- **动画**：Framer Motion + CSS动画
- **表单处理**：React Hook Form + Zod验证
- **主题系统**：Dark/Light模式切换
- **国际化**：多语言支持 (中文/英文)

### 部署与运维

- **容器化**：Docker + Docker Compose
- **反向代理**：Nginx
- **监控**：活动日志系统
- **健康检查**：Docker健康检查

## 📱 界面预览

### 主界面

![仪表板](docs/imags/main-dashboard.png)

### 邮件账户管理

![邮箱账户管理](docs/imags/email-account-list.png)

## 邮件管理

![邮件管理](docs/imags/email-manager.png)

## 同步配置

![同步配置](docs/imags/sync-config.png)

<!-- ### 触发器配置 -->

## 邮件监听和提取

![取件](docs/imags/extract-email.png)

## 邮件取件模板

![取件模板](docs/imags/extract-template.png)

### AI助手

![AI示例](docs/imags/ai-helper-01.png)

## 🚀 快速开始

### 环境要求

- **Go**: 1.23+
- **Node.js**: 18+
- **MySQL**: 8.0+
- **Docker**: 最新版本（推荐）
- **Docker Compose**: 最新版本

### 使用Docker Compose部署（推荐）

1. **克隆项目**

```bash
git clone https://github.com/seongminhwan/mailman.git
cd mailman
```

2. **配置环境变量**

```bash
cp .env.example .env
# 编辑.env文件，设置必要的环境变量
```

3. **启动服务**

```bash
docker-compose up -d
```

4. **访问应用**

- 前端界面：http://localhost:80
- 后端API：http://localhost:8080
- API文档：http://localhost:8080/swagger/index.html

### 使用All-in-One镜像部署

All-in-One镜像包含了完整的前端和后端服务，是最简单的部署方式。

#### 使用SQLite数据库（推荐）

```bash
# 基础部署 - 使用SQLite数据库
docker run -d \
  --name mailman \
  -p 80:80 \
  -p 8080:8080 \
  -v mailman_data:/app \
  ghcr.io/seongminhwan/mailman-all:latest
```

#### 数据持久化配置

为了确保数据持久化，建议使用以下配置：

```bash
# 创建数据目录
mkdir -p ./data

# 运行容器并挂载数据目录
docker run -d \
  --name mailman \
  -p 80:80 \
  -p 8080:8080 \
  -v $(pwd)/data:/app \
  -e DB_DRIVER=sqlite \
  -e DB_NAME=/app/mailman.db \
  ghcr.io/seongminhwan/mailman-all:latest
```

#### 使用MySQL数据库

```bash
# 连接外部MySQL数据库
docker run -d \
  --name mailman \
  -p 80:80 \
  -p 8080:8080 \
  -e DB_DRIVER=mysql \
  -e DB_HOST=your_mysql_host \
  -e DB_PORT=3306 \
  -e DB_USER=your_mysql_user \
  -e DB_PASSWORD=your_mysql_password \
  -e DB_NAME=mailman \
  ghcr.io/seongminhwan/mailman-all:latest
```

#### 完整配置示例

```bash
# 包含所有常用配置的完整示例
docker run -d \
  --name mailman \
  -p 80:80 \
  -p 8080:8080 \
  -v $(pwd)/data:/app \
  -e DB_DRIVER=sqlite \
  -e DB_NAME=/app/mailman.db \
  # -e OPENAI_API_KEY=your-openai-api-key \  # 已废弃，现在通过Web界面配置AI服务
  -e LOG_LEVEL=INFO \
  --restart unless-stopped \
  ghcr.io/seongminhwan/mailman-all:latest
```

#### 重要注意事项

⚠️ **数据库文件挂载注意事项**：

1. **数据目录权限**：确保挂载的数据目录有正确的读写权限
2. **SQLite文件位置**：SQLite数据库文件默认保存在 `/app/mailman.db`
3. **数据备份**：定期备份 `/app` 目录中的数据文件
4. **容器更新**：更新容器时，数据目录挂载确保数据不丢失

📋 **端口说明**：

- `80`: 前端Web界面
- `8080`: 后端API服务

🔧 **环境变量配置**：

- `DB_DRIVER`: 数据库类型（`sqlite` 或 `mysql`）
- `DB_NAME`: 数据库名称或SQLite文件路径
- `OPENAI_API_KEY`: OpenAI API密钥（已废弃，现在通过Web界面配置AI服务）
- `LOG_LEVEL`: 日志级别（DEBUG, INFO, WARN, ERROR）

### 本地开发部署

#### 后端部署

1. **进入后端目录**

```bash
cd backend
```

2. **安装依赖**

```bash
go mod download
```

3. **配置数据库**

```bash
# 启动MySQL数据库
docker run -d --name mailman-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=mailman \
  -e MYSQL_USER=mailman \
  -e MYSQL_PASSWORD=mailmanpassword \
  -p 3306:3306 \
  mysql:8.0
```

4. **设置环境变量**

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=mailman
export DB_PASSWORD=mailmanpassword
export DB_NAME=mailman
# export OPENAI_API_KEY=your-openai-api-key  # 已废弃，现在通过Web界面配置AI服务
```

5. **运行后端服务**

```bash
go run cmd/mailman/main.go
```

#### 前端部署

1. **进入前端目录**

```bash
cd frontend
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

```bash
cp .env.local.example .env.local
# 编辑.env.local文件设置API地址
```

4. **启动开发服务器**

```bash
npm run dev
```

### 生产环境部署

1. **构建前端**

```bash
cd frontend
npm run build
```

2. **构建后端**

```bash
cd backend
go build -o mailman cmd/mailman/main.go
```

3. **使用生产配置**

```bash
docker-compose -f docker-compose.yml up -d
```

## ⚙️ 配置说明

### 环境变量

#### 数据库配置

```env
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=mailman
DB_PASSWORD=mailmanpassword
DB_NAME=mailman
DB_SSLMODE=disable
```

#### AI服务配置

⚠️ **重要变更**：AI服务配置已改为通过Web界面管理，不再使用环境变量。

部署完成后，请通过前端界面配置AI服务：

1. 登录到前端界面
2. 进入"设置"或"AI配置"页面
3. 添加您的AI服务提供商配置（OpenAI、Claude、Gemini等）
4. 设置API密钥、基础URL和模型等参数

详细配置步骤请参考：[AI服务配置指南](docs/deployment-guide.md#ai服务配置指南)

#### 服务器配置

```env
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
LOG_LEVEL=INFO
```

### 邮件账户配置

支持的邮件协议：

- **IMAP**: Gmail, Outlook, Yahoo Mail等
- **Exchange**: Microsoft Exchange Server
- **POP3**: 传统POP3协议

配置示例：

```json
{
  "provider": "gmail",
  "email": "user@gmail.com",
  "password": "app-password",
  "imap_host": "imap.gmail.com",
  "imap_port": 993,
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "use_tls": true
}
```

## 📚 API文档

### Swagger文档

启动后端服务后，可访问：

- **URL**: http://localhost:8080/swagger/index.html
- **格式**: OpenAPI 3.0

### 主要API端点

#### 认证相关

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/user` - 获取用户信息

#### 邮件账户

- `GET /api/accounts` - 获取邮件账户列表
- `POST /api/accounts` - 添加邮件账户
- `PUT /api/accounts/{id}` - 更新邮件账户
- `DELETE /api/accounts/{id}` - 删除邮件账户

#### 邮件管理

- `GET /api/emails` - 获取邮件列表
- `GET /api/emails/{id}` - 获取邮件详情
- `POST /api/emails/sync` - 同步邮件
- `POST /api/emails/search` - 全局邮件搜索
- `GET /api/emails/search/global` - 高级全局搜索
- `POST /api/emails/extract` - 邮件数据提取
- `GET /api/emails/stats` - 邮件统计信息

#### 触发器

- `GET /api/triggers` - 获取触发器列表
- `POST /api/triggers` - 创建触发器
- `PUT /api/triggers/{id}` - 更新触发器
- `DELETE /api/triggers/{id}` - 删除触发器

#### OAuth2认证

- `GET /api/oauth2/providers` - 获取支持的OAuth2提供商
- `POST /api/oauth2/authorize` - 发起OAuth2授权
- `GET /api/oauth2/callback/{provider}` - OAuth2回调处理
- `POST /api/oauth2/refresh` - 刷新访问令牌
- `DELETE /api/oauth2/revoke` - 撤销授权

#### AI功能

- `GET /api/ai/config` - 获取AI配置列表
- `POST /api/ai/config` - 创建AI配置
- `PUT /api/ai/config/{id}` - 更新AI配置
- `DELETE /api/ai/config/{id}` - 删除AI配置
- `POST /api/ai/config/{id}/test` - 测试AI配置
- `POST /api/ai/extract` - AI内容提取
- `POST /api/ai/template/generate` - AI生成提取模板
- `GET /api/ai/templates` - 获取AI模板列表

#### 同步配置

- `GET /api/sync/config` - 获取同步配置
- `POST /api/sync/config` - 创建同步配置
- `PUT /api/sync/config/{id}` - 更新同步配置
- `POST /api/sync/start` - 启动邮件同步
- `POST /api/sync/stop` - 停止邮件同步

## 🔧 功能使用指南

### 添加邮件账户

1. 登录系统后，点击"账户管理"
2. 点击"添加账户"按钮
3. 选择邮件提供商（Gmail、Outlook等）
4. 输入邮件地址和认证信息
5. 测试连接并保存

### 配置OAuth2认证

1. 进入"设置" → "OAuth2配置"
2. 选择邮件提供商（Gmail、Outlook等）
3. 填写OAuth2应用信息：
   - 客户端ID (Client ID)
   - 客户端密钥 (Client Secret)
   - 重定向URI

4. 保存配置并测试连接
5. 完成OAuth2授权流程

### 配置AI服务

1. 进入"设置" → "AI配置"
2. 点击"添加AI配置"
3. 选择AI提供商（OpenAI、Claude、Gemini）
4. 填写配置信息：
   - 配置名称
   - API密钥
   - 模型名称（可选）
   - API端点（可选）

5. 测试配置连接
6. 设置为默认AI服务（可选）

### 全局邮件搜索

1. 在顶部导航栏找到搜索框
2. 输入搜索关键词
3. 使用高级搜索选项：
   - 发件人过滤
   - 时间范围
   - 邮件状态
   - 账户筛选

4. 查看搜索结果并进行操作

### 邮件同步管理

1. 进入"邮件" → "同步管理"
2. 配置同步设置：
   - 同步频率（实时/定时）
   - 同步范围（全量/增量）
   - 邮件数量限制

3. 启动自动同步
4. 监控同步状态和日志

### 使用AI功能

1. 在邮件详情页面，点击"AI助手"
2. 选择AI功能：
   - 内容提取：提取邮件中的关键信息
   - 智能分类：自动分类邮件类型
   - 内容摘要：生成邮件摘要
   - 模板生成：创建提取模板

3. 配置AI参数和提示词
4. 执行AI分析并查看结果
5. 保存或应用AI处理结果

## 🏗️ 技术架构

### 系统架构图

```ini
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web 前端      │    │   移动端应用    │    │   API 客户端    │
│   Next.js 14   │    │   (规划中)      │    │   (第三方集成)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   后端API服务   │
                    │   Go + Gin     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   数据库层      │    │   AI服务集成    │    │   邮件服务      │
│ MySQL/SQLite   │    │ OpenAI/Claude   │    │ IMAP/OAuth2    │
│     GORM       │    │    Gemini       │    │   Gmail/Outlook │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈

**前端技术**

- **Next.js 14** - React 全栈框架，使用 App Router
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Framer Motion** - 动画和过渡效果
- **Shadcn/ui** - 高质量的 UI 组件库
- **React Hook Form** - 表单管理和验证
- **Zustand** - 轻量级状态管理

**后端技术**

- **Go 1.21+** - 高性能的后端语言
- **Gin** - 高性能的 Web 框架
- **GORM** - Go 的 ORM 库
- **MySQL/SQLite** - 关系型数据库
- **WebSocket** - 实时通信
- **OAuth2** - 安全的第三方认证

**AI & 邮件服务**

- **OpenAI GPT** - 智能内容分析
- **Claude (Anthropic)** - AI 助手服务
- **Google Gemini** - 多模态 AI 模型
- **Gmail API** - Gmail 邮件服务
- **Microsoft Graph** - Outlook 邮件服务
- **IMAP/SMTP** - 通用邮件协议

**部署 & 运维**

- **Docker** - 容器化部署
- **Docker Compose** - 多容器编排
- **Nginx** - 反向代理和负载均衡
- **Let's Encrypt** - SSL 证书管理

## 🛠️ 开发指南

### 项目结构

```ini
mailman/
├── backend/                    # Go 后端服务
│   ├── cmd/
│   │   └── main.go            # 程序入口
│   ├── internal/
│   │   ├── api/               # API 路由和处理器
│   │   │   ├── handlers/      # HTTP 处理器
│   │   │   ├── middleware/    # 中间件
│   │   │   └── routes/        # 路由定义
│   │   ├── models/            # 数据模型
│   │   │   ├── account.go     # 邮件账户模型
│   │   │   ├── email.go       # 邮件模型
│   │   │   ├── oauth2.go      # OAuth2 配置模型
│   │   │   └── ai_config.go   # AI 配置模型
│   │   ├── services/          # 业务逻辑层
│   │   │   ├── email/         # 邮件服务
│   │   │   ├── oauth2/        # OAuth2 服务
│   │   │   ├── ai/           # AI 服务
│   │   │   └── sync/         # 同步服务
│   │   ├── repository/        # 数据访问层
│   │   ├── database/          # 数据库连接和迁移
│   │   └── utils/            # 工具函数
│   └── pkg/                   # 公共包
├── frontend/                  # Next.js 前端应用
│   ├── src/
│   │   ├── app/              # App Router 页面
│   │   │   ├── dashboard/    # 仪表板页面
│   │   │   ├── emails/       # 邮件管理页面
│   │   │   ├── settings/     # 设置页面
│   │   │   │   ├── accounts/ # 账户设置
│   │   │   │   ├── ai/       # AI 配置
│   │   │   │   └── oauth2/   # OAuth2 配置
│   │   │   └── layout.tsx    # 布局组件
│   │   ├── components/       # React 组件
│   │   │   ├── ui/          # 基础 UI 组件
│   │   │   ├── forms/       # 表单组件
│   │   │   ├── modals/      # 模态框组件
│   │   │   └── tabs/        # 标签页组件
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── services/        # API 服务
│   │   │   ├── api.service.ts      # 基础 API 服务
│   │   │   ├── email.service.ts    # 邮件 API
│   │   │   ├── oauth2.service.ts   # OAuth2 API
│   │   │   └── ai.service.ts       # AI API
│   │   ├── types/          # TypeScript 类型定义
│   │   └── utils/          # 工具函数
│   ├── public/             # 静态资源
│   └── package.json        # 项目依赖
├── docs/                   # 项目文档
│   ├── deployment-guide.md # 部署指南
│   └── api-reference.md    # API 参考文档
├── docker/                # Docker 相关文件
│   ├── Dockerfile         # Docker 镜像构建
│   ├── docker-compose.yml # 容器编排
│   └── nginx.conf         # Nginx 配置
├── scripts/              # 构建和部署脚本
│   ├── build.sh          # 构建脚本
│   └── deploy.sh         # 部署脚本
├── .env.example          # 环境变量示例
└── README.md             # 项目说明文档
```

### 开发环境设置

1. **安装开发工具**

```bash
# Go开发工具
go install github.com/swaggo/swag/cmd/swag@latest
go install github.com/cosmtrek/air@latest

# 前端开发工具
npm install -g @next/codemod
```

2. **生成API文档**

```bash
cd backend
swag init -g cmd/mailman/main.go
```

3. **热重载开发**

```bash
# 后端热重载
cd backend
air

# 前端热重载
cd frontend
npm run dev
```

### 代码规范

- **Go代码**: 遵循Go标准代码规范
- **TypeScript**: 使用ESLint和Prettier
- **提交规范**: 使用Conventional Commits

### 测试

```bash
# 后端测试
cd backend
go test ./...

# 前端测试
cd frontend
npm test
```

## 📋 待办事项

**已完成功能** ✅

- [x] OAuth2认证集成（Gmail、Outlook）
- [x] AI服务配置（OpenAI、Claude、Gemini）
- [x] 全局邮件搜索
- [x] 智能邮件提取
- [x] 实时邮件同步
- [x] Docker容器化部署
- [x] All-in-One镜像部署

**开发中功能** 🚧

- [ ] 邮件附件管理
- [ ] 批量操作功能
- [ ] 邮件模板系统
- [ ] 高级触发器系统

## 🤝 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 🚀 部署指南

Mailman支持多种部署方式，满足不同场景的需求：

### 快速开始 (推荐)

使用Docker All-in-One镜像，一键启动完整系统：

```bash
docker run -d \
  --name mailman \
  -p 3000:3000 \
  -v mailman_data:/app/data \
  mailman:latest
```

### 其他部署方式

- **Docker Compose**: 适合生产环境的容器编排
- **分离式部署**: 前后端独立部署
- **源代码部署**: 开发环境或自定义需求

📖 **详细部署指南**: [`docs/deployment-guide.md`](docs/deployment-guide.md)

部署指南包含：

- 5种完整的部署方案
- 环境配置说明
- AI服务配置指导
- 故障排除手册
- 性能优化建议

## � 许可证

本项目采用Apache 2.0许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 🆘 支持

如果您遇到问题或需要帮助，请：

1. 查看[问题跟踪器](https://github.com/seongminhwan/mailman/issues)
2. 阅读[FAQ文档](docs/FAQ.md)
3. 联系维护者

## 📞 联系信息

- **项目主页**: https://github.com/seongminhwan/mailman
- **问题报告**: https://github.com/seongminhwan/mailman/issues
- **邮件**: support@mailman.com

---

**Mailman** - 让邮件管理更智能、更高效！ 🚀