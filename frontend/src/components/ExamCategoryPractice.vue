<template>
  <div class="exam-category-practice">
    <!-- 顶部导航 -->
    <div class="header">
      <div class="header-left">
        <h2>🎯 按考试类别练习</h2>
        <p class="subtitle">按照密评考试大纲要求，针对性练习</p>
      </div>
      <button @click="goBack" class="btn-back">← 返回首页</button>
    </div>

    <!-- 考试说明卡片 -->
    <div class="exam-info-card">
      <h3>📋 密评考试说明</h3>
      <div class="exam-details">
        <div class="detail-item">
          <span class="label">考试时间：</span>
          <span class="value">90分钟</span>
        </div>
        <div class="detail-item">
          <span class="label">题目数量：</span>
          <span class="value">140道（单选60+多选60+判断20）</span>
        </div>
        <div class="detail-item">
          <span class="label">总分：</span>
          <span class="value">100分</span>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载考试类别...</p>
    </div>

    <!-- 考试类别列表 -->
    <div v-else class="categories-container">
      <div
        v-for="category in sortedCategories"
        :key="category.category"
        class="category-card"
        :class="{ 'high-priority': category.priorityScore > 0.15, 'selected': selectedCategory?.category === category.category }"
        @click="selectCategory(category)"
      >
        <div class="card-header">
          <div class="header-left">
            <span class="category-icon">{{ getCategoryIcon(category.category) }}</span>
            <div class="category-info">
              <h4>{{ category.category }}</h4>
              <span class="exam-weight">考试占比：{{ category.examWeight }}</span>
            </div>
          </div>
          <div class="priority-badge" v-if="category.priorityScore > 0.1">
            🔥 优先
          </div>
        </div>

        <div class="card-stats">
          <div class="stat-item">
            <span class="stat-label">题目数</span>
            <span class="stat-value">{{ category.total }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已练习</span>
            <span class="stat-value practiced">{{ category.practiced }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">正确率</span>
            <span class="stat-value" :class="getAccuracyClass(category.accuracy * 100)">
              {{ (category.accuracy * 100).toFixed(1) }}%
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">完成度</span>
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: getCompletionPercent(category) + '%' }"></div>
              </div>
              <span class="progress-text">{{ getCompletionPercent(category) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏（选择类别后显示） -->
    <div v-if="selectedCategory && !currentQuestion" class="bottom-action-bar">
      <div class="action-bar-content">
        <div class="selected-info">
          <span class="selected-icon">{{ getCategoryIcon(selectedCategory.category) }}</span>
          <div class="selected-details">
            <span class="selected-name">{{ selectedCategory.category }}</span>
            <span class="selected-stats">{{ selectedCategory.total }}题 · 已练{{ selectedCategory.practiced }}题</span>
          </div>
        </div>
        <div class="action-buttons">
          <button @click="startPractice(selectedCategory, 'new')" class="action-btn primary-btn">
            <span class="btn-icon">🆕</span>
            <span class="btn-text">练习新题</span>
          </button>
          <button @click="startPractice(selectedCategory, 'random')" class="action-btn secondary-btn">
            <span class="btn-icon">🎲</span>
            <span class="btn-text">随机练习</span>
          </button>
          <button @click="selectedCategory = null" class="action-btn cancel-btn">
            <span class="btn-icon">✕</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 练习模式 -->
    <div v-if="currentQuestion" class="practice-mode">
      <div class="practice-header">
        <h3>{{ selectedCategory?.category }}</h3>
        <div class="practice-info">
          <span>第 {{ currentIndex + 1 }}/{{ questions.length }} 题</span>
          <span>正确: {{ correctCount }}</span>
          <span>错误: {{ wrongCount }}</span>
        </div>
        <button @click="exitPractice" class="btn-exit">退出练习</button>
      </div>

      <div class="question-container">
        <div v-if="currentQuestion" class="question-card">
          <div class="question-header">
            <span class="question-type">{{ getQuestionTypeLabel(currentQuestion.question_type) }}</span>
            <span class="question-number">第 {{ currentIndex + 1 }} 题</span>
          </div>

          <div class="question-content">
            <p class="question-text">{{ currentQuestion.question_text }}</p>

            <div v-if="isChoiceQuestion()" class="options-list">
              <div
                v-for="(option, index) in getOptions()"
                :key="index"
                class="option-item"
                :class="{ 'selected': selectedAnswer === getOptionLabel(index) }"
                @click="selectAnswer(getOptionLabel(index))"
              >
                <span class="option-label">{{ getOptionLabel(index) }}</span>
                <span class="option-text">{{ option }}</span>
              </div>
            </div>

            <div v-if="currentQuestion.question_type === '判断题'" class="judge-options">
              <div
                class="judge-option"
                :class="{ 'selected': selectedAnswer === 'A' }"
                @click="selectAnswer('A')"
              >
                ✓ 正确
              </div>
              <div
                class="judge-option"
                :class="{ 'selected': selectedAnswer === 'B' }"
                @click="selectAnswer('B')"
              >
                ✗ 错误
              </div>
            </div>
          </div>

          <div class="question-actions">
            <button @click="submitAnswer" class="btn-submit" :disabled="!selectedAnswer">
              提交答案
            </button>
            <button @click="showAnswer" class="btn-show-answer">
              显示答案
            </button>
          </div>

          <div v-if="showAnswerResult" class="answer-result" :class="{ correct: isCorrect, wrong: !isCorrect }">
            <p class="result-text">
              {{ isCorrect ? '✓ 回答正确！' : '✗ 回答错误' }}
            </p>
            <p class="correct-answer">
              正确答案：{{ currentQuestion.correct_answer }}
            </p>
            <div v-if="currentQuestion.explanation" class="explanation">
              <strong>解析：</strong>{{ currentQuestion.explanation }}
            </div>
          </div>
        </div>
      </div>

      <div class="practice-navigation">
        <button @click="previousQuestion" :disabled="currentIndex === 0" class="btn-prev">
          ← 上一题
        </button>
        <button @click="nextQuestion" :disabled="currentIndex === questions.length - 1" class="btn-next">
          下一题 →
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../utils/api'
import { unifiedStateStore } from '../stores/unifiedState'
import { versionConfig } from '../config/version-config'
import { QuestionState } from '../stores/unifiedState'

const API_BASE = '/api/v2'

// 考试类别配置
const EXAM_CATEGORIES = {
  '密码应用与安全性评估实务综合': {
    weight: 0.30,
    icon: '🔧',
    color: '#ef4444',
    order: 1
  },
  '密码技术基础及相关标准': {
    weight: 0.20,
    icon: '🔐',
    color: '#f59e0b',
    order: 2
  },
  '密码产品原理、应用及相关标准': {
    weight: 0.20,
    icon: '🛡️',
    color: '#10b981',
    order: 3
  },
  '密评理论、技术及相关标准': {
    weight: 0.20,
    icon: '📋',
    color: '#3b82f6',
    order: 4
  },
  '密码政策法规': {
    weight: 0.10,
    icon: '⚖️',
    color: '#8b5cf6',
    order: 5
  }
}

export default {
	inject: ['authStore'],
  name: 'ExamCategoryPractice',
  data() {
    return {
      loading: true,
      categories: [],
      selectedCategory: null,
      questions: [],
      currentIndex: 0,
      currentQuestion: null,
      selectedAnswer: null,
      showAnswerResult: false,
      isCorrect: false,
      correctCount: 0,
      wrongCount: 0,
      // 统一API相关
      useUnifiedAPI: false,
      answerStartTime: null
    }
  },
  computed: {
    userId() {
      return this.authStore.getCurrentUserId()
    },
    isUnifiedEnabled() {
      return this.useUnifiedAPI && versionConfig.isFeatureEnabled('unifiedSuperMemo')
    },
    sortedCategories() {
      // 计算优先级分数并排序
      return this.categories.map(cat => {
        const completionRate = cat.total > 0 ? cat.practiced / cat.total : 0
        const accuracy = cat.accuracy || 0
        const examWeight = EXAM_CATEGORIES[cat.category]?.weight || 0.1

        // 优先级分数 = 考试权重 × (1 - 完成度) × (1 + (1 - 正确率))
        const priorityScore = examWeight * (1 - completionRate) * (1 + (1 - accuracy))

        return {
          ...cat,
          examWeight: (EXAM_CATEGORIES[cat.category]?.weight * 100).toFixed(0) + '%',
          priorityScore: priorityScore || 0
        }
      }).sort((a, b) => b.priorityScore - a.priorityScore)
    }
  },
  async mounted() {
    // 检查版本配置
    await this.checkVersionConfig()
    await this.loadCategories()
  },
  async activated() {
    console.log('ExamCategoryPractice: 组件被激活，刷新数据')
    await this.loadCategories()
  },
  methods: {
    goBack() {
      this.$router.back()
    },
    async checkVersionConfig() {
      try {
        await versionConfig.init()
        this.useUnifiedAPI = versionConfig.useUnifiedAPI()
        console.log('统一API状态:', this.useUnifiedAPI)
      } catch (error) {
        console.error('检查版本配置失败:', error)
        this.useUnifiedAPI = false
      }
    },

    async loadCategories() {
      try {
        // 暂时禁用统一统计API，使用经过验证的legacy API
        // 原因：统一API引用不存在的视图 v_unified_user_stats
        await this.loadCategoriesLegacy()
      } catch (error) {
        console.error('加载类别失败:', error)
        // 尝试使用旧API
        await this.loadCategoriesLegacy()
      } finally {
        this.loading = false
      }
    },

    async loadCategoriesLegacy() {
      const response = await api.get(`/api/v2/stats/user/${this.userId}`)
      this.categories = response.data.by_exam_category || []
    },
    getCategoryIcon(category) {
      return EXAM_CATEGORIES[category]?.icon || '📄'
    },
    getAccuracyClass(accuracy) {
      if (accuracy >= 80) return 'accuracy-high'
      if (accuracy >= 60) return 'accuracy-medium'
      return 'accuracy-low'
    },
    getCompletionPercent(category) {
      return Math.round((category.practiced / category.total) * 100)
    },
    selectCategory(category) {
      this.selectedCategory = category
    },
    async startPractice(category, mode) {
      try {
        const params = {
          user_id: this.userId,
          exam_category: category.category,
          limit: 50
        }

        if (mode === 'new') {
          params.exclude_practiced = true
        }

        const response = await api.get(`${API_BASE}/questions`, { params })
        this.questions = response.data

        if (this.questions.length === 0) {
          alert(mode === 'new' ? '该类别下所有题目都已练习过了' : '该类别暂无题目')
          return
        }

        this.currentIndex = 0
        this.correctCount = 0
        this.wrongCount = 0
        this.showQuestion()
      } catch (error) {
        console.error('获取题目失败:', error)
        alert('获取题目失败')
      }
    },
    showQuestion() {
      this.currentQuestion = this.questions[this.currentIndex]
      this.selectedAnswer = null
      this.showAnswerResult = false
      // 开始计时
      this.answerStartTime = Date.now()
    },
    getQuestionTypeLabel(type) {
      const labels = {
        '单项选择题': '单选',
        '多项选择题': '多选',
        '判断题': '判断'
      }
      return labels[type] || type
    },
    isChoiceQuestion() {
      return this.currentQuestion?.question_type?.includes('选择题')
    },
    getOptions() {
      if (!this.currentQuestion) return []
      return [
        this.currentQuestion.option_a,
        this.currentQuestion.option_b,
        this.currentQuestion.option_c,
        this.currentQuestion.option_d
      ].filter(opt => opt)
    },
    getOptionLabel(index) {
      return ['A', 'B', 'C', 'D'][index]
    },
    selectAnswer(answer) {
      this.selectedAnswer = answer
    },
    async submitAnswer() {
      if (!this.selectedAnswer) return

      const isCorrect = this.selectedAnswer === this.currentQuestion.correct_answer
      this.isCorrect = isCorrect
      this.showAnswerResult = true

      if (isCorrect) {
        this.correctCount++
      } else {
        this.wrongCount++
      }

      // 记录练习历史
      try {
        if (this.isUnifiedEnabled) {
          // 使用统一API
          const timeSpent = this.answerStartTime ? Math.round((Date.now() - this.answerStartTime) / 1000) : 0
          const response = await api.post(`${API_BASE}/unified/practice/submit`, {
            user_id: this.userId,
            question_id: this.currentQuestion.id,
            user_answer: this.selectedAnswer,
            is_correct: isCorrect,
            time_spent: timeSpent,
            practice_mode: 'exam_category'
          })

          // 更新本地状态缓存
          if (response.data.state) {
            const state = new QuestionState(response.data.state)
            unifiedStateStore.questionStates.set(this.currentQuestion.id, state)
          }
        } else {
          // 使用旧API
          await api.post(`${API_BASE}/practice/history`, {
            user_id: this.userId,
            question_id: this.currentQuestion.id,
            is_correct: isCorrect
          })
        }
      } catch (error) {
        console.error('记录练习失败:', error)
      }
    },
    showAnswer() {
      this.showAnswerResult = true
      this.isCorrect = false
    },
    nextQuestion() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++
        this.showQuestion()
      }
    },
    previousQuestion() {
      if (this.currentIndex > 0) {
        this.currentIndex--
        this.showQuestion()
      }
    },
    exitPractice() {
      this.currentQuestion = null
      this.questions = []
      this.selectedCategory = null
      this.loadCategories() // 重新加载数据
    }
  }
}
</script>

<style scoped>
.exam-category-practice {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 2rem 1rem;
}

.header {
  max-width: 1200px;
  margin: 0 auto 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  font-size: 2rem;
  color: #2d3748;
}

.subtitle {
  margin: 0.5rem 0 0;
  color: #718096;
}

.btn-back {
  padding: 0.75rem 1.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #f7fafc;
  border-color: #cbd5e0;
}

.exam-info-card {
  max-width: 1200px;
  margin: 0 auto 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1.5rem;
  color: white;
}

.exam-info-card h3 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
}

