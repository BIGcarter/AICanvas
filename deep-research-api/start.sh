#!/bin/bash

echo "🚀 启动 Deep Research API 服务..."

# 检查是否已安装依赖
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📥 安装依赖..."
pip install -r requirements.txt

# 启动服务
echo "🌐 启动服务..."
echo "服务将在 http://localhost:8000 启动"
echo "API 文档: http://localhost:8000/docs"
echo "按 Ctrl+C 停止服务"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
