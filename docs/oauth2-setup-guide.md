# OAuth2 配置指南

## 概述

本指南将详细介绍如何在 Google Cloud Platform (GCP) 和 Microsoft Azure 上创建 OAuth2 应用程序，以便在邮件管理系统中配置邮件账户访问权限。

## Google Gmail OAuth2 配置

### 第一步：创建 Google Cloud Platform 项目

1. **访问 Google Cloud Console**
   - 打开 [Google Cloud Console](https://console.cloud.google.com/)
   - 使用您的 Google 账户登录

2. **创建新项目**
   - 点击顶部的项目选择器
   - 点击"新建项目"
   - 输入项目名称（如："邮件管理系统"）
   - 选择计费账户（如果需要）
   - 点击"创建"

3. **启用 Gmail API**
   - 在左侧菜单中选择"API 和服务" > "库"
   - 搜索"Gmail API"
   - 点击"Gmail API"
   - 点击"启用"

### 第二步：配置 OAuth2 同意屏幕

1. **访问 OAuth2 同意屏幕**
   - 在左侧菜单中选择"API 和服务" > "OAuth 同意屏幕"

2. **选择用户类型**
   - **内部**：仅限组织内部用户（需要 Google Workspace 账户）
   - **外部**：任何 Google 账户用户（推荐用于测试）

3. **配置应用信息**
   - **应用名称**：邮件管理系统
   - **用户支持电子邮件**：您的邮箱地址
   - **应用徽标**：可选
   - **应用主页**：您的应用主页 URL
   - **应用隐私政策链接**：隐私政策 URL（可选）
   - **应用服务条款链接**：服务条款 URL（可选）

4. **授权域**
   - 添加您的域名（如：`yourdomain.com`）
   - 如果是本地测试，可以添加 `localhost`

5. **开发者联系信息**
   - 输入您的邮箱地址

### 第三步：创建 OAuth2 凭据

1. **创建凭据**
   - 在左侧菜单中选择"API 和服务" > "凭据"
   - 点击"创建凭据" > "OAuth 2.0 客户端 ID"

2. **配置应用类型**
   - 选择"Web 应用程序"
   - 输入名称（如："邮件管理系统 Web 客户端"）

3. **配置重定向 URI**
   - **已获授权的重定向 URI**：
     - 生产环境：`https://yourdomain.com/api/oauth2/callback/gmail`
     - 开发环境：`http://localhost:8080/api/oauth2/callback/gmail`

4. **获取凭据**
   - 点击"创建"
   - 复制"客户端 ID"和"客户端密钥"
   - 下载 JSON 文件（可选，用于备份）

### 第四步：添加测试用户

**重要提醒：** 应用无需发布，也无需提交审核，但每个待使用的邮箱都必须添加为测试用户。

1. **访问测试用户配置**
   - 在 Google Cloud Console 中，导航到"API 和服务" > "OAuth 同意屏幕"
   - 或直接访问：[https://console.cloud.google.com/auth/audience](https://console.cloud.google.com/auth/audience)

2. **添加测试用户**
   - 在"测试用户"部分，点击"添加用户"
   - 输入需要使用邮件管理系统的 Gmail 邮箱地址
   - 点击"添加"保存

3. **限制说明**
   - 最多可以添加 100 个测试用户
   - 只有添加的测试用户才能使用 OAuth2 授权
   - 未添加的邮箱将无法完成授权流程

4. **批量添加**
   - 可以一次添加多个邮箱地址
   - 每行一个邮箱地址
   - 或者用逗号分隔多个邮箱

### 第五步：配置权限范围

Gmail OAuth2 需要以下权限范围：

#### 必需权限（已预设，不可修改）：
- `https://mail.google.com/`
  - 完整的 Gmail 邮箱访问权限
  - 用于读取、发送和管理邮件

- `https://www.googleapis.com/auth/userinfo.email`
  - 获取用户邮箱地址
  - 用于账户识别

- `https://www.googleapis.com/auth/userinfo.profile`
  - 获取用户基本信息
  - 用于显示用户名称

#### 权限说明：
- 这些权限是 Gmail 邮件管理的最小必需权限
- 系统会自动设置这些权限，用户无需手动添加
- 权限范围经过安全审核，确保最小权限原则

### 第六步：在系统中配置 OAuth2

1. **打开 OAuth2 配置页面**
   - 在系统中导航到"OAuth2 配置"标签页
   - 点击"添加配置"按钮

2. **填写配置信息**
   - **提供商类型**：选择"Gmail"
   - **配置名称**：输入描述性名称（如："Gmail 生产环境"）
   - **客户端 ID**：粘贴从 GCP 获取的客户端 ID
   - **客户端密钥**：粘贴从 GCP 获取的客户端密钥
   - **重定向 URI**：与 GCP 中配置的重定向 URI 保持一致
   - **权限范围**：系统自动设置，无需修改

3. **保存并启用**
   - 点击"保存"
   - 启用配置开关

## Microsoft Outlook OAuth2 配置

### 第一步：创建 Azure AD 应用程序

1. **访问 Azure Portal**
   - 打开 [Azure Portal](https://portal.azure.com/)
   - 使用您的 Microsoft 账户登录

2. **注册新应用程序**
   - 在搜索框中输入"Azure Active Directory"
   - 选择"Azure Active Directory"
   - 在左侧菜单中选择"应用注册"
   - 点击"新注册"

3. **配置应用程序**
   - **名称**：邮件管理系统
   - **受支持的账户类型**：选择适合的选项
     - "仅此组织目录中的账户"（单租户）
     - "任何组织目录中的账户"（多租户）
     - "任何组织目录中的账户和个人 Microsoft 账户"（推荐）
   - **重定向 URI**：
     - 类型：Web
     - URI：`https://yourdomain.com/api/oauth2/callback/outlook`

### 第二步：配置权限

1. **API 权限**
   - 在应用程序页面中，选择"API 权限"
   - 点击"添加权限"
   - 选择"Microsoft Graph"
   - 选择"委托权限"

2. **添加邮件权限**
   - `Mail.Read`：读取邮件
   - `Mail.ReadWrite`：读写邮件
   - `Mail.Send`：发送邮件
   - `User.Read`：读取用户信息

3. **授予管理员同意**
   - 点击"为 [租户] 授予管理员同意"
   - 确认授权

### 第三步：创建客户端密钥

1. **证书和密钥**
   - 在应用程序页面中，选择"证书和密钥"
   - 点击"新建客户端密钥"
   - 输入描述和过期时间
   - 点击"添加"
   - **重要**：立即复制密钥值（离开页面后无法再次查看）

### 第四步：在系统中配置 OAuth2

1. **填写配置信息**
   - **提供商类型**：选择"Outlook"
   - **配置名称**：输入描述性名称
   - **客户端 ID**：从 Azure 应用程序概述页面获取"应用程序（客户端）ID"
   - **客户端密钥**：使用在第三步中创建的客户端密钥
   - **重定向 URI**：与 Azure 中配置的重定向 URI 保持一致

## 常见问题解答

### Q1：为什么需要配置 OAuth2？
A1：OAuth2 是一种安全的授权协议，允许第三方应用程序访问用户的邮件账户，而无需存储用户的密码。这比传统的用户名/密码方式更安全。

### Q2：重定向 URI 应该设置为什么？
A2：重定向 URI 应该指向您的应用程序的回调端点：
- Gmail：`https://yourdomain.com/api/oauth2/callback/gmail`
- Outlook：`https://yourdomain.com/api/oauth2/callback/outlook`
- 本地开发：将 `yourdomain.com` 替换为 `localhost:8080`

### Q3：如何测试 OAuth2 配置？
A3：
1. 在 OAuth2 配置页面中，点击"测试连接"按钮
2. 系统会打开一个新窗口进行授权
3. 完成授权后，检查是否能够成功获取邮件

### Q4：多个 Gmail 账户如何配置？
A4：
1. 您可以创建多个 Gmail OAuth2 配置
2. 每个配置可以使用不同的 GCP 项目
3. 在添加邮件账户时，选择对应的 OAuth2 配置

### Q5：权限范围可以自定义吗？
A5：
- **Gmail**：权限范围已经预设且不可修改，这是为了安全考虑
- **Outlook**：权限范围基于 Microsoft Graph API 的最佳实践

### Q6：如何处理 OAuth2 token 过期？
A6：系统会自动使用 refresh token 刷新 access token，无需手动干预。

## 安全建议

1. **客户端密钥保护**
   - 妥善保管客户端密钥
   - 定期轮换客户端密钥
   - 不要在客户端代码中暴露密钥

2. **权限最小化**
   - 只请求必要的权限
   - 定期审查和更新权限范围

3. **环境隔离**
   - 为开发、测试和生产环境创建不同的 OAuth2 应用程序
   - 使用不同的重定向 URI

4. **监控和日志**
   - 启用 OAuth2 访问日志
   - 监控异常的 API 调用
   - 设置安全警报

## 参考资料

- [Google OAuth2 文档](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API 文档](https://developers.google.com/gmail/api)
- [Microsoft Graph 文档](https://docs.microsoft.com/en-us/graph/)
- [Azure AD 应用注册](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OAuth2 RFC 6749](https://tools.ietf.org/html/rfc6749)

## 更新日志

- **2024-01-01**：初版发布
- **2024-01-15**：添加 Outlook 配置说明
- **2024-02-01**：更新权限范围说明
- **2024-02-15**：添加安全建议章节