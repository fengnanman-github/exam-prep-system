#!/bin/bash
# 标准化前端重新构建和部署脚本
# 解决镜像名称不一致问题

set -e  # 遇到错误立即退出

echo "========================================="
echo "🔨 重新构建并部署前端"
echo "========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 1. 停止前端容器
echo "📦 步骤 1/4: 停止前端容器..."
docker compose stop frontend

# 2. 强制重新构建前端（不使用缓存）
echo ""
echo "🔨 步骤 2/4: 重新构建前端镜像（无缓存）..."
docker compose build --no-cache frontend

# 3. 重新创建并启动前端容器
echo ""
echo "🚀 步骤 3/4: 重新创建并启动前端容器..."
docker compose up -d frontend

# 4. 等待健康检查
echo ""
echo "⏳ 步骤 4/4: 等待前端服务就绪..."
sleep 10

# 检查容器状态
if docker ps | grep -q "frontend.*healthy"; then
    echo ""
    echo "========================================="
    echo "✅ 前端部署成功！"
    echo "========================================="
    echo ""
    echo "📍 访问地址: http://localhost:18080"
    echo ""
    echo "💡 提示："
    echo "   - 请清除浏览器缓存（Ctrl+Shift+Delete）"
    echo "   - 硬刷新页面（Ctrl+F5 或 Cmd+Shift+R）"
    echo ""
else
    echo ""
    echo "⚠️  前端容器未通过健康检查，请检查日志："
    echo "   docker logs exam-prep-system-package-20260330-frontend-1"
    exit 1
fi
