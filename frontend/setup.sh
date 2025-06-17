#!/bin/bash

echo "🚀 邮箱管理系统前端 - 安装脚本"
echo "================================"

# 检查 Node.js 版本
node_version=$(node -v 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js 已安装: $node_version"
else
    echo "❌ Node.js 未安装，请先安装 Node.js >= 18.0.0"
    exit 1
fi

# 检查 npm 版本
npm_version=$(npm -v 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ npm 已安装: v$npm_version"
else
    echo "❌ npm 未安装"
    exit 1
fi

# 创建环境变量文件
if [ ! -f .env.local ]; then
    echo "📝 创建环境变量文件..."
    cp .env.local.example .env.local
    echo "✅ 已创建 .env.local 文件"
else
    echo "✅ .env.local 文件已存在"
fi

# 安装依赖
echo ""
echo "📦 开始安装依赖..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 安装完成！"
    echo ""
    echo "🎯 下一步："
    echo "1. 启动开发服务器: npm run dev"
    echo "2. 访问: http://localhost:3000"
    echo ""
    echo "💡 其他有用的命令:"
    echo "- npm run build    # 构建生产版本"
    echo "- npm run lint     # 运行代码检查"
    echo "- npm run type-check # TypeScript 类型检查"
else
    echo "❌ 安装失败，请检查错误信息"
    exit 1
fi