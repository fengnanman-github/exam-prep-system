#!/bin/bash
# 管理员配置管理功能演示脚本

BASE_URL="http://localhost:13000"
TOKEN="your-admin-token-here"  # 需要替换为实际的管理员token

echo "========================================="
echo "管理员配置管理功能演示"
echo "========================================="
echo ""

# 1. 健康检查
echo "1. 配置健康检查"
echo "GET /api/v2/public/admin-config/health"
curl -s "$BASE_URL/api/v2/public/admin-config/health" | jq '.'
echo ""
echo ""

# 2. 获取所有题目范围配置
echo "2. 获取所有题目范围配置（需要管理员token）"
echo "GET /api/v2/admin/question-scopes"
echo "注意: 需要在请求头中添加: Authorization: Bearer $TOKEN"
echo ""

# 3. 更新随机题目范围示例
echo "3. 更新随机题目范围示例"
echo "PUT /api/v2/admin/question-scope/random"
cat <<'EOF'
{
  "mode": "category",
  "filters": {
    "categories": ["密码政策法规", "密码技术基础及相关标准"],
    "exclude_ids": [1, 2, 3]
  }
}
EOF
echo ""
echo ""

# 4. 更新考试类别范围示例
echo "4. 更新考试类别范围示例"
echo "PUT /api/v2/admin/question-scope/exam_category"
cat <<'EOF'
{
  "mode": "exam_category",
  "filters": {
    "exam_categories": ["三级", "四级"],
    "exclude_ids": [100, 101]
  }
}
EOF
echo ""
echo ""

# 5. 自定义题目集合示例
echo "5. 自定义题目集合示例"
echo "PUT /api/v2/admin/question-scope/practice"
cat <<'EOF'
{
  "mode": "custom",
  "filters": {
    "question_ids": [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
  }
}
EOF
echo ""
echo ""

# 6. 排除特定题目示例
echo "6. 排除特定题目示例"
echo "PUT /api/v2/admin/question-scope/category"
cat <<'EOF'
{
  "mode": "all",
  "filters": {
    "exclude_ids": [1, 2, 3, 4, 5]
  }
}
EOF
echo ""
echo ""

echo "========================================="
echo "使用curl命令示例"
echo "========================================="
echo ""

echo "更新随机题目范围:"
cat <<'EOF'
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "category",
    "filters": {
      "categories": ["密码政策法规", "密码技术基础及相关标准"]
    }
  }' \
  http://localhost:13000/api/v2/admin/question-scope/random
EOF
echo ""
echo ""

echo "获取题目范围配置:"
cat <<'EOF'
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:13000/api/v2/admin/question-scopes
EOF
echo ""
echo ""

echo "========================================="
echo "配置说明"
echo "========================================="
echo ""
echo "题目范围配置模式:"
echo "  - all: 使用所有题目"
echo "  - category: 按知识点分类筛选"
echo "  - exam_category: 按考试类别筛选"
echo "  - custom: 自定义题目ID列表"
echo "  - document: 按关联文档筛选"
echo ""
echo "过滤器选项:"
echo "  - categories: 知识点分类数组"
echo "  - exam_categories: 考试类别数组"
echo "  - question_ids: 题目ID数组"
echo "  - document_ids: 文档ID数组"
echo "  - exclude_ids: 排除的ID数组（任何模式下都可用）"
echo ""
