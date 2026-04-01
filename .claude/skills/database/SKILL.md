---
name: database
description: 数据库操作和查询管理
author: Claude Code
---

# 数据库操作Skill

管理PostgreSQL数据库的连接、查询和操作。

## 快速连接

```bash
# 直接连接数据库
docker exec -it exam-prep-system-package-20260330-db-1 psql -U exam_user -d exam_db
```

## 常用查询

### 用户相关
```sql
-- 查看所有用户
SELECT id, username, display_name, role, is_active FROM users;

-- 查看用户统计
SELECT
  u.username,
  u.display_name,
  COALESCE(up.total_practiced, 0) as practiced,
  COALESCE(up.total_correct, 0) as correct
FROM users u
LEFT JOIN user_progress up ON u.username = up.user_id;
```

### 题目相关
```sql
-- 查看题目总数
SELECT COUNT(*) FROM questions;

-- 按考试类别统计
SELECT exam_category, COUNT(*)
FROM questions
GROUP BY exam_category;

-- 按题型统计
SELECT question_type, COUNT(*)
FROM questions
GROUP BY question_type;
```

### 练习记录
```sql
-- 查看最近的练习记录
SELECT * FROM practice_history
ORDER BY practiced_at DESC
LIMIT 10;

-- 查看用户练习统计
SELECT
  user_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_correct = true) as correct
FROM practice_history
GROUP BY user_id;
```

## 数据备份

```bash
# 备份数据库
docker exec exam-prep-system-package-20260330-db-1 pg_dump -U exam_user exam_db > backup.sql

# 恢复数据库
docker exec -i exam-prep-system-package-20260330-db-1 psql -U exam_user exam_db < backup.sql
```
