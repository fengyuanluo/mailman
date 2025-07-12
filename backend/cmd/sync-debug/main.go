package main

import (
	"fmt"
	"log"

	"mailman/internal/config"
	"mailman/internal/database"
	"mailman/internal/repository"
)

func main() {
	fmt.Println("=== 同步配置诊断工具 ===")

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
	syncConfigRepo := repository.NewSyncConfigRepository(database.DB)

	accountID := uint(41)
	fmt.Printf("\n--- 检查账户 %d ---\n", accountID)

	// 1. 检查账户状态
	account, err := accountRepo.GetByID(accountID)
	if err != nil {
		fmt.Printf("❌ 获取账户失败: %v\n", err)
		return
	}

	fmt.Printf("✅ 账户信息:\n")
	fmt.Printf("   邮箱: %s\n", account.EmailAddress)
	fmt.Printf("   验证状态: %v\n", account.IsVerified)
	fmt.Printf("   删除状态: %v\n", account.DeletedAt.Valid)
	fmt.Printf("   认证类型: %s\n", account.AuthType)

	// 2. 检查同步配置
	fmt.Printf("\n--- 检查同步配置 ---\n")
	syncConfig, err := syncConfigRepo.GetByAccountID(accountID)
	if err != nil {
		fmt.Printf("❌ 获取同步配置失败: %v\n", err)
		fmt.Printf("   这可能意味着账户没有同步配置\n")
	} else {
		fmt.Printf("✅ 同步配置存在:\n")
		fmt.Printf("   ID: %d\n", syncConfig.ID)
		fmt.Printf("   自动同步: %v\n", syncConfig.EnableAutoSync)
		fmt.Printf("   同步间隔: %d 秒\n", syncConfig.SyncInterval)
		fmt.Printf("   同步文件夹: %v\n", syncConfig.SyncFolders)
		fmt.Printf("   同步状态: %s\n", syncConfig.SyncStatus)
		fmt.Printf("   最后同步时间: %v\n", syncConfig.LastSyncTime)
		fmt.Printf("   错误信息: %s\n", syncConfig.LastSyncError)
	}

	// 3. 检查全局同步配置
	fmt.Printf("\n--- 检查全局同步配置 ---\n")
	globalConfig, err := syncConfigRepo.GetGlobalConfig()
	if err != nil {
		fmt.Printf("❌ 获取全局配置失败: %v\n", err)
	} else {
		fmt.Printf("✅ 全局配置:\n")
		for key, value := range globalConfig {
			fmt.Printf("   %s: %v\n", key, value)
		}
	}

	// 4. 检查启用的同步配置
	fmt.Printf("\n--- 检查所有启用的同步配置 ---\n")
	enabledConfigs, err := syncConfigRepo.GetEnabledConfigsWithAccounts()
	if err != nil {
		fmt.Printf("❌ 获取启用的配置失败: %v\n", err)
	} else {
		fmt.Printf("✅ 共有 %d 个启用的同步配置:\n", len(enabledConfigs))
		for _, config := range enabledConfigs {
			fmt.Printf("   账户 %d (%s): 自动同步=%v, 间隔=%d秒\n",
				config.AccountID, config.Account.EmailAddress,
				config.EnableAutoSync, config.SyncInterval)
		}
	}

	// 5. 检查未配置的验证账户
	fmt.Printf("\n--- 检查未配置的验证账户 ---\n")
	accounts, err := syncConfigRepo.GetVerifiedAccountsWithoutSyncConfig()
	if err != nil {
		fmt.Printf("❌ 获取未配置账户失败: %v\n", err)
	} else {
		fmt.Printf("✅ 共有 %d 个未配置的验证账户:\n", len(accounts))
		for _, acc := range accounts {
			fmt.Printf("   账户 %d (%s): 验证=%v\n",
				acc.ID, acc.EmailAddress, acc.IsVerified)
		}
	}

	// 6. 检查邮件数量
	fmt.Printf("\n--- 检查邮件数量 ---\n")
	emailRepo := repository.NewEmailRepository(database.DB)
	emailCount, err := emailRepo.GetCount(accountID)
	if err != nil {
		fmt.Printf("❌ 获取邮件数量失败: %v\n", err)
	} else {
		fmt.Printf("✅ 账户 %d 的邮件数量: %d\n", accountID, emailCount)
	}

	fmt.Printf("\n=== 诊断完成 ===\n")
}
