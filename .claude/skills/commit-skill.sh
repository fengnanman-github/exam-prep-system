#!/bin/bash
# Git Commit Skill
# 使用方法：git add files && git status | commit

# 检查是否有暂存的文件
STAGED=$(git diff --cached --name-only)
if [ -z "$STAGED" ]; then
  echo "❌ 没有暂存的文件，请先使用 git add 添加文件"
  exit 1
fi

# 分析变更类型并确定范围
SCOPE=""
echo "$STAGED" | grep -q "frontend/" && SCOPE="${SCOPE}前端"
echo "$STAGED" | grep -q "backend/" && SCOPE="${SCOPE}后端"
echo "$STAGED" | grep -q ".claude/" && SCOPE="${SCOPE}配置"
echo "$STAGED" | grep -q "\.md$" && SCOPE="${SCOPE}文档"

# 生成变更摘要
CHANGES=$(git diff --cached --stat | tail -1 | sed 's/^ *//')

# 生成提交信息
COMMIT_MSG="${SCOPE:-代码}优化

- ${CHANGES}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# 执行提交
git commit -m "$COMMIT_MSG"

echo "✅ 提交完成！"
echo ""
git log --oneline -1
