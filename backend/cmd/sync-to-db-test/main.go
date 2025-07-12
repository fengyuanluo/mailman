package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/yourusername/mailman/backend/internal/database"
	"github.com/yourusername/mailman/backend/internal/models"
	"github.com/yourusername/mailman/backend/internal/repository"
	"github.com/yourusername/mailman/backend/internal/services"
	"github.com/yourusername/mailman/backend/pkg/logger"
)

func main() {
	// 设置日志
	logFile, err := os.OpenFile("sync_to_db_test.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal(err)
	}
	defer logFile.Close()

	// 初始化数据库
	db, err := database.NewDatabase()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// 初始化日志器
	appLogger := logger.NewLogger(logger.Config{
		Level:  logger.LevelInfo,
		Format: logger.FormatText,
		Output: logFile,
	})

	// 初始化仓库
	emailRepo := repository.NewEmailRepository(db)
	accountRepo := repository.NewEmailAccountRepository(db)
	syncConfigRepo := repository.NewSyncConfigRepository(db)

	// 获取测试账户
	account, err := accountRepo.GetByID(41) // 使用调试程序中的账户ID
	if err != nil {
		log.Fatal("Failed to get account:", err)
	}

	fmt.Printf("=== 模拟同步到数据库测试 - 账户 %d ===\n", account.ID)
	fmt.Printf("账户邮箱: %s\n", account.EmailAddress)

	// 模拟从邮箱服务器获取到的邮件列表
	fetchedEmails := []models.Email{
		{
			MessageID:   "test-message-1@gmail.com",
			Subject:     "测试邮件 1",
			From:        "sender1@example.com",
			To:          account.EmailAddress,
			Date:        time.Now().Add(-2 * time.Hour),
			MailboxName: "INBOX",
			AccountID:   account.ID,
			Body:        "这是测试邮件 1 的内容",
			IsRead:      false,
		},
		{
			MessageID:   "test-message-2@gmail.com",
			Subject:     "测试邮件 2",
			From:        "sender2@example.com",
			To:          account.EmailAddress,
			Date:        time.Now().Add(-1 * time.Hour),
			MailboxName: "INBOX",
			AccountID:   account.ID,
			Body:        "这是测试邮件 2 的内容",
			IsRead:      false,
		},
		{
			MessageID:   "existing-message@gmail.com", // 这个邮件已经存在于数据库中
			Subject:     "已存在的邮件",
			From:        "sender3@example.com",
			To:          account.EmailAddress,
			Date:        time.Now().Add(-30 * time.Minute),
			MailboxName: "INBOX",
			AccountID:   account.ID,
			Body:        "这个邮件已经存在于数据库中",
			IsRead:      false,
		},
	}

	// 先创建一个"已存在"的邮件
	existingEmail := models.Email{
		MessageID:   "existing-message@gmail.com",
		Subject:     "已存在的邮件",
		From:        "sender3@example.com",
		To:          account.EmailAddress,
		Date:        time.Now().Add(-30 * time.Minute),
		MailboxName: "INBOX",
		AccountID:   account.ID,
		Body:        "这个邮件已经存在于数据库中",
		IsRead:      false,
	}

	// 检查是否已经存在，如果不存在则创建
	existing, err := emailRepo.GetByMessageID(existingEmail.MessageID, account.ID)
	if err != nil || existing == nil {
		err = emailRepo.Create(&existingEmail)
		if err != nil {
			log.Printf("Failed to create existing email: %v", err)
		} else {
			fmt.Printf("✓ 创建了测试用的已存在邮件: %s\n", existingEmail.MessageID)
		}
	} else {
		fmt.Printf("✓ 测试用的已存在邮件已经存在: %s\n", existingEmail.MessageID)
	}

	fmt.Printf("\n--- 开始同步 %d 封邮件 ---\n", len(fetchedEmails))

	// 统计信息
	var savedCount, skippedCount, errorCount int

	for i, email := range fetchedEmails {
		fmt.Printf("\n检查邮件 %d:\n", i+1)
		fmt.Printf("  MessageID: %s\n", email.MessageID)
		fmt.Printf("  主题: %s\n", email.Subject)
		fmt.Printf("  发件人: %s\n", email.From)
		fmt.Printf("  收件人: %s\n", email.To)
		fmt.Printf("  时间: %s\n", email.Date.Format("2006-01-02 15:04:05"))
		fmt.Printf("  邮箱: %s\n", email.MailboxName)

		// 检查邮件是否已经存在
		existingEmail, err := emailRepo.GetByMessageID(email.MessageID, account.ID)
		if err != nil {
			fmt.Printf("  ❌ 检查邮件存在性时出错: %v\n", err)
			errorCount++
			continue
		}

		if existingEmail != nil {
			fmt.Printf("  ⚠️  邮件已存在，跳过同步 (ID: %d)\n", existingEmail.ID)
			skippedCount++
			continue
		}

		// 邮件不存在，保存到数据库
		err = emailRepo.Create(&email)
		if err != nil {
			fmt.Printf("  ❌ 保存邮件失败: %v\n", err)
			errorCount++
			continue
		}

		fmt.Printf("  ✅ 邮件已保存到数据库 (ID: %d)\n", email.ID)
		savedCount++
	}

	fmt.Printf("\n--- 同步完成 ---\n")
	fmt.Printf("总计邮件: %d\n", len(fetchedEmails))
	fmt.Printf("已保存: %d\n", savedCount)
	fmt.Printf("已跳过: %d\n", skippedCount)
	fmt.Printf("出错: %d\n", errorCount)

	// 验证数据库中的邮件
	fmt.Printf("\n--- 验证数据库中的邮件 ---\n")
	for _, email := range fetchedEmails {
		dbEmail, err := emailRepo.GetByMessageID(email.MessageID, account.ID)
		if err != nil {
			fmt.Printf("❌ 检查邮件 %s 时出错: %v\n", email.MessageID, err)
			continue
		}
		if dbEmail != nil {
			fmt.Printf("✅ 邮件 %s 已存在于数据库中 (ID: %d)\n", email.MessageID, dbEmail.ID)
		} else {
			fmt.Printf("❌ 邮件 %s 不存在于数据库中\n", email.MessageID)
		}
	}

	// 测试真实同步场景：使用同步服务
	fmt.Printf("\n--- 测试真实同步服务 ---\n")

	// 获取同步配置
	syncConfig, err := syncConfigRepo.GetByAccountIDWithAccount(account.ID)
	if err != nil {
		log.Printf("Failed to get sync config: %v", err)
		return
	}

	fmt.Printf("同步配置:\n")
	fmt.Printf("  账户ID: %d\n", syncConfig.AccountID)
	fmt.Printf("  同步间隔: %d 秒\n", syncConfig.SyncInterval)
	fmt.Printf("  同步文件夹: %v\n", syncConfig.SyncFolders)
	fmt.Printf("  最后同步时间: %v\n", syncConfig.LastSyncTime)

	// 模拟使用优化的增量同步管理器
	scheduler := services.NewFetcherScheduler(appLogger)
	manager := services.NewOptimizedIncrementalSyncManager(
		scheduler,
		syncConfigRepo,
		emailRepo,
		appLogger,
	)

	// 初始化管理器
	err = manager.Initialize(context.Background())
	if err != nil {
		log.Printf("Failed to initialize sync manager: %v", err)
		return
	}

	// 手动触发同步
	fmt.Printf("\n--- 手动触发同步 ---\n")
	err = manager.TriggerSync(context.Background(), account.ID)
	if err != nil {
		log.Printf("Failed to trigger sync: %v", err)
	} else {
		fmt.Printf("✅ 同步触发成功\n")
	}

	// 等待一段时间让同步完成
	fmt.Printf("等待同步完成...\n")
	time.Sleep(10 * time.Second)

	// 关闭管理器
	manager.Shutdown()

	fmt.Printf("\n=== 测试完成 ===\n")
}
