package main

import (
	"fmt"
	"log"
	"strconv"
	"time"

	"mailman/internal/config"
	"mailman/internal/database"
	"mailman/internal/models"
	"mailman/internal/repository"
)

func main() {
	fmt.Println("=== Gmail OAuth2 令牌调试工具 ===")

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
	accountID := uint(39)
	account, err := accountRepo.GetByID(accountID)
	if err != nil {
		log.Fatalf("获取账户信息失败: %v", err)
	}

	fmt.Printf("账户信息:\n")
	fmt.Printf("  ID: %d\n", account.ID)
	fmt.Printf("  邮箱: %s\n", account.EmailAddress)
	fmt.Printf("  认证类型: %s\n", account.AuthType)
	fmt.Printf("  邮箱提供商: %s\n", account.MailProvider.Name)

	// 获取OAuth2配置
	oauth2Config, err := oauth2Repo.GetByProviderType(models.ProviderTypeGmail)
	if err != nil {
		log.Fatalf("获取OAuth2配置失败: %v", err)
	}

	fmt.Printf("\nOAuth2配置:\n")
	fmt.Printf("  ClientID: %s\n", oauth2Config.ClientID)
	fmt.Printf("  Scopes: %v\n", oauth2Config.Scopes)
	fmt.Printf("  是否启用: %v\n", oauth2Config.IsEnabled)

	// 检查CustomSettings
	fmt.Printf("\nCustomSettings分析:\n")
	if account.CustomSettings == nil {
		fmt.Printf("  ❌ CustomSettings为空\n")
		return
	}

	fmt.Printf("  CustomSettings内容:\n")
	for key, value := range account.CustomSettings {
		if key == "access_token" || key == "refresh_token" {
			fmt.Printf("    %s: %s... (长度: %d)\n", key, value[:min(len(value), 20)], len(value))
		} else {
			fmt.Printf("    %s: %s\n", key, value)
		}
	}

	// 检查访问令牌
	accessToken, hasAccessToken := account.CustomSettings["access_token"]
	refreshToken, hasRefreshToken := account.CustomSettings["refresh_token"]
	expiresAt, hasExpiresAt := account.CustomSettings["expires_at"]

	fmt.Printf("\n令牌状态检查:\n")
	fmt.Printf("  有访问令牌: %v\n", hasAccessToken && accessToken != "")
	fmt.Printf("  有刷新令牌: %v\n", hasRefreshToken && refreshToken != "")
	fmt.Printf("  有过期时间: %v\n", hasExpiresAt && expiresAt != "")

	if hasAccessToken && accessToken != "" {
		fmt.Printf("  访问令牌长度: %d\n", len(accessToken))
		fmt.Printf("  访问令牌前缀: %s\n", accessToken[:min(len(accessToken), 30)])
	}

	if hasExpiresAt && expiresAt != "" {
		fmt.Printf("  过期时间字符串: %s\n", expiresAt)

		// 尝试解析过期时间
		if expiryInt, err := strconv.ParseInt(expiresAt, 10, 64); err == nil {
			tokenExpiry := time.Unix(expiryInt, 0)
			fmt.Printf("  解析为Unix时间戳: %v\n", tokenExpiry)
			fmt.Printf("  是否已过期: %v\n", time.Now().After(tokenExpiry))
		} else if expiryTime, err := time.Parse(time.RFC3339, expiresAt); err == nil {
			fmt.Printf("  解析为RFC3339时间: %v\n", expiryTime)
			fmt.Printf("  是否已过期: %v\n", time.Now().After(expiryTime))
		} else {
			fmt.Printf("  ❌ 无法解析过期时间格式\n")
		}
	}

	// 检查问题总结
	fmt.Printf("\n问题诊断:\n")
	if !hasAccessToken || accessToken == "" {
		fmt.Printf("  ❌ 缺少访问令牌 - 账户可能未完成OAuth2授权\n")
	}
	if !hasRefreshToken || refreshToken == "" {
		fmt.Printf("  ❌ 缺少刷新令牌 - 无法自动刷新过期的访问令牌\n")
	}
	if account.AuthType != models.AuthTypeOAuth2 {
		fmt.Printf("  ❌ 认证类型不是OAuth2 - 当前: %s\n", account.AuthType)
	}

	fmt.Printf("\n建议解决方案:\n")
	fmt.Printf("1. 确保账户已完成Gmail OAuth2授权流程\n")
	fmt.Printf("2. 检查OAuth2配置是否正确\n")
	fmt.Printf("3. 如果令牌过期，需要重新授权或使用刷新令牌\n")
	fmt.Printf("4. 验证Gmail API的权限范围是否正确\n")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
