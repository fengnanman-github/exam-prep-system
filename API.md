# 🔌 密评备考系统 API 文档

## 基础信息

- **Base URL**: `http://localhost:13000/api`
- **数据格式**: JSON
- **字符编码**: UTF-8
- **版本**: v1.2.0

---

## 📋 目录

1. [基础API](#基础api)
2. [分类管理API](#分类管理api)
3. [练习历史API](#练习历史api)
4. [进度统计API](#进度统计api)
5. [智能复习API](#智能复习api)
6. [模拟考试API](#模拟考试api)
7. [题目收藏API](#题目收藏api)
8. [成绩导出API](#成绩导出api)

---

## 基础API

### 健康检查

```http
GET /health
```

**响应示例**:
```json
{
  "status": "ok",
  "service": "exam-prep-backend",
  "timestamp": "2026-03-30T10:00:00.000Z",
  "version": "1.0.0"
}
```

### 获取统计信息

```http
GET /api/stats
```

**响应示例**:
```json
{
  "totalQuestions": 26,
  "judgeQuestions": 7,
  "singleChoice": 12,
  "multiChoice": 7
}
```

### 获取随机题目

```http
GET /api/questions/random
```

**响应示例**:
```json
{
  "id": 1,
  "question_no": "J001",
  "question_type": "判断题",
  "question_text": "商用密码产品必须通过国家密码管理局审批后方可生产。",
  "option_a": "正确",
  "option_b": "错误",
  "correct_answer": "A",
  "category": "密码产品",
  "difficulty": "medium"
}
```

### 按类型获取题目

```http
GET /api/questions/by-type/:type
```

**参数**:
- `type`: 题型，可选值: `judge`, `single`, `multi`

---

## 分类管理API

### 获取所有分类

```http
GET /api/v2/categories
```

**响应示例**:
```json
[
  {
    "category": "密码算法",
    "total_count": "9",
    "easy_count": "5",
    "medium_count": "4",
    "hard_count": "0"
  }
]
```

### 按分类获取题目

```http
GET /api/v2/questions/category/:category?difficulty=medium&limit=10
```

**路径参数**:
- `category`: 分类名称

**查询参数**:
- `difficulty`: 难度级别 (可选)
- `limit`: 返回数量 (默认10)

**响应示例**:
```json
[
  {
    "id": 1,
    "question_no": "S001",
    "category": "密码算法",
    "difficulty": "medium",
    "question_text": "以下哪种算法是对称加密算法？",
    "option_a": "RSA",
    "option_b": "DES",
    "option_c": "ECC",
    "option_d": "DSA",
    "correct_answer": "B"
  }
]
```

### 获取分类统计

```http
GET /api/v2/stats/category/:category?user_id=exam_user_001
```

**响应示例**:
```json
{
  "total_questions": 9,
  "practiced_count": 5,
  "correct_count": 4,
  "accuracy_rate": 80.00
}
```

---

## 练习历史API

### 记录练习历史

```http
POST /api/v2/practice/history
Content-Type: application/json

{
  "user_id": "exam_user_001",
  "question_id": 1,
  "user_answer": "A",
  "is_correct": true,
  "time_spent": 15,
  "practice_mode": "random"
}
```

**请求参数**:
- `user_id`: 用户ID (必填)
- `question_id`: 题目ID (必填)
- `user_answer`: 用户答案 (必填)
- `is_correct`: 是否正确 (必填)
- `time_spent`: 答题用时(秒) (可选)
- `practice_mode`: 练习模式 (可选，默认random)
  - `random`: 随机练习
  - `category`: 分类练习
  - `exam`: 考试
  - `wrong`: 错题练习
  - `review`: 复习

**响应示例**:
```json
{
  "id": 1,
  "user_id": "exam_user_001",
  "question_id": 1,
  "user_answer": "A",
  "is_correct": true,
  "time_spent": 15,
  "practice_mode": "random",
  "practiced_at": "2026-03-30T10:00:00.000Z"
}
```

### 获取练习历史

```http
GET /api/v2/practice/history/:userId?limit=50&mode=random
```

**查询参数**:
- `limit`: 返回数量 (默认50)
- `offset`: 偏移量 (默认0)
- `mode`: 练习模式 (可选)

**响应示例**:
```json
[
  {
    "id": 1,
    "user_id": "exam_user_001",
    "question_id": 1,
    "user_answer": "A",
    "is_correct": true,
    "question_no": "J001",
    "question_type": "判断题",
    "category": "密码产品",
    "question_text": "商用密码产品必须通过国家密码管理局审批后方可生产。",
    "correct_answer": "A",
    "practiced_at": "2026-03-30T10:00:00.000Z"
  }
]
```

---

## 进度统计API

### 获取用户总体进度

```http
GET /api/v2/progress/:userId
```

**响应示例**:
```json
{
  "user_id": "exam_user_001",
  "total_practiced": 100,
  "total_correct": 80,
  "total_wrong": 20,
  "current_streak": 15,
  "best_streak": 25,
  "practice_days": 7,
  "last_practice_date": "2026-03-30",
  "total_questions": 26,
  "unique_practiced": 20
}
```

### 获取分类进度

```http
GET /api/v2/progress/:userId/category
```

**响应示例**:
```json
[
  {
    "category": "密码算法",
    "total_count": 9,
    "practiced_count": 5,
    "correct_count": 4,
    "accuracy_rate": 80.00
  }
]
```

### 获取学习曲线

```http
GET /api/v2/progress/:userId/chart?days=7
```

**查询参数**:
- `days`: 天数 (默认7)

**响应示例**:
```json
[
  {
    "date": "2026-03-30",
    "total_count": 20,
    "correct_count": 16,
    "avg_time": 15.5
  }
]
```

---

## 智能复习API

### 提交复习结果

```http
POST /api/v2/review/submit
Content-Type: application/json

{
  "user_id": "exam_user_001",
  "question_id": 1,
  "quality": 4
}
```

**质量评分说明**:
- `5`: 完美记忆 - 完全记住，立即回答
- `4`: 正确但犹豫 - 记住但需要思考
- `3`: 勉强正确 - 有些模糊
- `2`: 模糊记忆 - 有印象但不确定
- `1`: 错误但有印象 - 见过但不记得
- `0`: 完全忘记 - 没有任何印象

**响应示例**:
```json
{
  "message": "继续加油！下次复习时间已更新",
  "result": {
    "question_id": 1,
    "next_review_time": "2026-04-05T10:00:00.000Z",
    "review_interval": 6,
    "ease_factor": 2.4,
    "mastery_level": 0.65
  },
  "next_review_days": 6,
  "mastered": false
}
```

### 获取今日待复习题目

```http
GET /api/v2/review/today/:userId
```

**响应示例**:
```json
[
  {
    "id": 1,
    "question_id": 1,
    "question_no": "J001",
    "category": "密码产品",
    "question_text": "商用密码产品必须通过国家密码管理局审批后方可生产。",
    "mastery_level": 0.3,
    "review_count": 2
  }
]
```

### 获取复习统计

```http
GET /api/v2/review/stats/:userId
```

**响应示例**:
```json
{
  "total_review_questions": 50,
  "due_today": 10,
  "pending_review": 40,
  "average_mastery": 65.5,
  "mastered_count": 20
}
```

### 获取推荐复习题目

```http
GET /api/v2/review/recommend/:userId?limit=10
```

**响应示例**:
```json
[
  {
    "question_id": 1,
    "question_no": "J001",
    "category": "密码产品",
    "hours_until_review": -2,  // 负数表示已过期
    "mastery_level": 0.3
  }
]
```

### 获取遗忘曲线

```http
GET /api/v2/review/curve/:userId
```

**响应示例**:
```json
[
  {
    "date": "2026-03-30",
    "review_count": 15,
    "avg_mastery": 68.5
  }
]
```

---

## 模拟考试API

### 创建考试

```http
POST /api/v2/exam
Content-Type: application/json

{
  "user_id": "exam_user_001",
  "exam_name": "模拟测试",
  "config": {
    "total_questions": 20,
    "categories": [
      {"category": "密码算法", "count": 5},
      {"category": "密码协议", "count": 5}
    ]
  }
}
```

**响应示例**:
```json
{
  "exam": {
    "id": 1,
    "exam_name": "模拟测试",
    "total_questions": 20,
    "started_at": "2026-03-30T10:00:00.000Z"
  },
  "questions": [1, 2, 3, ...]
}
```

### 提交考试答案

```http
POST /api/v2/exam/:examId/submit
Content-Type: application/json

{
  "answers": [
    {"question_id": 1, "user_answer": "A"},
    {"question_id": 2, "user_answer": "B"}
  ],
  "time_spent": 600
}
```

**响应示例**:
```json
{
  "exam": {
    "id": 1,
    "score": 85.5,
    "correct_count": 17,
    "wrong_count": 3,
    "time_spent": 600
  },
  "answers": [
    {
      "question_id": 1,
      "user_answer": "A",
      "correct_answer": "A",
      "is_correct": true
    }
  ],
  "summary": {
    "total": 20,
    "correct": 17,
    "wrong": 3,
    "score": 85
  }
}
```

### 获取考试记录

```http
GET /api/v2/exam/:userId?limit=10
```

**响应示例**:
```json
[
  {
    "id": 1,
    "exam_name": "模拟测试",
    "total_questions": 20,
    "correct_count": 17,
    "wrong_count": 3,
    "score": 85,
    "time_spent": 600,
    "started_at": "2026-03-30T10:00:00.000Z",
    "finished_at": "2026-03-30T10:10:00.000Z"
  }
]
```

---

## 题目收藏API

### 添加收藏

```http
POST /api/v2/favorite
Content-Type: application/json

{
  "user_id": "exam_user_001",
  "question_id": 1,
  "notes": "重点题目"
}
```

**响应示例**:
```json
{
  "id": 1,
  "user_id": "exam_user_001",
  "question_id": 1,
  "notes": "重点题目",
  "created_at": "2026-03-30T10:00:00.000Z"
}
```

### 获取收藏列表

```http
GET /api/v2/favorite/:userId
```

**响应示例**:
```json
[
  {
    "id": 1,
    "question_id": 1,
    "question_no": "J001",
    "category": "密码产品",
    "question_text": "商用密码产品必须通过国家密码管理局审批后方可生产。",
    "notes": "重点题目",
    "created_at": "2026-03-30T10:00:00.000Z"
  }
]
```

### 删除收藏

```http
DELETE /api/v2/favorite/:userId/:questionId
```

**响应示例**:
```json
{
  "message": "删除成功"
}
```

---

## 成绩导出API

### 导出学习报告

```http
GET /api/v2/export/:userId?format=json
```

**查询参数**:
- `format`: 导出格式 (json)

**响应示例**:
```json
{
  "user_id": "exam_user_001",
  "generated_at": "2026-03-30T10:00:00.000Z",
  "progress": {
    "total_practiced": 100,
    "total_correct": 80,
    "practice_days": 7
  },
  "category_progress": [...],
  "exam_history": [...]
}
```

**响应头**:
```
Content-Type: application/json
Content-Disposition: attachment; filename=study_report_exam_user_001_1234567890.json
```

---

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "error": "错误描述信息"
}
```

---

## 📝 更新日志

### v1.2.0 (2026-03-30)

- ✨ 新增题目分类系统API
- ✨ 新增练习历史记录API
- ✨ 新增学习进度统计API
- ✨ 新增智能复习算法API
- ✨ 新增模拟考试API
- ✨ 新增题目收藏API
- ✨ 新增成绩导出API

---

**密评备考系统 API Documentation**
*Version 1.2.0*
