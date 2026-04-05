# 智能复习系统 - 技术设计文档

## 📋 目录
1. [系统概述](#系统概述)
2. [核心算法](#核心算法)
3. [系统架构](#系统架构)
4. [API文档](#api文档)
5. [前端组件](#前端组件)
6. [使用指南](#使用指南)

---

## 系统概述

### 设计理念
本智能复习系统结合了认知心理学、教育测量学和机器学习的最佳实践，参考以下业界标准：
- **SuperMemo SM-2算法**：波兰心理学家Piotr Woźniak开发的间隔重复算法
- **Anki算法**：基于SM-2的改进版本，更平滑的难度调整
- **Duolingo Game化设计**：连续学习激励、经验值系统
- **贝叶斯知识追踪（BKT）**：评估知识点掌握度
- **项目反应理论（IRT）**：题目难度和学生能力评估

### 核心功能
1. **智能复习调度**：基于遗忘曲线自动安排复习时间
2. **薄弱点识别**：自动识别和分类薄弱知识点
3. **个性化复习计划**：根据用户数据生成每日复习计划
4. **复习效果分析**：追踪复习效果并提供改进建议
5. **知识地图可视化**：展示知识点掌握度热力图

---

## 核心算法

### 1. 增强版SuperMemo SM-2算法

#### 质量评分系统（0-5分）
```javascript
const QUALITY_LEVELS = {
  COMPLETE_FORGOT: 0,          // 完全忘记
  INCORRECT_BUT_FAMILIAR: 1,   // 错误但有印象
  DIFFICULT_RECALL: 2,         // 困难回忆
  CORRECT_WITH_EFFORT: 3,      // 正确但需要思考
  CORRECT_WITH_HESITATION: 4,  // 正确略有犹豫
  PERFECT_RECALL: 5            // 完美记忆
}
```

#### 质量评分计算
```javascript
calculateQuality(isCorrect, timeSpent, averageTime, isUncertain)
```

**考虑因素**：
- 答题正确性
- 答题用时（与平均用时对比）
- 是否标记不确定

**评分逻辑**：
- **错误答案**（0-1分）：
  - 0分：完全忘记（用时很短）
  - 1分：有印象但不确定（用时较长）
  
- **正确答案**（2-5分）：
  - 2分：困难回忆（用时>2倍平均）
  - 3分：需要思考（用时1.2-2倍平均）
  - 4分：略有犹豫（用时0.7-1.2倍平均）
  - 5分：完美记忆（用时<0.7倍平均）
  - 标记不确定最高3分

#### 间隔计算
```javascript
calculateNextReview(state, quality)
```

**输入**：
- `ease_factor`（难度因子EF）：初始值2.5
- `review_count`（复习次数）
- `review_interval`（当前间隔I）
- `mastery_level`（掌握度）：0-1

**输出**：
- 新的难度因子：`EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))`
- 新的间隔：
  - 第1次复习：1天
  - 第2次复习：6天
  - 第N次复习：`I = I × EF`
- 新的掌握度：`ML' = ML + (q-2.5) × 0.1`

**改进点**：
1. 添加随机扰动（±10%）避免所有题目同日复习
2. EF限制在1.3-2.5之间，防止极端值
3. 掌握度平滑递增，避免剧烈波动
4. 添加置信度指标

### 2. 知识点掌握度评估

#### 评估指标
```javascript
estimateMastery(practiceHistory)
```

**计算方法**：
- **正确率**：`accuracy = correct / total`
- **最近趋势**：`recentAccuracy`（最近10次）
- **稳定性**：`stability = 1 - variance`（方差越小越稳定）
- **综合掌握度**：`level = accuracy×0.6 + recentAccuracy×0.3 + stability×0.1`
- **置信度**：`confidence = min(1, total/20)`（练习次数越多越可信）

#### 薄弱点识别
```javascript
identifyWeakPoints(knowledgePoints, threshold = 0.6)
```

**识别条件**（满足任一即视为薄弱）：
1. 掌握度 < 阈值（默认0.6）
2. 练习≥5次但正确率 < 70%
3. 最近正确率 < 整体正确率 - 20%

**优先级排序**：
```javascript
score = (1 - mastery_level) × 0.7 + urgency × 0.3
```

### 3. 复习计划生成

#### 每日复习计划
```javascript
generateDailyPlan(userData, dailyGoal = 50)
```

**计划结构**（按优先级）：
1. **紧急复习**（50%）：到期题目
2. **薄弱突破**（30%）：薄弱知识点
3. **新题学习**（20%）：未练习题目

**动态调整**：
- 根据今日已学习数量调整
- 确保每日目标可达成
- 避免过度学习导致疲劳

#### 长期复习计划
```javascript
generateLongTermPlan(userData, days = 7)
```

**预测数据**：
- 每日复习题数
- 预计用时
- 预期掌握度提升

### 4. 复习效果分析

```javascript
analyzeEffect(reviewHistory)
```

**分析维度**：
1. **整体效果**：
   - 优秀（≥90%）
   - 良好（≥70%）
   - 一般（≥50%）
   - 需要改进（<50%）

2. **趋势分析**：
   - 改进：最近正确率 > 前期 + 10%
   - 下降：最近正确率 < 前期 - 10%
   - 稳定：变化在±10%以内

3. **建议生成**：
   - 效果不佳：增加频率、调整方法
   - 效果下降：检查疲劳、调整计划
   - 效果优秀：保持节奏、增加难度

---

## 系统架构

### 后端架构

```
backend/
├── intelligent-review-engine.js    # 核心算法引擎
│   ├── EnhancedSuperMemo            # SM-2算法实现
│   ├── KnowledgeMasteryEstimator    # 掌握度评估
│   ├── ReviewPlanGenerator          # 计划生成器
│   └── ReviewEffectAnalyzer         # 效果分析器
│
├── intelligent-review-api.js        # API路由
│   ├── GET  /dashboard/:userId      # 仪表板数据
│   ├── GET  /due-questions/:userId  # 待复习题目
│   ├── POST /submit                 # 提交复习结果
│   ├── GET  /knowledge-map/:userId  # 知识图谱
│   └── GET  /recommendations/:userId # 个性化推荐
│
└── server.js                         # 服务器入口
    └── app.use('/api/v2/intelligent-review', intelligentReviewApi)
```

### 数据库设计

**supermemo_data表**（已存在）：
```sql
- ease_factor FLOAT          -- 难度因子
- review_interval INTEGER    -- 复习间隔（天）
- review_count INTEGER       -- 复习次数
- mastery_level FLOAT        -- 掌握度（0-1）
- confidence FLOAT           -- 置信度（0-1）
- quality INTEGER            -- 最后一次质量评分
- next_review_time TIMESTAMP -- 下次复习时间
- reviewed_at TIMESTAMP      -- 最后复习时间
```

**practice_history表**（已存在）：
```sql
- user_id TEXT
- question_id INTEGER
- is_correct BOOLEAN
- time_spent INTEGER         -- 答题用时（秒）
- practiced_at TIMESTAMP
```

### 前端架构

```
frontend/src/components/
└── IntelligentReview.vue     # 智能复习主组件
    ├── Dashboard View         # 仪表板视图
    │   ├── 今日目标
    │   ├── 复习计划
    │   ├── 薄弱知识点
    │   └── 效果分析
    │
    ├── Review Mode            # 复习模式
    │   ├── 题目显示
    │   ├── 答案提交
    │   ├── 结果反馈
    │   └── 质量评分
    │
    └── Completion View        # 完成页面
        ├── 统计数据
        └── 下一步操作
```

---

## API文档

### 1. 获取仪表板数据

**端点**：`GET /api/v2/intelligent-review/dashboard/:userId`

**响应**：
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_reviews": 150,
      "correct_reviews": 120,
      "today_reviews": 15,
      "due_count": 8,
      "effectiveness": 0.8
    },
    "knowledge_points": [...],
    "weak_points": [...],
    "daily_plan": {...},
    "effect_analysis": {...}
  }
}
```

### 2. 获取待复习题目

**端点**：`GET /api/v2/intelligent-review/due-questions/:userId?limit=20`

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "question_id": 123,
      "question_text": "...",
      "urgency": 0.85,
      "urgency_label": "紧急",
      "law_category": "密码法",
      "tech_category": "..."
    }
  ]
}
```

### 3. 提交复习结果

**端点**：`POST /api/v2/intelligent-review/submit`

**请求体**：
```json
{
  "user_id": "exam_user_001",
  "question_id": 123,
  "is_correct": true,
  "time_spent": 25,
  "is_uncertain": false
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "quality": 4,
    "mastered": false,
    "new_state": {
      "ease_factor": 2.6,
      "review_interval": 15,
      "mastery_level": 0.75
    },
    "message": "✓ 很好！继续保持"
  }
}
```

### 4. 知识图谱

**端点**：`GET /api/v2/intelligent-review/knowledge-map/:userId`

**响应**：
```json
{
  "success": true,
  "data": {
    "密码法": {
      "密码算法": { "total": 50, "correct": 40, "accuracy": 0.8 },
      "密钥管理": { "total": 30, "correct": 18, "accuracy": 0.6 }
    }
  }
}
```

### 5. 个性化推荐

**端点**：`GET /api/v2/intelligent-review/recommendations/:userId`

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "type": "urgent",
      "priority": 1,
      "title": "🔥 紧急复习",
      "description": "您有8道题目需要立即复习",
      "action": "开始复习",
      "reason": "基于遗忘曲线，及时复习效果最佳"
    }
  ]
}
```

---

## 前端组件

### IntelligentReview.vue

**主要功能**：
1. **仪表板展示**：
   - 今日复习目标（环形进度条）
   - 复习计划卡片（优先级排序）
   - 薄弱知识点列表
   - 复习效果分析

2. **复习模式**：
   - 题目展示（支持选择题、判断题）
   - 答案选择和提交
   - 不确定标记
   - 实时反馈
   - 质量评分显示

3. **完成页面**：
   - 复习统计
   - 正确率展示
   - 继续复习/返回首页

**关键方法**：
```javascript
// 加载仪表板数据
async loadDashboard()

