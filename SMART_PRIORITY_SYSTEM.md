# 智能备考优先级系统实现方案

**创建时间**: 2026-04-01
**目标**: 根据密评考试要求优化练习优先级，提高备考效率

---

## 📊 密评考试要求

### 考核内容与占比

| 考核内容 | 考试占比 | 建议练习题数 | 优先级 |
|---------|---------|-------------|--------|
| 💼 密码应用与安全性评估实务综合 | 30% | 题库×30% | 最高 |
| 🔐 密码技术基础及相关标准 | 20% | 题库×20% | 高 |
| 🛡️ 密码产品原理、应用及相关标准 | 20% | 题库×20% | 高 |
| 📋 密评理论、技术及相关标准 | 20% | 题库×20% | 高 |
| ⚖️ 密码政策法规 | 10% | 题库×10% | 中 |

### 题型与分值

| 题型 | 题目数 | 分值 | 占总分 | 建议用时 |
|------|--------|------|--------|---------|
| 多项选择题 | 60题 | 1分/题 | 60分 | 50分钟 |
| 单项选择题 | 60题 | 0.5分/题 | 30分 | 25分钟 |
| 判断题 | 20题 | 0.5分/题 | 10分 | 15分钟 |
| **总计** | **140题** | - | **100分** | **90分钟** |

---

## 🎯 智能优先级算法

### 算法原理

```
优先级分数 = 考试占比 × (1 - 掌握程度) × 紧急度系数

其中：
- 考试占比：该分类在考试中的分值占比
- 掌握程度 = (练习完成度 × 60%) + (正确率 × 40%)
- 紧急度系数：练习进度低于30%时为1.5，否则为1.0
```

### SQL实现

```sql
-- 计算各分类的优先级
WITH category_stats AS (
  SELECT
    law_category as category,
    COUNT(*) as total,
    COUNT(DISTINCT ph.question_id) as practiced,
    COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct
  FROM questions q
  LEFT JOIN (
    SELECT DISTINCT question_id, is_correct
    FROM practice_history
    WHERE user_id = 'exam_user_001'
  ) ph ON q.id = ph.question_id
  WHERE q.law_category IS NOT NULL
  GROUP BY q.law_category
),
priority_calc AS (
  SELECT
    category,
    total,
    practiced,
    correct,
    -- 练习完成度
    ROUND(100.0 * practiced / NULLIF(total, 0), 1) as practice_ratio,
    -- 正确率
    ROUND(100.0 * correct / NULLIF(practiced, 0), 1) as accuracy,
    -- 匹配考试分类
    CASE
      WHEN category LIKE '%密码法%' OR category LIKE '%条例%' THEN '密码政策法规'
      WHEN category LIKE '%算法%' OR category LIKE '%SM%' THEN '密码技术基础及相关标准'
      WHEN category LIKE '%密评%' OR category LIKE '%评估%' THEN '密评理论、技术及相关标准'
      WHEN category LIKE '%产品%' OR category LIKE '%应用%' THEN '密码产品原理、应用及相关标准'
      ELSE '密码应用与安全性评估实务综合'
    END as exam_category
  FROM category_stats
)
SELECT
  *,
  -- 掌握程度 (0-100)
  (practice_ratio * 0.6 + accuracy * 0.4) as mastery_level,
  -- 考试占比
  CASE exam_category
    WHEN '密码政策法规' THEN 10
    WHEN '密码技术基础及相关标准' THEN 20
    WHEN '密码产品原理、应用及相关标准' THEN 20
    WHEN '密评理论、技术及相关标准' THEN 20
    WHEN '密码应用与安全性评估实务综合' THEN 30
  END as exam_weight,
  -- 优先级等级
  CASE
    WHEN (practice_ratio * 0.6 + accuracy * 0.4) < 30 THEN 'critical'
    WHEN (practice_ratio * 0.6 + accuracy * 0.4) < 60 THEN 'high'
    WHEN (practice_ratio * 0.6 + accuracy * 0.4) < 80 THEN 'medium'
    ELSE 'low'
  END as priority_level
FROM priority_calc
ORDER BY mastery_level ASC;
```

---

## 🚀 实现方案

### 方案1: 直接在数据库中添加优先级视图

