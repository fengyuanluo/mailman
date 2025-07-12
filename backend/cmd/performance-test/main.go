package main

import (
	"fmt"
	"log"
	"time"

	"mailman/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, err := gorm.Open(sqlite.Open("test_performance.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// 自动迁移
	db.AutoMigrate(&models.Email{}, &models.Attachment{})

	// 测试邮件数量性能
	testEmailCounts := []int{1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000}

	for _, count := range testEmailCounts {
		fmt.Printf("\n=== 测试 %d 封邮件性能 ===\n", count)

		// 清空数据
		db.Exec("DELETE FROM emails")
		db.Exec("DELETE FROM attachments")

		// 插入测试数据
		start := time.Now()
		insertEmails(db, count)
		insertTime := time.Since(start)

		// 测试查询性能
		start = time.Now()
		queryEmails(db)
		queryTime := time.Since(start)

		// 获取数据库大小
		var size int64
		db.Raw("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").Scan(&size)

		fmt.Printf("插入耗时: %v\n", insertTime)
		fmt.Printf("查询耗时: %v\n", queryTime)
		fmt.Printf("数据库大小: %.2f MB\n", float64(size)/(1024*1024))

		if queryTime > time.Second*5 {
			fmt.Printf("⚠️  警告: 查询超过5秒，建议考虑优化或迁移数据库\n")
		}
	}
}

func insertEmails(db *gorm.DB, count int) {
	emails := make([]models.Email, count)
	for i := 0; i < count; i++ {
		emails[i] = models.Email{
			MessageID:   fmt.Sprintf("test-%d@example.com", i),
			AccountID:   1,
			Subject:     fmt.Sprintf("Test Email %d", i),
			Body:        "This is a test email body with some content to simulate real email size.",
			HTMLBody:    "<html><body>This is a test email body with some content to simulate real email size.</body></html>",
			RawMessage:  fmt.Sprintf("Raw email message %d with additional content to simulate real email raw message size", i),
			MailboxName: "INBOX",
			Date:        time.Now().Add(-time.Duration(i) * time.Hour),
		}
	}

	// 批量插入
	batchSize := 1000
	for i := 0; i < len(emails); i += batchSize {
		end := i + batchSize
		if end > len(emails) {
			end = len(emails)
		}
		db.Create(emails[i:end])
	}
}

func queryEmails(db *gorm.DB) {
	var count int64
	db.Model(&models.Email{}).Count(&count)

	var emails []models.Email
	db.Where("date > ?", time.Now().Add(-24*time.Hour)).Find(&emails)

	db.Where("mailbox_name = ?", "INBOX").Order("date desc").Limit(100).Find(&emails)
}
