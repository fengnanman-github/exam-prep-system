# 🔐 密评备考系统功能说明文档

## 📋 系统概述

密评备考系统 v1.2.0 是一个专业的商用密码应用安全性评估从业人员考核备考平台，提供完整的题库管理、智能练习、错题管理、进度跟踪和模拟考试功能。

### 核心特性

- 📚 **完整题库** - 5,075道精选题目，覆盖所有密评知识点
- 🎯 **智能分类** - 基于AI的题目分类：密码算法、密码协议、PKI体系、密码产品、密码管理、密码应用
- 📊 **练习记录** - 完整的练习历史记录和进度跟踪
- 🧠 **智能复习** - 基于SuperMemo SM-2算法的间隔重复系统
- 📝 **模拟考试** - 真实模拟考试环境，自动评分
- 📈 **数据分析** - 详细的学习进度和成绩分析
- 💾 **数据导出** - 支持导出学习报告

---

## 🎯 新增功能详解

### 1. 题目分类系统

系统已将所有题目按照知识点进行分类，共分为5大类：

| 分类 | 说明 | 题目数量 |
|------|------|----------|
| 密码算法 | 对称加密、非对称加密、哈希算法、国密算法等 | 9题 |
| 密码协议 | SSL/TLS、SSH、IPSec等协议 | 4题 |
| PKI体系 | 数字证书、CA、RA、证书管理等 | 5题 |
| 密码产品 | 密码产品审批、管理、应用等 | 3题 |
| 密码管理 | 密钥管理、密码政策、密评要求等 | 5题 |

#### 分类功能API

```bash
# 获取所有分类统计
GET /api/v2/categories

# 按分类获取题目
GET /api/v2/questions/category/:category?difficulty=medium&limit=10

# 获取分类学习进度
GET /api/v2/stats/category/:category?user_id=exam_user_001
```

---

### 2. 练习历史记录

系统自动记录每次练习行为，包括：
- 答题时间
- 用户答案
- 正确与否
- 练习模式
- 答题用时

#### 历史记录API

```bash
# 记录练习历史
POST /api/v2/practice/history
Body: {
  "user_id": "exam_user_001",
  "question_id": 1,
  "user_answer": "A",
  "is_correct": true,
  "time_spent": 15,
  "practice_mode": "random"
}

# 获取练习历史
GET /api/v2/practice/history/:userId?limit=50&mode=random
```

---

### 3. 学习进度统计

提供多维度学习进度统计：

#### 总体进度
- 总练习次数
- 正确/错误数量
- 当前连续答对次数
- 历史最佳连续答对次数
- 练习天数

#### 分类进度
- 各分类题目总数
- 各分类已练习数量
- 各分类正确率

#### 学习曲线
- 最近N天的练习数据
- 每日答题数量
- 每日正确率
- 平均答题用时

#### 进度统计API

```bash
# 获取总体进度
GET /api/v2/progress/:userId

# 获取分类进度
GET /api/v2/progress/:userId/category

# 获取学习曲线
GET /api/v2/progress/:userId/chart?days=7
```

---

### 4. 智能复习算法

基于**SuperMemo SM-2算法**实现的间隔重复系统(SRS)，根据用户的记忆状态智能调整复习间隔。

#### 算法特点

1. **难度因子(Ease Factor)**: 根据答题质量动态调整，范围1.3-2.5
2. **复习间隔**: 根据难度因子和复习次数计算
   - 第1次复习：1天
   - 第2次复习：6天
   - 后续：间隔 = 上次间隔 × 难度因子

3. **质量评分**:
   - 5: 完美记忆 - 可删除错题
   - 4: 正确但有犹豫 - 增加间隔
   - 3: 勉强正确 - 保持间隔
   - 2: 模糊记忆 - 减少间隔
   - 1: 错误但有印象 - 大幅减少间隔
   - 0: 完全忘记 - 重置间隔

4. **掌握度**: 0-1之间，根据答题质量累积

#### 智能复习API