```sql
-- 创建优先级视图
CREATE OR REPLACE VIEW v_category_priority AS
WITH category_stats AS (
  SELECT
    law_category as category,
    COUNT(*) as total,
    COUNT(DISTINCT ph.question_id) as practiced,
    COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct
  FROM questions q
  LEFT JOIN (
    SELECT DISTINCT question_id, is_correct, user_id
    FROM practice_history
  ) ph ON q.id = ph.question_id
  WHERE q.law_category IS NOT NULL
  GROUP BY q.law_category, ph.user_id
)
SELECT
  category,
  total,
  practiced,
  correct,
  ROUND(100.0 * practiced / NULLIF(total, 0), 1) as practice_ratio,
  ROUND(100.0 * correct / NULLIF(practiced, 0), 1) as accuracy,
  (100.0 * practiced / NULLIF(total, 0) * 0.6 + 100.0 * correct / NULLIF(practiced, 0) * 0.4) as mastery_level
FROM category_stats;
```

### 方案2: 前端计算优先级

在前端组件中实现优先级计算逻辑：

```javascript
// 优先级计算函数
function calculatePriority(stat) {
  const examWeights = {
    '密码政策法规': 0.10,
    '密码技术基础及相关标准': 0.20,
    '密码产品原理、应用及相关标准': 0.20,
    '密评理论、技术及相关标准': 0.20,
    '密码应用与安全性评估实务综合': 0.30
  };

  // 匹配考试分类
  let examCategory = '密码应用与安全性评估实务综合';
  for (const [key, weight] of Object.entries(examWeights)) {
    if (stat.category.includes(key.split(' ')[0])) {
      examCategory = key;
      break;
    }
  }

  // 计算掌握程度
  const practice_ratio = stat.total > 0 ? stat.practiced / stat.total : 0;
  const accuracy = stat.practiced > 0 ? stat.correct / stat.practiced : 0;
  const mastery_level = (practice_ratio * 0.6) + (accuracy * 0.4);

  // 计算优先级分数
  const priority_score = examWeights[examCategory] * (1 - mastery_level);

  // 确定优先级等级
  let level = 'low';
  if (priority_score >= 0.15) level = 'critical';
  else if (priority_score >= 0.10) level = 'high';
  else if (priority_score >= 0.05) level = 'medium';

  return {
    ...stat,
    exam_category,
    priority_score,
    level,
    mastery_level: Math.round(mastery_level * 100),
    exam_weight: examWeights[examCategory]
  };
}
```

---

## 📱 前端实现

### 1. 修复数据同步问题

**问题**: 文档页面的统计数据未同步更新

**原因**: 文档列表API使用了独立的统计查询，没有使用统一统计API

**解决方案**:

```javascript
// DocumentReview.vue
async loadDocuments() {
  const userId = this.getUserId();

  // 方案1: 使用统一统计API
  const statsRes = await axios.get(`/api/v2/stats/user/${userId}`);
  const documents = statsRes.data.by_document;

  // 添加文档元数据
  this.documents = documents.map(doc => {
    const docInfo = DOCUMENT_CATEGORIES[doc.document_name];
    return {
      ...doc,
      icon: docInfo?.icon || '📄',
      color: docInfo?.color || '#6b7280',
      description: docInfo?.description || '',
      category_label: docInfo?.category || '其他',
      // 确保数据格式正确
      total_questions: parseInt(doc.total),
      practiced_questions: parseInt(doc.practiced),
      correct_questions: parseInt(doc.correct),
      accuracy: doc.total > 0
        ? Math.round((doc.correct / doc.total) * 100 * 10) / 10
        : '0.0'
    };
  });
}
```

### 2. 添加优先级显示

在分类练习、文档复习等页面添加优先级标识：

```vue
<!-- 优先级标识 -->
<div v-if="category.level === 'critical'" class="priority-badge critical">
  🔴 急需加强
</div>
<div v-else-if="category.level === 'high'" class="priority-badge high">
  🟠 优先练习
</div>
<div v-else-if="category.level === 'medium'" class="priority-badge medium">
  🟡 继续保持
</div>
<div v-else class="priority-badge low">
  🟢 掌握良好
</div>

<!-- 显示考试占比 -->
<div class="exam-weight">
  占考试 {{ category.exam_weight * 100 }}%
</div>

<!-- 显示推荐练习数 -->
<div class="recommendation">
  建议再练 {{ category.recommended_count }} 题
</div>
```

