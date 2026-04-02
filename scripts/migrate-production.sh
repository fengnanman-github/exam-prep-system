#!/bin/bash

# 生产环境迁移脚本
# 用于将统一核心逻辑部署到生产环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}密评备考系统 - 生产环境迁移${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}当前分支: ${CURRENT_BRANCH}${NC}"

if [[ ! "$CURRENT_BRANCH" =~ ^(main|develop|feature/unified-core-logic)$ ]]; then
  echo -e "${RED}错误: 请在 main/develop/feature/unified-core-logic 分支上执行迁移${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}步骤 1: 备份数据库${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

BACKUP_DIR="$PROJECT_ROOT/backups/production"
BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"

mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}备份数据库到: $BACKUP_FILE${NC}"
docker compose exec -T db pg_dump -U exam_user exam_db > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ 数据库备份成功${NC}"
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "  备份大小: $BACKUP_SIZE"
else
  echo -e "${RED}✗ 数据库备份失败${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}步骤 2: 数据库迁移${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${BLUE}执行统一核心逻辑迁移...${NC}"

# 使用psql执行迁移
docker compose exec -T db psql -U exam_user -d exam_db <<'EOF'
-- 创建功能开关表
CREATE TABLE IF NOT EXISTS feature_flags (
    feature_name VARCHAR(100) PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT false,
    enabled_for_users TEXT[],
    enabled_percentage INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置（默认关闭）
INSERT INTO feature_flags (feature_name, is_enabled, description) VALUES
('unified_question_state', false, '统一题目状态 - 所有练习模式共享题目状态'),
('unified_supermemo', false, '统一遗忘算法 - 所有练习模式应用SuperMemo算法'),
('unified_stats', false, '统一统计数据 - 按考试类别综合计算进度和正确率')
ON CONFLICT (feature_name) DO NOTHING;

-- 创建性能优化索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_history_user_question_latest
ON practice_history(user_id, question_id, practiced_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wrong_answers_review_time
ON wrong_answers(user_id, next_review_time) WHERE next_review_time IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wrong_answers_mastery
ON wrong_answers(user_id, mastery_level) WHERE mastery_level IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uncertain_questions_user_question
ON uncertain_questions(user_id, question_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorite_questions_user_question
ON favorite_questions(user_id, question_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_exam_category
ON questions(exam_category) WHERE exam_category IS NOT NULL;

-- 创建设置当前用户ID的函数
CREATE OR REPLACE FUNCTION set_current_user(user_id VARCHAR)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id, false);
END;
$$ LANGUAGE plpgsql;

-- 创建更新触发器函数
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用触发器
DROP TRIGGER IF EXISTS trigger_update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trigger_update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_flags_updated_at();
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ 数据库迁移成功${NC}"
else
  echo -e "${RED}✗ 数据库迁移失败${NC}"
  echo -e "${YELLOW}回滚数据库...${NC}"
  docker compose exec -T db psql -U exam_user -d exam_db < "$BACKUP_FILE"
  exit 1
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}步骤 3: 重启后端服务${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${BLUE}重启后端服务以应用新代码...${NC}"
docker compose up -d --build backend

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ 后端服务重启成功${NC}"
else
  echo -e "${RED}✗ 后端服务重启失败${NC}"
  exit 1
fi

# 等待服务启动
echo -e "${BLUE}等待服务启动...${NC}"
sleep 10

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}步骤 4: 验证迁移${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 检查后端健康状态
HEALTH_CHECK=$(curl -s http://localhost:13000/health || echo '{"status":"error"}')
if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✓ 后端服务健康检查通过${NC}"
else
  echo -e "${RED}✗ 后端服务健康检查失败${NC}"
  echo "响应: $HEALTH_CHECK"
fi

# 检查新API端点
VERSION_CHECK=$(curl -s "http://localhost:13000/api/v2/version/config?user_id=test_user_1" || echo '{"error":"error"}')
if echo "$VERSION_CHECK" | grep -q '"version"'; then
  echo -e "${GREEN}✓ 版本管理API正常${NC}"
else
  echo -e "${RED}✗ 版本管理API异常${NC}"
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}步骤 5: 配置灰度发布${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${BLUE}当前功能开关状态：${NC}"
docker compose exec -T db psql -U exam_user -d exam_db -c "
SELECT feature_name, is_enabled, enabled_percentage
FROM feature_flags
ORDER BY feature_name;
" 2>/dev/null || echo "查询失败"

echo ""
echo -e "${BLUE}灰度发布建议：${NC}"
echo ""
echo "1. 白名单测试（1-3天）："
echo "   UPDATE feature_flags"
echo "   SET enabled_for_users = ARRAY['test_user_1', 'test_user_2']"
echo "   WHERE feature_name = 'unified_question_state';"
echo ""
echo "2. 小范围灰度（3-5天）："
echo "   UPDATE feature_flags"
echo "   SET enabled_percentage = 10"
echo "   WHERE feature_name = 'unified_question_state';"
echo ""
echo "3. 逐步扩大灰度（每周）："
echo "   10% → 25% → 50% → 100%"
echo ""
echo "4. 全量发布："
echo "   UPDATE feature_flags"
echo "   SET is_enabled = true;"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}生产环境迁移完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${YELLOW}下一步操作：${NC}"
echo "1. 监控应用日志和错误率"
echo "2. 使用API设置功能开关进行灰度发布"
echo "3. 收集用户反馈"
echo "4. 根据反馈调整发布策略"
echo ""
echo -e "${YELLOW}回滚命令：${NC}"
echo "  $ scripts/rollback-production.sh"
echo ""
echo -e "${YELLOW}备份位置：${NC}"
echo "  $BACKUP_FILE"
