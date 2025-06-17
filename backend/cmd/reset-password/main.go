package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"syscall"

	"mailman/internal/config"
	"mailman/internal/database"
	"mailman/internal/models"
	"mailman/internal/repository"

	"golang.org/x/term"
)

func main() {
	var (
		username = flag.String("username", "", "用户名")
		email    = flag.String("email", "", "邮箱地址")
		password = flag.String("password", "", "新密码（不推荐在命令行中直接输入）")
		force    = flag.Bool("force", false, "强制重置，不需要确认")
	)
	flag.Parse()

	// 检查参数
	if *username == "" && *email == "" {
		fmt.Println("错误：必须指定用户名或邮箱地址")
		fmt.Println("使用方法:")
		fmt.Println("  reset-password -username=<用户名> [-password=<新密码>] [-force]")
		fmt.Println("  reset-password -email=<邮箱> [-password=<新密码>] [-force]")
		fmt.Println("")
		fmt.Println("参数说明:")
		fmt.Println("  -username  指定要重置密码的用户名")
		fmt.Println("  -email     指定要重置密码的邮箱地址")
		fmt.Println("  -password  新密码（如果不指定，将提示输入）")
		fmt.Println("  -force     强制重置，跳过确认步骤")
		os.Exit(1)
	}

	if *username != "" && *email != "" {
		fmt.Println("错误：不能同时指定用户名和邮箱地址")
		os.Exit(1)
	}

	// 加载配置
	cfg := config.Load()

	// 初始化数据库
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
		log.Fatalf("数据库初始化失败: %v", err)
	}
	defer database.Close()

	db := database.GetDB()

	// 创建用户仓库
	userRepo := repository.NewUserRepository(db)

	// 查找用户
	var user *models.User
	var err error
	var identifier string

	if *username != "" {
		user, err = userRepo.GetByUsername(*username)
		identifier = fmt.Sprintf("用户名: %s", *username)
	} else {
		user, err = userRepo.GetByEmail(*email)
		identifier = fmt.Sprintf("邮箱: %s", *email)
	}

	if err != nil {
		log.Fatalf("查找用户失败 (%s): %v", identifier, err)
	}

	// 显示用户信息
	fmt.Printf("找到用户:\n")
	fmt.Printf("  ID: %d\n", user.ID)
	fmt.Printf("  用户名: %s\n", user.Username)
	fmt.Printf("  邮箱: %s\n", user.Email)
	fmt.Printf("  状态: %s\n", func() string {
		if user.IsActive {
			return "激活"
		}
		return "禁用"
	}())
	fmt.Printf("  创建时间: %s\n", user.CreatedAt.Format("2006-01-02 15:04:05"))
	if user.LastLoginAt != nil {
		fmt.Printf("  最后登录: %s\n", user.LastLoginAt.Format("2006-01-02 15:04:05"))
	} else {
		fmt.Printf("  最后登录: 从未登录\n")
	}
	fmt.Println()

	// 确认操作
	if !*force {
		fmt.Printf("确定要重置用户 '%s' 的密码吗？(y/N): ", user.Username)
		reader := bufio.NewReader(os.Stdin)
		response, err := reader.ReadString('\n')
		if err != nil {
			log.Fatalf("读取输入失败: %v", err)
		}
		response = strings.TrimSpace(strings.ToLower(response))
		if response != "y" && response != "yes" {
			fmt.Println("操作已取消")
			os.Exit(0)
		}
	}

	// 获取新密码
	var newPassword string
	if *password != "" {
		newPassword = *password
		fmt.Println("警告：在命令行中直接输入密码是不安全的，建议使用交互式输入")
	} else {
		fmt.Print("请输入新密码: ")
		passwordBytes, err := term.ReadPassword(int(syscall.Stdin))
		if err != nil {
			log.Fatalf("读取密码失败: %v", err)
		}
		fmt.Println()

		fmt.Print("请再次输入新密码: ")
		confirmPasswordBytes, err := term.ReadPassword(int(syscall.Stdin))
		if err != nil {
			log.Fatalf("读取确认密码失败: %v", err)
		}
		fmt.Println()

		newPassword = string(passwordBytes)
		confirmPassword := string(confirmPasswordBytes)

		if newPassword != confirmPassword {
			log.Fatal("两次输入的密码不一致")
		}
	}

	// 验证密码长度
	if len(newPassword) < 6 {
		log.Fatal("密码长度至少需要6个字符")
	}

	// 设置新密码
	if err := user.SetPassword(newPassword); err != nil {
		log.Fatalf("设置密码失败: %v", err)
	}

	// 更新数据库
	if err := userRepo.Update(user); err != nil {
		log.Fatalf("更新用户失败: %v", err)
	}

	fmt.Printf("✅ 用户 '%s' 的密码已成功重置\n", user.Username)

	// 如果用户被禁用，询问是否激活
	if !user.IsActive {
		if !*force {
			fmt.Printf("用户当前处于禁用状态，是否要激活该用户？(y/N): ")
			reader := bufio.NewReader(os.Stdin)
			response, err := reader.ReadString('\n')
			if err != nil {
				log.Printf("读取输入失败: %v", err)
				return
			}
			response = strings.TrimSpace(strings.ToLower(response))
			if response == "y" || response == "yes" {
				user.IsActive = true
				if err := userRepo.Update(user); err != nil {
					log.Printf("激活用户失败: %v", err)
				} else {
					fmt.Printf("✅ 用户 '%s' 已激活\n", user.Username)
				}
			}
		}
	}

	fmt.Println("密码重置完成！")
}