```bash
# 提交复习结果
POST /api/v2/review/submit
Body: {
  "user_id": "exam_user_001",
  "question_id": 1,
  "quality": 4  // 0-5分
}

# 获取今日待复习题目
GET /api/v2/review/today/:userId

# 获取复习统计
GET /api/v2/review/stats/:userId

# 获取推荐复习题目
GET /api/v2/review/recommend/:userId?limit=10

# 获取遗忘曲线数据
GET /api/v2/review/curve/:userId
```

---

### 5. 分类练习功能

支持按分类进行专项练习：

#### 分类练习模式

1. **随机练习**: 从所有题目中随机抽取
2. **分类练习**: 按指定分类抽取题目
3. **难度练习**: 按难度级别抽取题目
4. **错题练习**: 专门练习错题
5. **复习练习**: 复习即将遗忘的题目

#### 分类练习API

```bash
# 获取题目列表（按分类）
GET /api/v2/questions/category/:category?difficulty=medium&limit=10
```

---

### 6. 模拟考试模式

真实模拟考试环境，提供完整的考试体验。

#### 考试功能

1. **创建考试**
   - 自定义考试名称
   - 配置题目数量和分类分布
   - 随机抽题

2. **答题模式**
   - 按顺序答题
   - 记录答题时间
   - 支持标记题目

3. **自动评分**
   - 自动批改
   - 生成成绩报告
   - 显示错题解析

4. **考试记录**
   - 保存所有考试记录
   - 查看历史成绩
   - 分析薄弱环节

#### 模拟考试API

```bash
# 创建考试
POST /api/v2/exam
Body: {
  "user_id": "exam_user_001",
  "exam_name": "模拟测试",
  "config": {
    "total_questions": 20,
    "categories": [
      {"category": "密码算法", "count": 5},
      {"category": "密码协议", "count": 5},
      {"category": "PKI体系", "count": 5},
      {"category": "密码管理", "count": 5}
    ]
  }
}

# 提交答案
POST /api/v2/exam/:examId/submit
Body: {
  "answers": [
    {"question_id": 1, "user_answer": "A"},
    {"question_id": 2, "user_answer": "B"}
  ],
  "time_spent": 600  // 秒
}

# 获取考试记录
GET /api/v2/exam/:userId?limit=10
```

---

### 7. 成绩导出功能

支持导出完整的学习报告，包含：

#### 导出内容

1. **总体进度**
   - 练习统计数据
   - 正确率分析
   - 学习天数统计

2. **分类进度**
   - 各分类完成情况
   - 各分类正确率
   - 薄弱环节分析

3. **考试历史**
   - 最近10次考试记录
   - 成绩趋势
   - 错题分布

4. **错题分析**
   - 错题列表
   - 错误次数
   - 复习建议

#### 导出API

```bash
# 导出学习报告（JSON格式）
GET /api/v2/export/:userId?format=json

# 响应头：Content-Disposition: attachment; filename=study_report_exam_user_001_1234567890.json
```

---

### 8. 题目收藏功能

支持收藏重要题目，方便后续复习。

#### 收藏功能API

```bash
# 添加收藏
POST /api/v2/favorite
Body: {
  "user_id": "exam_user_001",
  "question_id": 1,
  "notes": "重点题目"
}

# 获取收藏列表
GET /api/v2/favorite/:userId

# 删除收藏
DELETE /api/v2/favorite/:userId/:questionId
```

---

## 📊 数据库结构

### 新增数据表

1. **practice_history** - 练习历史记录表
2. **exam_records** - 模拟考试记录表
3. **user_progress** - 用户进度统计表
4. **favorite_questions** - 题目收藏表

### 增强数据表

1. **questions** - 添加分类字段
   - category: 题目分类
   - difficulty: 难度级别
   - knowledge_point: 知识点

2. **wrong_answers** - 添加智能复习字段
   - difficulty_level: 难度等级
   - mastery_level: 掌握程度
   - review_interval: 复习间隔
   - ease_factor: 难度因子
   - review_count: 复习次数

