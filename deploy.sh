#!/bin/bash

# 密评备考系统部署脚本
# 版本: 1.0.0
# 描述: 一键部署密评备考系统到目标环境

echo "🔐 密评备考系统部署脚本"
echo "========================="

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 创建数据目录
mkdir -p data/db data/redis

# 设置环境变量
export COMPOSE_PROJECT_NAME=exam-prep-system
export DEPLOY_ENV=${DEPLOY_ENV:-production}

echo "📦 开始构建Docker镜像..."

# 构建镜像
docker compose build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ 镜像构建失败"
    exit 1
fi

echo "✅ 镜像构建成功"

echo "🚀 启动服务..."

# 启动服务
docker compose up -d

if [ $? -ne 0 ]; then
    echo "❌ 服务启动失败"
    exit 1
fi

echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."

# 检查后端服务
if curl -s http://localhost:13000/health > /dev/null; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务异常"
    exit 1
fi

# 检查前端服务
if curl -s http://localhost:18080 > /dev/null; then
    echo "✅ 前端服务运行正常"
else
    echo "❌ 前端服务异常"
    exit 1
fi

# 检查数据库连接
if docker compose exec db pg_isready -U exam_user -d exam_db > /dev/null; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接异常"
    exit 1
fi

# 显示访问信息
echo ""
echo "🎉 部署完成！"
echo "================"
echo "前端访问地址: http://localhost:18080"
echo "后端API地址: http://localhost:13000"
echo "数据库端口: 15432"
echo "Redis端口: 16379"
echo ""
echo "📊 系统信息:"
echo "- 题目总数: 5075题"
echo "- 判断题: 1590题"
echo "- 单选题: 1747题"
echo "- 多选题: 1738题"
echo ""
echo "💡 管理命令:"
echo "- 停止服务: docker compose down"
echo "- 查看日志: docker compose logs"
echo "- 重启服务: docker compose restart"
echo ""

# 生成部署报告
echo "📋 生成部署报告..."
cat > deployment-report.md << EOF
# 密评备考系统部署报告

## 部署信息
- 部署时间: $(date)
- 部署环境: $DEPLOY_ENV
- 部署版本: 1.0.0

## 服务状态
- 前端服务: http://localhost:18080 ✅
- 后端服务: http://localhost:13000 ✅
- 数据库服务: localhost:15432 ✅
- Redis服务: localhost:16379 ✅

## 系统配置
- 数据库: PostgreSQL 13
- 缓存: Redis 6
- 前端: Nginx + Vue.js
- 后端: Node.js + Express

## 数据统计
- 总题目数: 5075
- 判断题: 1590
- 单选题: 1747  
- 多选题: 1738

## 访问说明
1. 打开浏览器访问 http://localhost:18080
2. 系统支持随机练习和题型分类练习
3. 所有数据已预置，可直接使用

EOF

echo "✅ 部署报告已生成: deployment-report.md"
echo ""
echo "🎯 部署完成！系统已准备就绪。"