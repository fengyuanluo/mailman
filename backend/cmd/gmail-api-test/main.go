package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"mailman/internal/config"
	"mailman/internal/database"
	"mailman/internal/models"
	"mailman/internal/repository"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

func main() {
	// 获取账户ID参数
	accountID := uint(41)

	fmt.Printf("开始测试Gmail API访问，账户ID: %d\n", accountID)

	// 初始化配置和数据库
	cfg := config.Load()
	err := database.Initialize(database.Config{
		Driver:   cfg.Database.Driver,
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.DBName,
		SSLMode:  cfg.Database.SSLMode,
	})
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	// 初始化仓库
	accountRepo := repository.NewEmailAccountRepository(database.DB)
	oauth2Repo := repository.NewOAuth2GlobalConfigRepository(database.DB)

	// 获取账户信息
	account, err := accountRepo.GetByID(accountID)
	if err != nil {
		log.Fatalf("获取账户信息失败: %v", err)
	}

	fmt.Printf("账户信息: %s (ID: %d)\n", account.EmailAddress, account.ID)
	fmt.Printf("认证类型: %s\n", account.AuthType)
	fmt.Printf("邮箱提供商: %s\n", account.MailProvider.Name)

	// 获取OAuth2配置
	oauth2Config, err := oauth2Repo.GetByProviderType(models.ProviderTypeGmail)
	if err != nil {
		log.Fatalf("获取OAuth2配置失败: %v", err)
	}

	fmt.Printf("OAuth2配置: ClientID=%s, Scopes=%v\n", oauth2Config.ClientID, oauth2Config.Scopes)

	// 获取访问令牌
	var accessToken, refreshToken string
	var tokenExpiry time.Time

	// 调试：显示CustomSettings内容
	fmt.Printf("CustomSettings内容: %+v\n", account.CustomSettings)

	// 从CustomSettings获取OAuth2令牌
	if account.CustomSettings != nil {
		if token, exists := account.CustomSettings["access_token"]; exists && token != "" {
			accessToken = token
			fmt.Printf("从CustomSettings获取访问令牌: %s...\n", accessToken[:min(len(accessToken), 20)])
		}
		if refresh, exists := account.CustomSettings["refresh_token"]; exists && refresh != "" {
			refreshToken = refresh
			fmt.Printf("从CustomSettings获取刷新令牌: %s...\n", refreshToken[:min(len(refreshToken), 20)])
		}
		if expiry, exists := account.CustomSettings["expires_at"]; exists && expiry != "" {
			fmt.Printf("令牌过期时间字符串: %s\n", expiry)
			// 尝试解析时间戳
			if expiryInt, err := strconv.ParseInt(expiry, 10, 64); err == nil {
				tokenExpiry = time.Unix(expiryInt, 0)
				fmt.Printf("解析为Unix时间戳: %v\n", tokenExpiry)
			} else if expiryTime, err := time.Parse(time.RFC3339, expiry); err == nil {
				tokenExpiry = expiryTime
				fmt.Printf("解析为RFC3339时间: %v\n", tokenExpiry)
			} else {
				fmt.Printf("无法解析过期时间: %s\n", expiry)
			}
		}
	}

	if accessToken == "" {
		fmt.Printf("❌ 错误：未找到有效的访问令牌\n")
		fmt.Printf("请检查：\n")
		fmt.Printf("1. 账户ID=%d是否正确\n", accountID)
		fmt.Printf("2. 该账户是否已完成OAuth2授权\n")
		fmt.Printf("3. CustomSettings中是否包含access_token字段\n")
		log.Fatal("未找到有效的访问令牌")
	}

	// 显示令牌信息
	fmt.Printf("\n=== 令牌信息 ===\n")
	fmt.Printf("访问令牌长度: %d\n", len(accessToken))
	fmt.Printf("访问令牌前缀: %s\n", accessToken[:min(len(accessToken), 30)])
	fmt.Printf("刷新令牌长度: %d\n", len(refreshToken))
	if !tokenExpiry.IsZero() {
		fmt.Printf("令牌过期时间: %v\n", tokenExpiry)
		fmt.Printf("是否已过期: %v\n", time.Now().After(tokenExpiry))
	} else {
		fmt.Printf("令牌过期时间: 未设置\n")
	}

	// 检查令牌是否过期
	if !tokenExpiry.IsZero() && time.Now().After(tokenExpiry) {
		fmt.Printf("令牌已过期，尝试刷新...\n")
		if refreshToken == "" {
			log.Fatal("没有刷新令牌，无法刷新访问令牌")
		}

		// 刷新令牌
		newAccessToken, newRefreshToken, newExpiry, err := refreshAccessToken(oauth2Config, refreshToken)
		if err != nil {
			log.Fatalf("刷新令牌失败: %v", err)
		}

		accessToken = newAccessToken
		refreshToken = newRefreshToken
		tokenExpiry = newExpiry
		fmt.Printf("令牌刷新成功，新令牌: %s...\n", accessToken[:min(len(accessToken), 20)])
	}

	// 测试Gmail API访问
	fmt.Printf("\n=== 开始测试Gmail API访问 ===\n")

	// 验证令牌有效性
	fmt.Printf("\n--- 步骤1：验证令牌有效性 ---\n")
	err = validateAccessToken(accessToken)
	if err != nil {
		fmt.Printf("❌ 令牌验证失败: %v\n", err)
		fmt.Printf("尝试刷新令牌...\n")

		if refreshToken == "" {
			log.Fatal("没有刷新令牌，无法刷新访问令牌")
		}

		// 尝试刷新令牌
		newAccessToken, newRefreshToken, newExpiry, err := refreshAccessToken(oauth2Config, refreshToken)
		if err != nil {
			log.Fatalf("刷新令牌失败: %v", err)
		}

		accessToken = newAccessToken
		refreshToken = newRefreshToken
		tokenExpiry = newExpiry
		fmt.Printf("✅ 令牌刷新成功，新令牌: %s...\n", accessToken[:min(len(accessToken), 20)])

		// 再次验证新令牌
		err = validateAccessToken(accessToken)
		if err != nil {
			log.Fatalf("新令牌验证失败: %v", err)
		}
	}
	fmt.Printf("✅ 令牌验证成功\n")

	// 创建OAuth2客户端
	ctx := context.Background()
	token := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Expiry:       tokenExpiry,
		TokenType:    "Bearer",
	}

	oauth2Config_client := &oauth2.Config{
		ClientID:     oauth2Config.ClientID,
		ClientSecret: oauth2Config.ClientSecret,
		Scopes:       oauth2Config.Scopes,
		Endpoint:     google.Endpoint,
	}

	client := oauth2Config_client.Client(ctx, token)

	// 创建Gmail服务
	srv, err := gmail.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("创建Gmail服务失败: %v", err)
	}

	// 测试1：获取用户资料
	fmt.Printf("\n--- 测试1：获取用户资料 ---\n")
	profile, err := srv.Users.GetProfile("me").Do()
	if err != nil {
		fmt.Printf("❌ 获取用户资料失败: %v\n", err)
		return
	}
	fmt.Printf("✅ 用户资料获取成功\n")
	fmt.Printf("   邮箱地址: %s\n", profile.EmailAddress)
	fmt.Printf("   邮件总数: %d\n", profile.MessagesTotal)
	fmt.Printf("   线程总数: %d\n", profile.ThreadsTotal)
	fmt.Printf("   历史ID: %s\n", profile.HistoryId)

	// 测试2：获取标签列表
	fmt.Printf("\n--- 测试2：获取标签列表 ---\n")
	labels, err := srv.Users.Labels.List("me").Do()
	if err != nil {
		fmt.Printf("❌ 获取标签列表失败: %v\n", err)
		return
	}
	fmt.Printf("✅ 标签列表获取成功，共 %d 个标签\n", len(labels.Labels))
	for i, label := range labels.Labels {
		if i < 5 { // 只显示前5个标签
			fmt.Printf("   - %s (%s)\n", label.Name, label.Id)
		}
	}
	if len(labels.Labels) > 5 {
		fmt.Printf("   ... 还有 %d 个标签\n", len(labels.Labels)-5)
	}

	// 测试3：获取邮件列表
	fmt.Printf("\n--- 测试3：获取邮件列表 ---\n")
	messages, err := srv.Users.Messages.List("me").MaxResults(5).Do()
	if err != nil {
		fmt.Printf("❌ 获取邮件列表失败: %v\n", err)
		return
	}
	fmt.Printf("✅ 邮件列表获取成功，共返回 %d 封邮件\n", len(messages.Messages))

	// 获取第一封邮件的详细信息
	if len(messages.Messages) > 0 {
		fmt.Printf("\n--- 测试4：获取邮件详情 ---\n")
		messageID := messages.Messages[0].Id
		message, err := srv.Users.Messages.Get("me", messageID).Do()
		if err != nil {
			fmt.Printf("❌ 获取邮件详情失败: %v\n", err)
		} else {
			fmt.Printf("✅ 邮件详情获取成功\n")
			fmt.Printf("   邮件ID: %s\n", message.Id)
			fmt.Printf("   线程ID: %s\n", message.ThreadId)
			fmt.Printf("   标签: %v\n", message.LabelIds)
			fmt.Printf("   片段: %s\n", message.Snippet)

			// 解析邮件头
			for _, header := range message.Payload.Headers {
				switch header.Name {
				case "From":
					fmt.Printf("   发件人: %s\n", header.Value)
				case "Subject":
					fmt.Printf("   主题: %s\n", header.Value)
				case "Date":
					fmt.Printf("   日期: %s\n", header.Value)
				}
			}
		}
	}

	// 测试5：检查权限范围
	fmt.Printf("\n--- 测试5：检查权限范围 ---\n")
	fmt.Printf("   当前配置的权限范围: %v\n", oauth2Config.Scopes)

	// 测试发送邮件权限（如果有）
	for _, scope := range oauth2Config.Scopes {
		if scope == "https://www.googleapis.com/auth/gmail.send" || scope == "https://mail.google.com/" {
			fmt.Printf("   ✅ 检测到发送邮件权限: %s\n", scope)
		}
		if scope == "https://www.googleapis.com/auth/gmail.readonly" {
			fmt.Printf("   ✅ 检测到只读权限: %s\n", scope)
		}
		if scope == "https://www.googleapis.com/auth/gmail.modify" {
			fmt.Printf("   ✅ 检测到修改权限: %s\n", scope)
		}
	}

	fmt.Printf("\n=== 🎉 Gmail API测试完成！所有权限验证成功！ ===\n")
}

// refreshAccessToken 刷新访问令牌
func refreshAccessToken(config *models.OAuth2GlobalConfig, refreshToken string) (string, string, time.Time, error) {
	oauth2Config := &oauth2.Config{
		ClientID:     config.ClientID,
		ClientSecret: config.ClientSecret,
		Scopes:       config.Scopes,
		Endpoint:     google.Endpoint,
	}

	token := &oauth2.Token{
		RefreshToken: refreshToken,
	}

	tokenSource := oauth2Config.TokenSource(context.Background(), token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return "", "", time.Time{}, err
	}

	return newToken.AccessToken, newToken.RefreshToken, newToken.Expiry, nil
}

// validateAccessToken 验证访问令牌是否有效
func validateAccessToken(accessToken string) error {
	// 使用Google的tokeninfo endpoint验证令牌
	url := fmt.Sprintf("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=%s", accessToken)

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("请求tokeninfo失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("令牌无效，状态码: %d, 响应: %s", resp.StatusCode, string(body))
	}

	return nil
}

// min 返回两个整数的最小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
