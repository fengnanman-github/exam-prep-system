#!/bin/bash
# 备份并重置学习数据脚本
# 使用方法: bash reset-learning-data.sh

set -e

DB_CONTAINER="exam-prep-system-package-20260330-db-1"
DB_USER="exam_user"
DB_NAME="exam_db"
BACKUP_DIR="/tmp/exam-prep-backup-$(date +%Y%m%d_%H%M%S)"

echo "========================================="
echo "🔄 密评备考系统 - 学习数据重置"
echo "========================================="
echo ""

# 创建备份目录
echo "📦 创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 备份数据
echo "💾 备份学习数据..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -t \
  practice_history wrong_answers exam_records favorite_questions user_progress \
  > "$BACKUP_DIR/learning_data_backup.sql" 2>&1 || true

if [ -f "$BACKUP_DIR/learning_data_backup.sql" ]; then
  SIZE=$(du -h "$BACKUP_DIR/learning_data_backup.sql" | cut -f1)
  echo "✅ 备份完成: $BACKUP_DIR/learning_data_backup.sql ($SIZE)"
else
  echo "⚠️  警告: 备份文件未创建，继续执行重置..."
fi

echo ""
echo "⚠️  即将删除以下学习数据："
echo "  - 练习历史 (practice_history)"
echo "  - 错题记录 (wrong_answers)"
echo "  - 考试记录 (exam_records)"
echo "  - 收藏题目 (favorite_questions)"
echo "  - 用户进度 (user_progress)"
echo ""

# 确认重置
read -p "确认要重置所有学习数据吗？(输入 YES 确认): " confirm

if [ "$confirm" != "YES" ]; then
  echo "❌ 操作已取消"
  exit 0
fi

echo ""
echo "🗑️  开始重置学习数据..."

# 执行重置
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'
-- 重置学习数据
TRUNCATE TABLE practice_history CASCADE;
TRUNCATE TABLE wrong_answers CASCADE;
TRUNCATE TABLE exam_records CASCADE;
TRUNCATE TABLE favorite_questions CASCADE;
TRUNCATE TABLE user_progress CASCADE;

-- 重置序列（如果有的话）
ALTER SEQUENCE practice_history_id_seq RESTART WITH 1;
ALTER SEQUENCE wrong_answers_id_seq RESTART WITH 1;
ALTER SEQUENCE exam_records_id_seq RESTART WITH 1;
ALTER SEQUENCE favorite_questions_id_seq RESTART WITH 1;
ALTER SEQUENCE user_progress_id_seq RESTART WITH 1;

-- 显示重置后的统计
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 重置完成后的数据统计';
  RAISE NOTICE '========================================';

  FOR r IN
    SELECT 'practice_history' as tbl, COUNT(*) as cnt FROM practice_history
    UNION ALL
    SELECT 'wrong_answers', COUNT(*) FROM wrong_answers
    UNION ALL
    SELECT 'exam_records', COUNT(*) FROM exam_records
    UNION ALL
    SELECT 'favorite_questions', COUNT(*) FROM favorite_questions
    UNION ALL
    SELECT 'user_progress', COUNT(*) FROM user_progress
  LOOP
    RAISE NOTICE '%: % 条记录', r.tbl, r.cnt;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;
EOSQL

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 学习数据重置完成！"
  echo "📁 备份文件位置: $BACKUP_DIR"
  echo ""
  echo "🎯 现在可以开始正式备考了！"
  echo ""
  echo "📌 提示：如果需要恢复数据，可以使用以下命令："
  echo "   docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < $BACKUP_DIR/learning_data_backup.sql"
else
  echo ""
  echo "❌ 重置失败，请检查错误信息"
  echo "📁 备份文件仍在: $BACKUP_DIR"
  exit 1
fi
