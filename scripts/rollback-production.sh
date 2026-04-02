#!/bin/bash

# 生产环境回滚脚本
# 用于回滚到迁移前的状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${RED}========================================${NC}"
echo -e "${RED}密评备考系统 - 生产环境回滚${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# 确认回滚
echo -e "${YELLOW}⚠️  警告：此操作将回滚到迁移前的状态${NC}"
echo -e "${YELLOW}所有新功能将被禁用，但数据不会丢失${NC}"
echo ""
read -p "确认要回滚吗？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "回滚已取消"
  exit 0
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}步骤 1: 禁用所有新功能${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${BLUE}关闭功能开关...${NC}"
docker compose exec -T db psql -U exam_user -d exam_db <<'EOF'
-- 关闭所有新功能
UPDATE feature_flags
SET is_enabled = false,
    enabled_for_users = NULL,
    enabled_percentage = 0;
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ 功能开关已关闭${NC}"
else
  echo -e "${RED}✗ 关闭功能开关失败${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}步骤 2: 重启服务${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${BLUE}重启后端服务...${NC}"
docker compose restart backend

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
echo -e "${YELLOW}步骤 3: 验证回滚${NC}"
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

# 检查功能开关状态
FEATURE_CHECK=$(docker compose exec -T db psql -U exam_user -d exam_db -t -c "
  SELECT COUNT(*) FROM feature_flags WHERE is_enabled = true;
" 2>/dev/null || echo "-1")

if [ "$FEATURE_CHECK" = "0" ]; then
  echo -e "${GREEN}✓ 所有新功能已禁用${NC}"
else
  echo -e "${YELLOW}⚠️  还有 $FEATURE_CHECK 个功能未关闭${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}回滚完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${YELLOW}当前状态：${NC}"
echo "- 所有新功能已禁用"
echo "- 系统使用旧版API"
echo "- 数据未受影响"
echo ""
echo -e "${YELLOW}恢复新功能：${NC}"
echo "  $ scripts/migrate-production.sh"
echo ""
echo -e "${YELLOW}查看备份文件：${NC}"
echo "  ls -lh $PROJECT_ROOT/backups/production/"
