#!/bin/bash
# Claude Code 会话初始化Hook
# 在每个会话开始时自动加载项目状态

echo "🔐 密评备考系统"
echo ""
echo "📊 服务状态:"

# 检查容器状态
DOCKER_PS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep exam-prep)
if [ -n "$DOCKER_PS" ]; then
  echo "$DOCKER_PS"
else
  echo "  ⚠️ Docker服务未运行"
fi

echo ""
echo "✅ 快速命令:"
echo "  /restart-backend  - 重启后端"
echo "  /rebuild-frontend - 重建前端"
echo "  /check-backend    - 检查状态"
echo "  /list-users       - 查看用户"

echo ""
echo "📝 最近提交:"
git log --oneline -3 2>/dev/null || echo "  无提交记录"

echo ""
echo "💡 工作区状态:"
git status --short 2>/dev/null | head -5 || echo "  工作目录干净"
