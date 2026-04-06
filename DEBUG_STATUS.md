# 学习曲线图表调试状态

**备份时间:** 2026-04-06 03:43:22  
**Git Commit:** e71aceb  
**状态:** 🔴 调试中 - Canvas 元素绑定问题

---

## 问题描述

**用户反馈:** 最近7天学习曲线无法显示

**错误信息:**
```
[LearningCurveChart] canvas 元素不存在，稍后重试
```

---

## 已尝试的修复方案

### 1. Chart.js 导入方式修复 ✅
- **修改:** 从 `import { Chart, registerables } from 'chart.js'` 改为 `import { Chart } from 'chart.js/auto'`
- **结果:** 解决了可能的导入冲突

### 2. 组件渲染策略调整 ✅
- **修改:** 父组件移除 `v-if="chartData.length > 0"`，让 LearningCurveChart 始终渲染
- **结果:** Canvas 元素应该存在于 DOM 中

### 3. 初始化时机优化 ✅
- **修改:** 使用 `requestAnimationFrame` 确保 DOM 完全渲染
- **结果:** 时机应该正确，但 ref 仍未绑定

### 4. 延迟重试机制 ✅
- **修改:** 添加 500ms setTimeout 重试
- **结果:** 仍然失败

---

## 当前状态分析

### 问题根源
**Vue 3 ref 在 v-show 条件下的绑定时机问题**

当组件初始渲染时，如果 `v-show="chartData && chartData.length > 0"` 条件为 false，虽然 canvas 元素存在于 DOM 中，但 `ref="chartCanvas"` 可能还没有正确绑定到 Vue 实例。

### 数据流验证
1. ✅ API 数据正常返回：`/api/v2/progress/liujialiang/chart?days=7`
2. ✅ 数据格式正确：`[{date, total_count, correct_count, avg_time}]`
3. ✅ ProgressStats 正确接收数据：`this.chartData = chartRes.data`
4. ❌ LearningCurveChart canvas ref 未绑定：`this.chartCanvas === null`

---

## 下一步调试方案（优先级排序）

### 方案 A：移除 v-show 条件（最简单）⭐⭐⭐⭐⭐
**修改文件:** `frontend/src/components/LearningCurveChart.vue`

```vue
<template>
  <div class="learning-curve-chart">
    <!-- 移除 v-show，让 canvas 始终存在 -->
    <canvas ref="chartCanvas"></canvas>
    <div v-if="!chartData || chartData.length === 0" class="empty-state-overlay">
      <p>📊 暂无学习数据</p>
    </div>
  </div>
</template>
```

**理由:** Canvas 元素始终存在于 DOM，ref 应该能正常绑定

---

### 方案 B：使用 onMounted + 延长等待时间 ⭐⭐⭐⭐
**修改文件:** `frontend/src/components/LearningCurveChart.vue`

```javascript
mounted() {
  // 使用更长的延迟确保 DOM 渲染
  this.$nextTick(() => {
    setTimeout(() => {
      this.initChart()
    }, 1000)  // 延长到 1 秒
  })
}
```

**理由:** 给予足够的时间让 Vue 完成所有 DOM 更新和 ref 绑定

---

### 方案 C：不使用 ref，直接查找 DOM ⭐⭐⭐
**修改文件:** `frontend/src/components/LearningCurveChart.vue`

```javascript
methods: {
  getCanvasElement() {
    // 不依赖 ref，直接查找 DOM
    const canvas = this.$el.querySelector('canvas')
    return canvas
  },
  
  initChart() {
    const canvas = this.getCanvasElement()
    if (!canvas) {
      console.error('[LearningCurveChart] canvas DOM 元素不存在')
      return
    }
    const ctx = canvas.getContext('2d')
    // ... 继续初始化
  }
}
```

**理由:** 绕过 Vue ref 系统，直接操作 DOM

---

### 方案 D：使用模板引用的替代方案 ⭐⭐
**修改文件:** `frontend/src/components/LearningCurveChart.vue`

```javascript
data() {
  return {
    chart: null,
    canvasReady: false  // 添加就绪标志
  }
},

mounted() {
  this.waitForCanvas()
},

methods: {
  waitForCanvas() {
    const checkCanvas = setInterval(() => {
      if (this.$refs.chartCanvas) {
        clearInterval(checkCanvas)
        this.canvasReady = true
        console.log('[LearningCurveChart] canvas 就绪')
        this.initChart()
      }
    }, 100)
    
    // 10 秒后停止检查
    setTimeout(() => clearInterval(checkCanvas), 10000)
  },
  
  initChart() {
    if (!this.canvasReady) {
      console.log('[LearningCurveChart] canvas 未就绪，等待数据')
      return
    }
    // ... 继续初始化
  }
}
```

