#!/bin/bash

echo "📊 初始化密评备考系统数据..."

# 等待数据库启动
sleep 10

# 检查数据库连接
echo "检查数据库连接..."
until docker-compose exec db pg_isready -U exam_user -d exam_db; do
    echo "等待数据库启动..."
    sleep 5
done

echo "✅ 数据库连接正常"

# 初始化数据库表
echo "初始化错题管理表..."
docker-compose exec -T db psql -U exam_user -d exam_db < backend/init-db.sql

echo "系统数据已预置，包含5075道题目"
echo "- 判断题: 1590题"
echo "- 单选题: 1747题"
echo "- 多选题: 1738题"

echo "🎯 数据初始化完成"