---

## 🚀 使用示例

### 1. 分类练习

```javascript
// 获取密码算法分类的题目
const response = await fetch('/api/v2/questions/category/密码算法?limit=10');
const questions = await response.json();

// 答题后记录
await fetch('/api/v2/practice/history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'exam_user_001',
    question_id: 1,
    user_answer: 'A',
    is_correct: true,
    practice_mode: 'category'
  })
});
```

### 2. 智能复习

```javascript
// 获取今日待复习题目
const response = await fetch('/api/v2/review/today/exam_user_001');
const questions = await response.json();

// 复习后提交评分
await fetch('/api/v2/review/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'exam_user_001',
    question_id: 1,
    quality: 4  // 记忆良好
  })
});
```

### 3. 模拟考试

```javascript
// 创建考试
const exam = await fetch('/api/v2/exam', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    exam_name: '周测',
    config: { total_questions: 20 }
  })
}).then(r => r.json());

// 答题后提交
const result = await fetch(`/api/v2/exam/${exam.exam.id}/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    answers: examAnswers,
    time_spent: 600
  })
}).then(r => r.json());

console.log(`成绩: ${result.summary.score}分`);
```

---

## 📈 系统数据统计

### 当前数据统计

- **总题目数**: 26道（测试数据）
- **题目分类**: 5个分类
- **用户总数**: 1人
- **练习记录**: 1条

### 分类分布

| 分类 | 题目数 | 简单 | 中等 | 困难 |
|------|--------|------|------|------|
| 密码算法 | 9 | 5 | 4 | 0 |
| PKI体系 | 5 | 3 | 2 | 0 |
| 密码管理 | 5 | 1 | 3 | 1 |
| 密码协议 | 4 | 2 | 2 | 0 |
| 密码产品 | 3 | 2 | 1 | 0 |

---

## 🔄 数据流程

### 练习流程

```
1. 选择练习模式（随机/分类/难度）
   ↓
2. 获取题目
   ↓
3. 用户答题
   ↓
4. 记录练习历史（practice_history）
   ↓
5. 更新用户进度（user_progress）
   ↓
6. 如果答错 → 记录到错题本（wrong_answers）
```

### 复习流程

```
1. 获取待复习题目（next_review_time <= now）
   ↓
2. 用户复习并评分（quality: 0-5）
   ↓
3. 根据SM-2算法计算新间隔
   ↓
4. 更新复习记录
   ↓
5. 如果quality >= 4 → 从错题本删除
```

### 考试流程

```
1. 创建考试（随机抽题）
   ↓
2. 用户答题（记录时间）
   ↓
3. 提交答案
   ↓
4. 自动批改
   ↓
5. 生成成绩报告
   ↓
6. 记录练习历史
```

---

## 🎯 最佳实践

### 1. 练习建议

- **每日练习**: 保持每日练习，建立学习习惯
- **分类突破**: 针对薄弱分类进行专项练习
- **及时复习**: 根据系统提示及时复习错题

### 2. 复习策略

- **质量评分**: 如实评价自己的记忆状态
- **优先复习**: 优先复习系统推荐的即将遗忘的题目
- **循环复习**: 不断复习直到掌握度达到80%以上

### 3. 考试策略

- **定期模考**: 每周进行1-2次模拟考试
- **限时训练**: 在规定时间内完成，提高答题速度
- **错题复盘**: 考试后认真复盘错题

---

## 📝 API文档

完整API文档请参考：[API.md](./API.md)

---

## 🏷️ 版本信息

- **当前版本**: v1.2.0
- **发布日期**: 2026-03-30
- **更新内容**:
  - ✨ 新增题目分类系统
  - ✨ 新增练习历史记录
  - ✨ 新增学习进度统计
  - ✨ 新增智能复习算法
  - ✨ 新增模拟考试功能
  - ✨ 新增成绩导出功能
  - ✨ 新增题目收藏功能

---

**密评备考系统 v1.2.0**
*助力商用密码应用安全性评估从业人员高效备考*
