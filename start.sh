#!/bin/bash

# NovaStyle 快速启动脚本
# 用于一键安装依赖并启动开发服务器

echo "🚀 NovaStyle v2.0 - 快速启动"
echo "================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js v18+"
    echo "   下载地址：https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低 (v$NODE_VERSION)，需要 v18+"
    exit 1
fi

echo "✅ Node.js 版本：$(node -v)"

# 检查 npm/yarn
if command -v yarn &> /dev/null; then
    PKG_MANAGER="yarn"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
else
    echo "❌ 未检测到 npm 或 yarn"
    exit 1
fi

echo "✅ 包管理器：$PKG_MANAGER"

# 安装依赖
if [ -d "node_modules" ]; then
    echo "📦 检测到已安装的依赖"
    read -p "是否重新安装依赖？(y/N): " REINSTALL
    if [ "$REINSTALL" = "y" ] || [ "$REINSTALL" = "Y" ]; then
        echo "🔄 重新安装依赖..."
        $PKG_MANAGER install
    fi
else
    echo "📦 正在安装依赖..."
    $PKG_MANAGER install
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  未检测到 .env 文件"
    echo "   请创建 .env 文件并设置 API_KEY："
    echo ""
    echo "   API_KEY=your_gemini_api_key"
    echo ""
    read -p "是否现在创建 .env 文件？(y/N): " CREATE_ENV
    if [ "$CREATE_ENV" = "y" ] || [ "$CREATE_ENV" = "Y" ]; then
        read -p "请输入 Gemini API Key: " API_KEY
        echo "API_KEY=$API_KEY" > .env
        echo "✅ .env 文件已创建"
    fi
fi

# 启动开发服务器
echo ""
echo "🚀 启动开发服务器..."
echo "================================"
echo "访问地址：http://localhost:5173"
echo "按 Ctrl+C 停止服务"
echo ""

$PKG_MANAGER run dev
