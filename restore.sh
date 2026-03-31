#!/bin/bash

# 密评备考系统数据恢复脚本

echo "🔄 密评备考系统数据恢复"
echo "=========================="

if [ $# -eq 0 ]; then
    echo "用法: $0 <备份目录路径>"
    echo "例如: $0 backups/20240328_213000"
    exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ 备份目录不存在: $BACKUP_DIR"
    exit 1
fi

echo "🔍 检查备份文件..."

if [ ! -f "$BACKUP_DIR/exam_db.sql" ]; then
    echo "❌ 数据库备份文件不存在"
    exit 1
fi

echo "⏳ 停止服务..."
docker-compose down

echo "🔍 恢复数据库数据..."
# 启动数据库服务
docker-compose up -d db
sleep 10

# 恢复数据库
docker-compose exec -T db psql -U exam_user -d exam_db < "$BACKUP_DIR/exam_db.sql"

if [ $? -eq 0 ]; then
    echo "✅ 数据库恢复完成"
else
    echo "❌ 数据库恢复失败"
    exit 1
fi

# 恢复Redis数据（如果存在）
if [ -f "$BACKUP_DIR/redis_dump.rdb" ]; then
    echo "🔍 恢复Redis数据..."
    docker-compose stop redis
    docker cp "$BACKUP_DIR/redis_dump.rdb" exam-prep-system_redis_1:/data/dump.rdb
    docker-compose start redis
    echo "✅ Redis数据恢复完成"
fi

echo "🚀 启动所有服务..."
docker-compose up -d

sleep 30

echo "🔍 验证恢复结果..."

# 验证数据库
echo "检查题目数量..."
QUESTION_COUNT=$(docker-compose exec -T db psql -U exam_user -d exam_db -t -c "SELECT COUNT(*) FROM questions;" | tr -d '[:space:]')

echo "当前题目数量: $QUESTION_COUNT"

if [ "$QUESTION_COUNT" -eq 5075 ]; then
    echo "✅ 数据恢复验证成功"
else
    echo "⚠️ 数据恢复可能不完整，期望5075题，实际$QUESTION_COUNT题"
fi

echo ""
echo "🎯 数据恢复完成！"
echo "前端访问地址: http://localhost:18080"
echo "请验证系统功能是否正常"