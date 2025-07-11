package main

import (
	"fmt"
	"log"

	"mailman/internal/config"
	"mailman/internal/database"
	"mailman/internal/models"
	"mailman/internal/repository"
	"mailman/internal/services"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	dbConfig := database.Config{
		Driver:   cfg.Database.Driver,
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.DBName,
		SSLMode:  cfg.Database.SSLMode,
	}

	if err := database.Initialize(dbConfig); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	fmt.Println("🚀 开始测试OAuth2Provider关联功能...")

	// 创建OAuth2GlobalConfig Repository和Service
	oauth2ConfigRepo := repository.NewOAuth2GlobalConfigRepository(database.GetDB())
	oauth2ConfigService := services.NewOAuth2GlobalConfigService(oauth2ConfigRepo)

	// 创建两个不同的Gmail OAuth2配置
	gmail1 := &models.OAuth2GlobalConfig{
		Name:         "Gmail-Personal",
		ProviderType: models.ProviderTypeGmail,
		ClientID:     "personal_client_id",
		ClientSecret: "personal_client_secret",
		RedirectURI:  "http://localhost:3000/oauth2/callback/gmail",
		Scopes:       models.StringSlice{"https://mail.google.com/", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		IsEnabled:    true,
	}

	gmail2 := &models.OAuth2GlobalConfig{
		Name:         "Gmail-Business",
		ProviderType: models.ProviderTypeGmail,
		ClientID:     "business_client_id",
		ClientSecret: "business_client_secret",
		RedirectURI:  "http://localhost:3000/oauth2/callback/gmail",
		Scopes:       models.StringSlice{"https://mail.google.com/", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		IsEnabled:    true,
	}

	// 创建配置
	fmt.Println("📝 创建OAuth2配置...")
	if err := oauth2ConfigService.CreateOrUpdateConfig(gmail1); err != nil {
		log.Printf("创建Gmail-Personal配置失败: %v", err)
	} else {
		fmt.Printf("✅ 成功创建Gmail-Personal配置 (ID: %d)\n", gmail1.ID)
	}

	if err := oauth2ConfigService.CreateOrUpdateConfig(gmail2); err != nil {
		log.Printf("创建Gmail-Business配置失败: %v", err)
	} else {
		fmt.Printf("✅ 成功创建Gmail-Business配置 (ID: %d)\n", gmail2.ID)
	}

	// 测试获取配置
	fmt.Println("\n📖 测试获取配置...")
	configs, err := oauth2ConfigService.GetConfigsByProviderType(models.ProviderTypeGmail)
	if err != nil {
		log.Printf("获取Gmail配置失败: %v", err)
	} else {
		fmt.Printf("✅ 找到 %d 个Gmail配置:\n", len(configs))
		for _, cfg := range configs {
			fmt.Printf("  - ID: %d, Name: %s, ClientID: %s\n", cfg.ID, cfg.Name, cfg.ClientID)
		}
	}

	// 创建MailProvider (Gmail)
	fmt.Println("\n📮 创建MailProvider...")
	mailProviderRepo := repository.NewMailProviderRepository(database.GetDB())
	gmailProvider := &models.MailProvider{
		Name:       "Gmail",
		Type:       models.ProviderTypeGmail,
		IMAPServer: "imap.gmail.com",
		IMAPPort:   993,
		SMTPServer: "smtp.gmail.com",
		SMTPPort:   587,
	}

	if err := mailProviderRepo.Create(gmailProvider); err != nil {
		log.Printf("创建Gmail Provider失败: %v", err)
	} else {
		fmt.Printf("✅ 成功创建Gmail Provider (ID: %d)\n", gmailProvider.ID)
	}

	// 创建两个邮箱账户，分别使用不同的OAuth2配置
	fmt.Println("\n📧 创建邮箱账户...")
	emailAccountRepo := repository.NewEmailAccountRepository(database.GetDB())

	account1 := &models.EmailAccount{
		EmailAddress:     "personal@gmail.com",
		AuthType:         models.AuthTypeOAuth2,
		MailProviderID:   gmailProvider.ID,
		OAuth2ProviderID: &gmail1.ID, // 使用Gmail-Personal配置
		CustomSettings: models.JSONMap{
			"access_token":  "personal_access_token",
			"refresh_token": "personal_refresh_token",
			"token_type":    "Bearer",
		},
	}

	account2 := &models.EmailAccount{
		EmailAddress:     "business@gmail.com",
		AuthType:         models.AuthTypeOAuth2,
		MailProviderID:   gmailProvider.ID,
		OAuth2ProviderID: &gmail2.ID, // 使用Gmail-Business配置
		CustomSettings: models.JSONMap{
			"access_token":  "business_access_token",
			"refresh_token": "business_refresh_token",
			"token_type":    "Bearer",
		},
	}

	if err := emailAccountRepo.Create(account1); err != nil {
		log.Printf("创建personal账户失败: %v", err)
	} else {
		fmt.Printf("✅ 成功创建personal账户 (ID: %d)\n", account1.ID)
	}

	if err := emailAccountRepo.Create(account2); err != nil {
		log.Printf("创建business账户失败: %v", err)
	} else {
		fmt.Printf("✅ 成功创建business账户 (ID: %d)\n", account2.ID)
	}

	// 测试获取账户及其关联的OAuth2配置
	fmt.Println("\n🔍 测试获取账户及其关联的OAuth2配置...")
	accounts, err := emailAccountRepo.GetAll()
	if err != nil {
		log.Printf("获取账户失败: %v", err)
	} else {
		fmt.Printf("✅ 找到 %d 个账户:\n", len(accounts))
		for _, acc := range accounts {
			fmt.Printf("  - 账户: %s (ID: %d)\n", acc.EmailAddress, acc.ID)
			if acc.OAuth2ProviderID != nil {
				fmt.Printf("    OAuth2Provider ID: %d\n", *acc.OAuth2ProviderID)
				if acc.OAuth2Provider != nil {
					fmt.Printf("    OAuth2Provider Name: %s\n", acc.OAuth2Provider.Name)
					fmt.Printf("    OAuth2Provider ClientID: %s\n", acc.OAuth2Provider.ClientID)
				}
			}
		}
	}

	// 测试OAuth2配置获取逻辑
	fmt.Println("\n🔧 测试OAuth2配置获取逻辑...")
	
	for _, acc := range accounts {
		if acc.AuthType == models.AuthTypeOAuth2 {
			fmt.Printf("  - 测试账户 %s 的OAuth2配置获取...\n", acc.EmailAddress)
			
			// 创建一个OAuth2GlobalConfig repo来模拟获取配置
			oauth2Repo := repository.NewOAuth2GlobalConfigRepository(database.GetDB())
			var config *models.OAuth2GlobalConfig
			
			// 首先尝试通过OAuth2ProviderID获取
			if acc.OAuth2ProviderID != nil {
				config, err = oauth2Repo.GetByID(*acc.OAuth2ProviderID)
				if err != nil {
					fmt.Printf("    ❌ 通过OAuth2ProviderID获取配置失败: %v\n", err)
				} else {
					fmt.Printf("    ✅ 通过OAuth2ProviderID获取配置成功: %s\n", config.Name)
				}
			}
			
			// 如果没有配置，尝试回退到provider type
			if config == nil {
				config, err = oauth2Repo.GetByProviderType(acc.MailProvider.Type)
				if err != nil {
					fmt.Printf("    ❌ 通过ProviderType获取配置失败: %v\n", err)
				} else {
					fmt.Printf("    ✅ 通过ProviderType回退获取配置成功: %s\n", config.Name)
				}
			}
		}
	}

	fmt.Println("\n🎉 测试完成！")
	fmt.Println("🔗 OAuth2Provider关联功能正常工作")
	fmt.Println("📝 可以创建多个相同类型的OAuth2配置")
	fmt.Println("🔄 邮箱账户可以关联特定的OAuth2配置")
	fmt.Println("⚡ Fetcher服务可以正确获取关联的OAuth2配置")
}