### 3. 添加智能推荐卡片

在首页添加智能推荐：

```vue
<div class="smart-recommendation-card">
  <h3>🎯 今日推荐</h3>

  <div v-if="focusArea" class="focus-area">
    <div class="focus-icon">{{ focusArea.icon }}</div>
    <div class="focus-content">
      <h4>{{ focusArea.exam_category }}</h4>
      <p>{{ focusArea.reason }}</p>
    </div>
    <button @click="startRecommendedPractice" class="btn-start">
      开始练习
    </button>
  </div>

  <div class="recommendation-list">
    <div v-for="item in recommendations" :key="item.category" class="recommendation-item">
      <span class="item-icon">{{ item.icon }}</span>
      <span class="item-name">{{ item.category }}</span>
      <span class="item-priority">{{ item.level }}</span>
    </div>
  </div>
</div>
```

---

## 🔧 数据一致性保证

### 核心原则

**练习、分类、文档都是练习，数据要一致并同步共享**

### 实现方案

1. **统一数据源**: 所有页面使用 `/api/v2/stats/user/:userId`
2. **实时更新**: 练习后重新获取统计数据
3. **去重逻辑**: 所有统计使用 `COUNT(DISTINCT question_id)`

### 数据同步流程

```
用户答题
  ↓
记录到 practice_history 表
  ↓
触发统计更新事件
  ↓
所有订阅组件重新获取 /api/v2/stats/user/:userId
  ↓
前端界面自动更新
```

---

## 📊 当前数据状态

### 分类统计（exam_user_001）

| 分类 | 总题数 | 已练 | 正确率 | 练习度 | 考试分类 |
|------|--------|------|--------|--------|---------|
| 密码法 | 156 | 12 | 100% | 7.7% | 密码政策法规 |
| 商用密码管理条例 | 802 | 8 | 100% | 1.0% | 密码政策法规 |
| 密码检测与评估 | 620 | 7 | 100% | 1.1% | 密评理论技术 |
| 密码标准与规范 | 1937 | 2 | 100% | 0.1% | 密评理论技术 |

### 优先级推荐

根据当前数据，优先级从高到低：

1. **密码标准与规范** (1937题，已练2题，0.1%)
   - 考试分类：密评理论技术（20%）
   - 优先级：🔴 **急需加强**

2. **商用密码管理条例** (802题，已练8题，1.0%)
   - 考试分类：密码政策法规（10%）
   - 优先级：🟠 **优先练习**

3. **密码检测与评估** (620题，已练7题，1.1%)
   - 考试分类：密评理论技术（20%）
   - 优先级：🟠 **优先练习**

---

## ✅ 实施步骤

### 立即可做

1. ✅ **已完成题目标注** - 所有5075题已标注exam_category
2. 🔨 **修复文档数据同步** - 使用统一统计API
3. 🔨 **添加优先级显示** - 在各页面显示优先级标识
4. 🔨 **创建智能推荐卡片** - 首页显示今日推荐

### 优化建议

1. **题型优先级**: 多选题占60分，应优先练习
2. **错题优先**: 错题优先级高于未练习题目
3. **时间分配**: 根据考试时间分配练习时间
   - 多选题：50分钟（60分）
   - 单选题：25分钟（30分）
   - 判断题：15分钟（10分）

---

## 💡 使用建议

### 高效备考策略

1. **优先练习高占比分类**
   - 密码应用实务综合（30%）→ 每天必练
   - 密码技术基础（20%）→ 重点练习
   - 密评理论技术（20%）→ 重点练习

2. **题型分配策略**
   - 多选题最重要（60分）→ 每天至少练20题
   - 单选题次之（30分）→ 每天至少练15题
   - 判断题最少（10分）→ 每天至少练5题

3. **练习顺序**
   - 先练未练习过的题目
   - 再练错题
   - 最后巩固已掌握的

---

现在系统已经具备了完整的数据基础，可以开始实施智能优先级推荐功能！
