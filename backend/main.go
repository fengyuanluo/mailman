package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jhillyerd/enmime"
)

func main2() {
	// 读取邮件文件
	emailData, err := os.ReadFile("email.txt")
	if err != nil {
		log.Fatalf("无法读取邮件文件: %v", err)
	}

	// 使用enmime解析邮件
	envelope, err := enmime.ReadEnvelope(strings.NewReader(string(emailData)))
	if err != nil {
		log.Fatalf("解析邮件失败: %v", err)
	}

	// 输出邮件基本信息
	fmt.Println("===============邮件解析结果===============")
	fmt.Printf("发件人: %s\n", envelope.GetHeader("From"))
	fmt.Printf("收件人: %s\n", envelope.GetHeader("To"))
	fmt.Printf("主题: %s\n", envelope.GetHeader("Subject"))
	fmt.Printf("日期: %s\n", envelope.GetHeader("Date"))
	fmt.Printf("内容类型: %s\n", envelope.GetHeader("Content-Type"))

	// 输出所有邮件头
	fmt.Println("\n===============所有邮件头===============")
	for _, key := range envelope.GetHeaderKeys() {
		val := envelope.GetHeaderValues(key)
		if len(val) > 0 {
			fmt.Printf("%s: %s\n", key, val[0])
		}
	}

	// 输出文本内容
	fmt.Println("\n===============邮件文本内容===============")
	fmt.Println(envelope.Text)

	// 输出HTML内容
	fmt.Println("\n===============邮件HTML内容===============")
	fmt.Println(envelope.HTML)

	// 输出附件信息
	if len(envelope.Attachments) > 0 {
		fmt.Println("\n===============附件信息===============")
		for _, a := range envelope.Attachments {
			fmt.Printf("附件名: %s, 类型: %s, 大小: %d bytes\n", a.FileName, a.ContentType, len(a.Content))
		}
	} else {
		fmt.Println("\n没有发现附件")
	}

	// 输出嵌入图片信息
	if len(envelope.Inlines) > 0 {
		fmt.Println("\n===============嵌入图片===============")
		for _, i := range envelope.Inlines {
			fmt.Printf("内嵌资源: %s, 类型: %s, 大小: %d bytes\n", i.FileName, i.ContentType, len(i.Content))
		}
	} else {
		fmt.Println("\n没有发现嵌入图片")
	}

	// 输出MIME结构基本信息
	fmt.Println("\n===============MIME结构基本信息===============")
	if envelope.Root != nil {
		fmt.Printf("根部分内容类型: %s\n", envelope.Root.ContentType)
		fmt.Printf("根部分处理类型: %s\n", envelope.Root.Disposition)
		if envelope.Root.FileName != "" {
			fmt.Printf("根部分文件名: %s\n", envelope.Root.FileName)
		}
	} else {
		fmt.Println("无MIME结构")
	}

	// 输出错误信息（如果有）
	if len(envelope.Errors) > 0 {
		fmt.Println("\n===============解析错误===============")
		for _, err := range envelope.Errors {
			fmt.Printf("错误: %v\n", err)
		}
	}
}