// 开始复习
async startSection(section)

// 提交答案
async submitAnswer()

// 退出复习
exitReview()
```

---

## 使用指南

### 用户流程

1. **进入智能复习**：
   - 点击导航栏"⚡ 智能复习+"

2. **查看仪表板**：
   - 查看今日复习目标完成度
   - 查看复习计划（紧急复习、薄弱突破、新题学习）
   - 查看薄弱知识点列表
   - 查看复习效果分析

3. **开始复习**：
   - 选择复习计划中的任意部分开始
   - 或点击"快速开始复习"

4. **答题过程**：
   - 选择答案
   - 可选：标记"不确定"
   - 提交答案
   - 查看结果和反馈
   - 继续下一题

5. **完成复习**：
   - 查看统计数据
   - 选择继续复习或返回

### 复习策略建议

**每日复习流程**：
1. **优先完成紧急复习**（到期题目）
2. **重点突破薄弱知识点**（正确率<60%）
3. **适当学习新题**（保持进度）

**复习频率**：
- 建议每天复习：30-50题
- 连续学习：保持streak
- 时间安排：固定时间（如晚上8-9点）

**效果优化**：
- 诚实标记"不确定"
- 认真阅读解析
- 及时复习薄弱点

---

## 技术亮点

### 1. 算法优化
- ✅ 自动质量评分（基于用时和确定性）
- ✅ 随机扰动（避免同日复习）
- ✅ 掌握度平滑递增
- ✅ 置信度计算

### 2. 数据驱动
- ✅ 实时追踪学习数据
- ✅ 动态调整复习计划
- ✅ 个性化推荐
- ✅ 效果分析反馈

### 3. 用户体验
- ✅ 直观的仪表板
- ✅ 流畅的复习流程
- ✅ 实时反馈
- ✅ 移动端优化

### 4. 科学依据
- ✅ 艾宾浩斯遗忘曲线
- ✅ SuperMemo SM-2算法
- ✅ 贝叶斯知识追踪
- ✅ 认知负荷理论

---

## 未来扩展

### Phase 2：高级功能
- [ ] 知识图谱可视化（D3.js）
- [ ] 遗忘曲线图表展示
- [ ] 学习速度分析
- [ ] 个性化学习路径

### Phase 3：社交功能
- [ ] 学习小组
- [ ] 复习PK
- [ ] 成就分享
- [ ] 排行榜

### Phase 4：AI增强
- [ ] 机器学习预测遗忘时间
- [ ] 自适应难度调整
- [ ] 智能题目推荐
- [ ] 学习效果预测

---

## 参考资料

1. **SuperMemo算法**：
   - https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method

2. **艾宾浩斯遗忘曲线**：
   - Ebbinghaus, H. (1885). Memory: A contribution to experimental psychology.

3. **贝叶斯知识追踪**：
   - Corbett, A. T., & Anderson, J. R. (1995). Knowledge tracing: Modeling the acquisition of procedural knowledge.

4. **Anki算法**：
   - https://apps.ankiweb.net/docs/manual.html

5. **Duolingo Game化设计**：
   - https://blog.duolingo.com/how-duolingo-uses-ai-and-machine-learning/

---

**文档版本**：v1.0
**最后更新**：2026-04-05
**作者**：密评备考系统技术团队
