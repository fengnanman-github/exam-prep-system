#!/bin/bash
# 标准化后端重新构建和部署脚本

set -e

echo "========================================="
echo "🔨 重新构建并部署后端"
echo "========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 1. 停止后端容器
echo "📦 步骤 1/4: 停止后端容器..."
docker compose stop backend

# 2. 强制重新构建后端（不使用缓存）
echo ""
echo "🔨 步骤 2/4: 重新构建后端镜像（无缓存）..."
docker compose build --no-cache backend

# 3. 重新创建并启动后端容器
echo ""
echo "🚀 步骤 3/4: 重新创建并启动后端容器..."
docker compose up -d backend

# 4. 等待服务就绪
echo ""
echo "⏳ 步骤 4/4: 等待后端服务就绪..."
sleep 5

# 检查容器状态
if docker ps | grep -q "backend"; then
    echo ""
    echo "========================================="
    echo "✅ 后端部署成功！"
    echo "========================================="
    echo ""
    echo "📍 API地址: http://localhost:13000"
    echo ""
    echo "💡 检查健康状态："
    echo "   curl http://localhost:13000/health"
    echo ""
else
    echo ""
    echo "❌ 后端容器启动失败，请检查日志："
    echo "   docker logs exam-prep-system-package-20260330-backend-1"
    exit 1
fi
