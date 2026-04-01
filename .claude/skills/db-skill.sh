#!/bin/bash
# 数据库快速查询Skill
# 使用方法：db query "SELECT * FROM users LIMIT 10"

DB_NAME="exam_db"
DB_USER="exam_user"
DB_HOST="localhost"
DB_PORT="15432"
DB_CONTAINER="exam-prep-system-package-20260330-db-1"

# 检查参数
QUERY="$1"

if [ -z "$QUERY" ]; then
  echo "=== 数据库快速查询 ==="
  echo ""
  echo "用法: db query \"SQL语句\""
  echo ""
  echo "常用查询:"
  echo "  db \"SELECT COUNT(*) FROM questions\""
  echo "  db \"SELECT * FROM users LIMIT 5\""
  echo "  db \"SELECT u.username, up.total_practiced FROM users u LEFT JOIN user_progress up ON u.username = up.user_id\""
  echo ""
  echo "快速命令:"
  echo "  db users          # 查看所有用户"
  echo "  db stats          # 查看统计数据"
  echo "  db recent         # 查看最近练习"
  exit 0
fi

# 执行查询
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$QUERY"