**理由:** 轮询检查 canvas 是否就绪，而不是依赖生命周期钩子

---

### 方案 E：简化组件结构 ⭐⭐⭐⭐⭐
**修改文件:** 移除 LearningCurveChart 组件，直接在 ProgressStats 中实现

```vue
<template>
  <div class="chart-wrapper">
    <canvas ref="chartCanvas" v-show="chartData.length > 0"></canvas>
    <div v-if="chartData.length === 0" class="empty-state">
      <p>📊 暂无学习数据</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { chart: null }
  },
  watch: {
    chartData: {
      handler(newData) {
        if (newData && newData.length > 0) {
          this.$nextTick(() => {
            this.initChart()
          })
        }
      },
      immediate: true
    }
  },
  methods: {
    initChart() {
      // 直接在这里实现 Chart.js 逻辑
    }
  }
}
</script>
```

**理由:** 减少组件层级，ref 绑定更直接

---

## 已完成的修复（本次会话）

### 1. 按考试类别练习 - 答案判断逻辑 ✅
**问题:** 选对答案仍提示错误  
**修复:** 统一使用字母（A/B/C/D）而非选项文本

### 2. 按文档复习 - 路由跳转错误 ✅
**问题:** 路由名称 `practice-mode` 不存在  
**修复:** 改为正确的路由名称 `practice`

### 3. 按文档复习 - 用户ID获取错误 ✅
**问题:** 使用了不稳定的 `$root.authStore`  
**修复:** 改用标准的 `getCurrentUserId()` 方法

### 4. 按文档复习 - 数据类型统一 ✅
**问题:** accuracy 字段类型不一致（字符串/数字）  
**修复:** 统一使用数字类型

### 5. 错题本练习 - 路由跳转 ✅
**问题:** 点击练习按钮无响应  
**修复:** 改用路由导航 `router.push()`

### 6. 学习进度智能推荐 - 路由名称错误 ✅
**问题:** 路由名称 `quick-practice` 不存在  
**修复:** 改为正确的路由名称 `practice`

### 7. 智能复习提交 - user_answer 约束 ✅
**问题:** user_answer 字段为 NULL 违反约束  
**修复:** 在 INSERT 语句中添加 user_answer 字段

### 8. CustomPractice query 参数支持 ✅
**问题:** 从错题本跳转不自动开始练习  
**修复:** 同时支持 props 和 query 参数

---

## 系统整体状态

### ✅ 正常工作的功能
- 随机练习
- 分类练习
- 考试类别练习
- 专项练习复习
- 智能复习
- 错题本
- 文档复习
- 学习进度统计

### 🔴 待修复的功能
- 最近7天学习曲线图表显示

---

## 调试资源

### 测试用户
- 用户名: liujialiang
- 有7天学习数据

### API 端点
```
GET /api/v2/progress/liujialiang/chart?days=7
```

### 测试命令
```bash
curl -s "http://localhost:13000/api/v2/progress/liujialiang/chart?days=7" | jq .
```

---

## 文件修改记录

### 新建文件
- `frontend/src/components/LearningCurveChart.vue` (新建)

### 修改文件
- `frontend/src/components/ProgressStats.vue` (多次修改)
- `frontend/src/components/ExamCategoryPractice.vue` (答案判断)
- `frontend/src/components/DocumentReview.vue` (路由、用户ID、数据类型)
- `frontend/src/components/WrongAnswersBook.vue` (路由导航)
- `frontend/src/components/CustomPractice.vue` (query参数支持)
- `backend/intelligent-review-api.js` (user_answer字段)
- `backend/intelligent-review-engine.js` (类型转换)

---

## 继续工作时的建议

1. **先尝试方案A**（移除 v-show），这是最简单的方案
2. 如果方案A失败，**尝试方案E**（简化组件结构）
3. 保留详细的 console.log，便于追踪问题
4. 测试时打开浏览器开发者工具，查看 Console 和 Network 标签

---

**创建时间:** 2026-04-06 03:43  
**预计继续时间:** 2026-04-06 06:43 (3小时后)
