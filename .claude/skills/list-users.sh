#!/bin/bash
# 查看数据库中的用户列表
# 使用方法：/list-users

echo "=== 数据库用户列表 ==="
echo ""

docker exec exam-prep-system-package-20260330-db-1 psql -U exam_user -d exam_db -c "
SELECT
  u.id,
  u.username,
  u.display_name,
  u.role,
  u.is_active,
  COALESCE(up.total_practiced, 0) as practiced_count,
  COALESCE(up.total_correct, 0) as correct_count,
  CASE
    WHEN up.total_practiced > 0 THEN
      ROUND((up.total_correct::float / up.total_practiced) * 100, 1)
    ELSE 0
  END as accuracy_rate
FROM users u
LEFT JOIN user_progress up ON u.username = up.user_id
ORDER BY u.id;
"

echo ""
echo "💡 重置密码:"
echo "   docker exec -it exam-prep-system-package-20260330-db-1 psql -U exam_user -d exam_db -c \"UPDATE users SET password_hash = '\\\\$2a\\$10\\$xxx...' WHERE username='xxx';\""
