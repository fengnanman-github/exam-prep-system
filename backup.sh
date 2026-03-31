#!/bin/bash

# 密评备考系统数据备份脚本

echo "📦 密评备考系统数据备份"
echo "=========================="

# 备份目录
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "🔍 备份数据库数据..."
docker-compose exec db pg_dump -U exam_user exam_db > "$BACKUP_DIR/exam_db.sql"

if [ $? -eq 0 ]; then
    echo "✅ 数据库备份完成: $BACKUP_DIR/exam_db.sql"
else
    echo "❌ 数据库备份失败"
    exit 1
fi

echo "🔍 备份Redis数据..."
docker-compose exec redis redis-cli SAVE > /dev/null
docker cp exam-prep-system_redis_1:/data/dump.rdb "$BACKUP_DIR/redis_dump.rdb"

if [ $? -eq 0 ]; then
    echo "✅ Redis备份完成: $BACKUP_DIR/redis_dump.rdb"
else
    echo "⚠️ Redis备份跳过（无数据或权限问题）"
fi

echo "🔍 备份配置文件..."
cp docker-compose.yml "$BACKUP_DIR/"
cp deploy.sh "$BACKUP_DIR/"

# 创建备份信息文件
cat > "$BACKUP_DIR/backup-info.txt" << EOF
备份时间: $(date)
备份内容:
- 数据库: exam_db (5075题目)
- Redis缓存
- 配置文件
备份大小: $(du -sh "$BACKUP_DIR" | cut -f1)
EOF

echo "✅ 配置文件备份完成"

echo ""
echo "📊 备份统计:"
echo "- 数据库文件: $BACKUP_DIR/exam_db.sql"
echo "- Redis数据: $BACKUP_DIR/redis_dump.rdb"
echo "- 配置文件: docker-compose.yml, deploy.sh"
echo "- 总大小: $(du -sh "$BACKUP_DIR" | cut -f1)"

echo ""
echo "🎯 备份完成！备份目录: $BACKUP_DIR"