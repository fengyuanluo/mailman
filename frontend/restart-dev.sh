#!/bin/bash

echo "🔄 重启前端开发环境..."

# 清理 TypeScript 缓存
echo "📦 清理缓存..."
rm -rf .next
rm -rf tsconfig.tsbuildinfo

# 清理 ESLint 缓存
rm -rf .eslintcache

# 重启 TypeScript 服务（如果在 VSCode 中）
echo "💡 提示：在 VSCode 中，请执行以下操作："
echo "1. 按 Cmd+Shift+P (Mac) 或 Ctrl+Shift+P (Windows)"
echo "2. 输入 'TypeScript: Restart TS Server'"
echo "3. 按 Enter 执行"
echo ""

# 启动开发服务器
echo "🚀 启动开发服务器..."
npm run dev