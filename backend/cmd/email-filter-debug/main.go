package main

import (
	"fmt"
	"log"
	"time"

	"mailman/internal/config"
	"mailman/internal/database"
	"mailman/internal/models"
	"mailman/internal/repository"
	"mailman/internal/services"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 初始化数据库
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
		log.Fatal("Failed to initialize database:", err)
	}

	// 获取数据库连接
	db := database.GetDB()

	// 初始化仓库
	accountRepo := repository.NewEmailAccountRepository(db)
	syncConfigRepo := repository.NewSyncConfigRepository(db)

	// 测试账户ID
	accountID := uint(41)

	fmt.Printf("=== 邮件过滤诊断 - 账户 %d ===\n\n", accountID)

	// 1. 检查账户信息
	account, err := accountRepo.GetByID(accountID)
	if err != nil {
		log.Printf("错误：无法获取账户信息: %v", err)
		return
	}
	if account == nil {
		log.Printf("错误：账户 %d 不存在", accountID)
		return
	}
	fmt.Printf("✓ 账户信息：%s (ID: %d)\n", account.EmailAddress, account.ID)

	// 2. 检查同步配置
	syncConfig, err := syncConfigRepo.GetByAccountID(accountID)
	if err != nil {
		log.Printf("错误：无法获取同步配置: %v", err)
		return
	}
	if syncConfig == nil {
		log.Printf("错误：账户 %d 没有同步配置", accountID)
		return
	}

	fmt.Printf("✓ 同步配置：\n")
	fmt.Printf("  - 同步间隔: %d 秒\n", syncConfig.SyncInterval)
	fmt.Printf("  - 同步文件夹: %v\n", syncConfig.SyncFolders)
	fmt.Printf("  - 最后同步时间: %v\n", syncConfig.LastSyncTime)
	fmt.Printf("  - 启用状态: %v\n", syncConfig.EnableAutoSync)

	// 3. 检查最近的邮件
	fmt.Printf("\n--- 检查最近的邮件 ---\n")
	var emails []models.Email
	result := db.Where("account_id = ?", accountID).
		Order("date DESC").
		Limit(10).
		Find(&emails)

	if result.Error != nil {
		log.Printf("错误：无法获取邮件: %v", result.Error)
		return
	}

	fmt.Printf("找到 %d 封最近的邮件：\n", len(emails))
	for i, email := range emails {
		fmt.Printf("  %d. ID: %s\n", i+1, email.ID)
		fmt.Printf("     主题: %s\n", email.Subject)
		fmt.Printf("     发件人: %v\n", email.From)
		fmt.Printf("     收件人: %v\n", email.To)
		fmt.Printf("     邮件时间: %v\n", email.Date)
		fmt.Printf("     邮箱名称: %s\n", email.MailboxName)
		fmt.Printf("     附件数量: %d\n", len(email.Attachments))
		fmt.Printf("     ---\n")
	}

	// 4. 模拟订阅过滤器检查
	fmt.Printf("\n--- 模拟订阅过滤器检查 ---\n")

	// 创建模拟的过滤器（基于同步配置）
	filter := services.EmailFilter{
		EmailAddress: account.EmailAddress,
		RealMailbox:  account.EmailAddress,
		StartDate:    syncConfig.LastSyncTime,
		Folders:      syncConfig.SyncFolders,
	}

	fmt.Printf("过滤器配置：\n")
	fmt.Printf("  - 邮件地址: %s\n", filter.EmailAddress)
	fmt.Printf("  - 真实邮箱: %s\n", filter.RealMailbox)
	fmt.Printf("  - 开始日期: %v\n", filter.StartDate)
	fmt.Printf("  - 文件夹: %v\n", filter.Folders)

	// 检查每封邮件是否匹配过滤器
	for i, email := range emails {
		fmt.Printf("\n检查邮件 %d:\n", i+1)

		// 检查时间过滤
		timeMatch := true
		if filter.StartDate != nil && email.Date.Before(*filter.StartDate) {
			timeMatch = false
			fmt.Printf("  ❌ 时间过滤失败: 邮件时间 %v 早于开始时间 %v\n", email.Date, *filter.StartDate)
		} else {
			fmt.Printf("  ✓ 时间过滤通过\n")
		}

		// 检查文件夹过滤
		folderMatch := true
		if len(filter.Folders) > 0 {
			found := false
			for _, folder := range filter.Folders {
				if email.MailboxName == folder {
					found = true
					break
				}
			}
			if !found {
				folderMatch = false
				fmt.Printf("  ❌ 文件夹过滤失败: 邮件在 '%s'，但允许的文件夹为 %v\n", email.MailboxName, filter.Folders)
			} else {
				fmt.Printf("  ✓ 文件夹过滤通过\n")
			}
		} else {
			fmt.Printf("  ✓ 文件夹过滤通过 (无限制)\n")
		}

		// 检查别名匹配
		aliasMatch := true
		if filter.EmailAddress != "" {
			found := false
			for _, to := range email.To {
				if to == filter.EmailAddress {
					found = true
					break
				}
			}
			if !found {
				aliasMatch = false
				fmt.Printf("  ❌ 别名匹配失败: 邮件收件人 %v 不包含 %s\n", email.To, filter.EmailAddress)
			} else {
				fmt.Printf("  ✓ 别名匹配通过\n")
			}
		} else {
			fmt.Printf("  ✓ 别名匹配通过 (无限制)\n")
		}

		// 总结
		if timeMatch && folderMatch && aliasMatch {
			fmt.Printf("  ✅ 邮件应该被接受\n")
		} else {
			fmt.Printf("  ❌ 邮件会被过滤掉\n")
		}
	}

	// 5. 提供修复建议
	fmt.Printf("\n--- 修复建议 ---\n")

	// 检查最后同步时间是否过新
	if syncConfig.LastSyncTime != nil {
		timeSinceLastSync := time.Since(*syncConfig.LastSyncTime)
		if timeSinceLastSync < 24*time.Hour {
			fmt.Printf("⚠️  最后同步时间过新 (%v 前)，可能会过滤掉旧邮件\n", timeSinceLastSync)
			fmt.Printf("   建议：将最后同步时间设置为更早的时间或 NULL\n")
		}
	}

	// 检查同步文件夹配置
	if len(syncConfig.SyncFolders) > 0 {
		fmt.Printf("📁 同步文件夹限制为: %v\n", syncConfig.SyncFolders)
		fmt.Printf("   确保邮件所在的文件夹在此列表中\n")
	}

	// 6. 提供SQL修复命令
	fmt.Printf("\n--- SQL修复命令 ---\n")
	fmt.Printf("-- 将最后同步时间设置为7天前，以获取更多历史邮件：\n")
	fmt.Printf("UPDATE email_account_sync_configs SET last_sync_time = '%s' WHERE account_id = %d;\n",
		time.Now().Add(-7*24*time.Hour).Format("2006-01-02 15:04:05"), accountID)

	fmt.Printf("\n-- 或者清除最后同步时间（获取所有邮件）：\n")
	fmt.Printf("UPDATE email_account_sync_configs SET last_sync_time = NULL WHERE account_id = %d;\n", accountID)

	fmt.Printf("\n-- 检查并更新同步文件夹（如果需要包含更多文件夹）：\n")
	fmt.Printf("UPDATE email_account_sync_configs SET sync_folders = '[\"INBOX\", \"Sent\", \"Drafts\"]' WHERE account_id = %d;\n", accountID)

	fmt.Printf("\n=== 诊断完成 ===\n")
}
