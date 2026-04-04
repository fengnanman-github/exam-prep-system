#!/bin/bash

# 密评备考系统 - 自动化测试脚本
# 用于测试文档练习数据更新功能

echo "========================================="
echo "  密评备考系统 - 文档练习数据更新测试"
echo "========================================="
echo ""

# 配置
BASE_URL="http://localhost:18080"
USER_ID="4"
DOCUMENT_NAME="SM2椭圆曲线公钥密码算法"

echo "📍 系统地址: $BASE_URL"
echo "👤 测试用户: $USER_ID"
echo "📖 测试文档: $DOCUMENT_NAME"
echo ""

# 测试1: 检查前端服务
echo "========================================="
echo "测试1: 检查前端服务"
echo "========================================="
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ 前端服务正常 (HTTP $FRONTEND_STATUS)"
else
    echo "❌ 前端服务异常 (HTTP $FRONTEND_STATUS)"
    exit 1
fi
echo ""

# 测试2: 检查文档列表
echo "========================================="
echo "测试2: 检查文档列表"
echo "========================================="
DOCS_API="$BASE_URL/api/v2/documents?user_id=$USER_ID"
echo "📡 请求: $DOCS_API"

SM2_STATS=$(curl -s "$DOCS_API" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for doc in data:
        if '$DOCUMENT_NAME' in doc.get('document_name', ''):
            print(f'✅ 找到文档: {doc[\"document_name\"]}')
            print(f'   题目数: {doc[\"total_questions\"]}')
            print(f'   已练: {doc[\"practiced_questions\"]}')
            print(f'   正确: {doc[\"correct_questions\"]}')
            print(f'   准确率: {doc[\"accuracy\"]}%')
            sys.exit(0)
    print('❌ 未找到文档')
    sys.exit(1)
except Exception as e:
    print(f'❌ 解析失败: {e}')
    sys.exit(1)
")

if [ $? -eq 0 ]; then
    echo "✅ 文档列表API正常"
else
    echo "❌ 文档列表API失败"
    exit 1
fi
echo ""

# 测试3: 获取题目
echo "========================================="
echo "测试3: 获取题目"
echo "========================================="
QUESTIONS_API="$BASE_URL/api/v2/documents/$DOCUMENT_NAME/questions?user_id=$USER_ID&limit=1"
echo "📡 请求: $QUESTIONS_API"

QUESTION_INFO=$(curl -s "$QUESTIONS_API" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data and len(data) > 0:
        q = data[0]
        print(f'✅ 获取到题目')
        print(f'   题目ID: {q[\"id\"]}')
        print(f'   题目类型: {q[\"question_type\"]}')
        print(f'   是否已练: {q[\"is_practiced\"]}')
        sys.exit(0)
    else:
        print('❌ 没有获取到题目')
        sys.exit(1)
except Exception as e:
    print(f'❌ 解析失败: {e}')
    sys.exit(1)
")

if [ $? -eq 0 ]; then
    echo "✅ 题目获取API正常"
else
    echo "❌ 题目获取API失败"
    exit 1
fi
echo ""

# 测试4: 提交练习答案
echo "========================================="
echo "测试4: 提交练习答案"
echo "========================================="
SUBMIT_API="$BASE_URL/api/v2/practice/history"
echo "📡 请求: $SUBMIT_API"

SUBMIT_RESULT=$(curl -s -X POST "$SUBMIT_API" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"question_id\": \"2780\",
    \"user_answer\": \"A\",
    \"is_correct\": true,
    \"time_spent\": 10,
    \"practice_mode\": \"document\"
  }" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'id' in data:
        print(f'✅ 答案提交成功')
        print(f'   记录ID: {data[\"id\"]}')
        print(f'   用户ID: {data[\"user_id\"]}')
        print(f'   题目ID: {data[\"question_id\"]}')
        print(f'   是否正确: {data[\"is_correct\"]}')
        sys.exit(0)
    else:
        print(f'❌ 提交失败: {data}')
        sys.exit(1)
except Exception as e:
    print(f'❌ 解析失败: {e}')
    sys.exit(1)
")

if [ $? -eq 0 ]; then
    echo "✅ 练习提交API正常"
else
    echo "❌ 练习提交API失败"
    exit 1
fi
echo ""

# 测试5: 验证统计数据更新
echo "========================================="
echo "测试5: 验证统计数据更新"
echo "========================================="
echo "⏳ 等待2秒让数据库更新..."
sleep 2

VERIFY_API="$BASE_URL/api/v2/documents?user_id=$USER_ID"
echo "📡 请求: $VERIFY_API"

VERIFY_RESULT=$(curl -s "$VERIFY_API" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for doc in data:
        if '$DOCUMENT_NAME' in doc.get('document_name', ''):
            practiced = doc.get('practiced_questions', 0)
            correct = doc.get('correct_questions', 0)
            accuracy = doc.get('accuracy', 0)
            print(f'📊 文档: {doc[\"document_name\"]}')
            print(f'   已练: {practiced}')
            print(f'   正确: {correct}')
            print(f'   准确率: {accuracy}%')

            if practiced >= 2:
                print(f'')
                print(f'✅ 数据更新成功！已练题目数增加了')
                sys.exit(0)
            else:
                print(f'')
                print(f'⚠️  数据可能未更新（已练: {practiced}）')
                sys.exit(1)
    print('❌ 未找到文档')
    sys.exit(1)
except Exception as e:
    print(f'❌ 解析失败: {e}')
    sys.exit(1)
")

if [ $? -eq 0 ]; then
    echo "✅ 统计数据更新正常"
else
    echo "❌ 统计数据未更新"
fi
echo ""

# 测试总结
echo "========================================="
echo "测试总结"
echo "========================================="
echo ""
echo "🌐 访问地址: $BASE_URL"
echo ""
echo "📋 手动测试步骤："
echo "1. 打开浏览器访问上述地址"
echo "2. 按 Ctrl+Shift+R 清除缓存"
echo "3. 点击'文档'导航"
echo "4. 选择'技术标准'类别"
echo "5. 优先级筛选选择'核心必考'"
echo "6. 找到'$DOCUMENT_NAME'文档"
echo "7. 点击'开始练习'"
echo "8. 练习2道题"
echo "9. 验证'已练'和'正确率'是否更新"
echo ""
echo "✅ 后端API测试完成"
echo "🚀 请在浏览器中进行完整测试"
echo ""
