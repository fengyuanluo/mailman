package main

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"mailman/internal/repository"
	"mailman/internal/services"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// 从命令行参数获取账户ID
	if len(os.Args) < 2 {
		log.Fatal("使用方法: go run main.go <account_id>")
	}

	accountIDStr := os.Args[1]
	accountID, err := strconv.ParseUint(accountIDStr, 10, 32)
	if err != nil {
		log.Fatalf("无效的账户ID: %v", err)
	}

	// 连接数据库
	db, err := gorm.Open(sqlite.Open("../data/mailman.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	// 创建仓库
	accountRepo := repository.NewEmailAccountRepository(db)
	emailRepo := repository.NewEmailRepository(db)

	// 创建服务
	fetcherService := services.NewFetcherService(accountRepo, emailRepo)

	// 获取账户
	account, err := accountRepo.GetByID(uint(accountID))
	if err != nil {
		log.Fatalf("获取账户失败: %v", err)
	}

	fmt.Printf("测试账户: %s (ID: %d)\n", account.EmailAddress, account.ID)
	fmt.Printf("认证类型: %s\n", account.AuthType)
	fmt.Printf("邮箱提供商: %s\n", account.MailProvider.Name)

	// 验证连接
	fmt.Printf("\n开始验证连接...\n")
	err = fetcherService.VerifyConnection(*account)
	if err != nil {
		fmt.Printf("❌ 连接验证失败: %v\n", err)
	} else {
		fmt.Printf("✅ 连接验证成功!\n")
	}
}