.exam-details {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  gap: 0.5rem;
}

.detail-item .label {
  opacity: 0.9;
}

.detail-item .value {
  font-weight: 600;
}

.loading-state {
  text-align: center;
  padding: 4rem;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 1.5rem;
  border: 3px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.categories-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 1.5rem;
}

.category-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #667eea;
}

.category-card.high-priority {
  border-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.category-icon {
  font-size: 2.5rem;
}

.category-info h4 {
  margin: 0;
  font-size: 1.1rem;
  color: #2d3748;
}

.exam-weight {
  font-size: 0.875rem;
  color: #718096;
}

.priority-badge {
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.card-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #718096;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2d3748;
}

.stat-value.practiced {
  color: #667eea;
}

.stat-value.accuracy-high {
  color: #48bb78;
}

.stat-value.accuracy-medium {
  color: #ed8936;
}

.stat-value.accuracy-low {
  color: #f56565;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
  min-width: 35px;
  text-align: right;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-practice,
.btn-new {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-practice {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-practice:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-new {
  background: #edf2f7;
  color: #4a5568;
}

.btn-new:hover {
  background: #e2e8f0;
}

.practice-mode {
  max-width: 900px;
  margin: 0 auto;
}

.practice-header {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.practice-header h3 {
  margin: 0;
  color: #2d3748;
}

.practice-info {
  display: flex;
  gap: 1.5rem;
  color: #718096;
}

.btn-exit {
  padding: 0.5rem 1rem;
  background: #fed7d7;
  color: #c53030;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.question-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.question-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.question-type {
  padding: 0.25rem 0.75rem;
  background: #667eea;
  color: white;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}

.question-text {
  font-size: 1.125rem;
  line-height: 1.8;
  color: #2d3748;
  margin-bottom: 1.5rem;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item:hover {
  border-color: #667eea;
  background: #f7fafc;
}

.option-item.selected {
  border-color: #667eea;
  background: #edf2f7;
}

.option-label {
  font-weight: 600;
  color: #667eea;
  min-width: 24px;
}

.judge-options {
  display: flex;
  gap: 1rem;
}

.judge-option {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  text-align: center;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.judge-option:hover {
  border-color: #667eea;
}

.judge-option.selected {
  border-color: #667eea;
  background: #edf2f7;
}

.question-actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
}

.btn-submit,
.btn-show-answer {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-submit:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.btn-show-answer {
  background: #edf2f7;
  color: #4a5568;
}

.answer-result {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border-radius: 8px;
}

.answer-result.correct {
  background: #c6f6d5;
  color: #22543d;
}

.answer-result.wrong {
  background: #fed7d7;
  color: #742a2a;
}

.result-text {
  margin: 0 0 0.5rem;
  font-weight: 700;
  font-size: 1.125rem;
}

.correct-answer {
  margin: 0.5rem 0;
}

.explanation {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.practice-navigation {
  max-width: 900px;
  margin: 1.5rem auto 0;
  display: flex;
  justify-content: space-between;
}

.btn-prev,
.btn-next {
  padding: 0.75rem 2rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-prev:hover:not(:disabled),
.btn-next:hover:not(:disabled) {
  background: #f7fafc;
  border-color: #667eea;
}

.btn-prev:disabled,
.btn-next:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 底部操作栏 ========== */
.bottom-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideUp 0.3s ease;
  border-top: 1px solid #e5e7eb;
  padding-bottom: env(safe-area-inset-bottom);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.action-bar-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.selected-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.selected-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.selected-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-stats {
  font-size: 0.875rem;
  color: #718096;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.primary-btn:active {
  transform: translateY(0);
}

.secondary-btn {
  background: #f7fafc;
  color: #4a5568;
  border: 2px solid #e2e8f0;
}

.secondary-btn:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

.cancel-btn {
  padding: 0.875rem;
  background: #fed7d7;
  color: #c53030;
  border-radius: 50%;
}

.cancel-btn:hover {
  background: #feb2b2;
}

.btn-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.btn-text {
  line-height: 1;
}

/* 卡片选中状态 */
.category-card {
  position: relative;
}

.category-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #edf2f7 0%, #ffffff 100%);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.category-card.selected::after {
  content: '✓';
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.875rem;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .action-bar-content {
    padding: 0.875rem 1rem;
    gap: 1rem;
    flex-direction: column;
  }

  .selected-info {
    width: 100%;
  }

  .selected-icon {
    font-size: 1.75rem;
  }

  .selected-name {
    font-size: 0.95rem;
  }

  .selected-stats {
    font-size: 0.8rem;
  }

  .action-buttons {
    width: 100%;
    justify-content: space-between;
  }

  .action-btn {
    flex: 1;
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    justify-content: center;
  }

  .cancel-btn {
    flex: 0 0 auto;
    width: 44px;
    padding: 0.875rem 0;
    justify-content: center;
  }

  .btn-text {
    display: inline;
  }
}

@media (max-width: 480px) {
  .action-bar-content {
    padding: 0.75rem 1rem;
  }

  .action-buttons {
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.75rem 0.875rem;
    font-size: 0.85rem;
  }

  .btn-icon {
    font-size: 1rem;
  }

  .cancel-btn {
    width: 40px;
    padding: 0.75rem 0;
  }
}
</style>
