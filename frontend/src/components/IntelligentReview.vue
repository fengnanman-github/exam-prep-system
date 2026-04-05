<template>
  <div class="intelligent-review">
    <!-- 移动端顶部导航栏 -->
    <div class="mobile-top-bar">
      <button @click="$emit('back')" class="mobile-back-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <span class="mobile-title">智能复习</span>
    </div>

    <!-- 桌面端顶部导航 -->
    <div class="header">
      <div class="header-content">
        <h2>🧠 智能复习+</h2>
        <p class="subtitle">基于遗忘曲线的个性化复习</p>
      </div>
      <button @click="$emit('back')" class="btn-back">← 返回首页</button>
    </div>

    <!-- 仪表板 -->
    <div v-if="dashboard && !reviewMode" class="dashboard">
      <!-- 80分目标进度 -->
      <div class="section target-section">
        <h3>🎯 80分目标进度</h3>
        <div class="target-card">
          <div class="target-progress">
            <div class="target-circle">
              <svg :width="140" :height="140" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke="#e5e7eb"
                  stroke-width="10"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  :stroke="getTargetColor()"
                  stroke-width="10"
                  stroke-linecap="round"
                  :stroke-dasharray="2 * Math.PI * 60"
                  :stroke-dashoffset="2 * Math.PI * 60 * (1 - dashboard.current_score / 100)"
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <div class="target-text">
                <div class="target-score">{{ dashboard.current_score }}</div>
                <div class="target-label">/ 80分</div>
                <div class="target-status" :class="dashboard.meets_target ? 'met' : 'not-met'">
                  {{ dashboard.meets_target ? '✓ 已达成' : '差距 ' + dashboard.gap_to_target.toFixed(1) + '分' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 考试类别得分分析 -->
      <div v-if="dashboard.score_breakdown && dashboard.score_breakdown.length > 0" class="section category-section">
        <h3>📊 考试类别得分分析</h3>
        <div class="category-cards">
          <div
            v-for="category in dashboard.score_breakdown"
            :key="category.category"
            class="category-card"
            :class="{ 'meets-target': category.meets_target }"
          >
            <div class="category-header">
              <span class="category-name">{{ category.category }}</span>
              <span class="category-weight">{{ category.weight }}%</span>
            </div>
            <div class="category-score-bar">
              <div
                class="category-score-fill"
                :style="{ width: (category.category_score * 100) + '%' }"
              ></div>
            </div>
            <div class="category-stats">
              <span class="category-stat">正确率: {{ (category.accuracy * 100).toFixed(1) }}%</span>
              <span class="category-stat">得分: {{ category.earned_score.toFixed(1) }} / {{ category.weight * 0.8 }}</span>
            </div>
            <div v-if="!category.meets_target" class="category-gap">
              差距: {{ (category.gap).toFixed(1) }}分
            </div>
          </div>
        </div>
      </div>

      <!-- 学习路径推荐 -->
      <div v-if="dashboard.study_path && dashboard.study_path.phase && dashboard.study_path.phase.length > 0" class="section path-section">
        <h3>🛤️ 个性化学习路径</h3>
        <div class="path-phases">
          <div
            v-for="(phase, index) in dashboard.study_path.phase"
            :key="phase.phase"
            class="phase-card"
          >
            <div class="phase-number">{{ phase.phase }}</div>
            <div class="phase-content">
              <h4>{{ phase.name }}</h4>
              <p class="phase-description">{{ phase.description }}</p>
              <div class="phase-details">
                <span class="phase-detail">⏱️ {{ phase.duration_days }}天</span>
                <span class="phase-detail">📝 {{ phase.daily_questions }}题/天</span>
              </div>
              <div class="phase-focus">
                <strong>重点领域：</strong>
                {{ phase.focus_areas ? phase.focus_areas.join('、') : '全面复习' }}
              </div>
            </div>
          </div>
        </div>
        <div class="path-summary">
          <p>📅 预计{{ dashboard.study_path.total_duration_days }}天达到80分目标</p>
        </div>
      </div>

      <!-- 今日目标 -->
      <div class="section goal-section">
        <h3>📅 今日复习目标</h3>
        <div class="goal-card">
          <div class="goal-progress">
            <div class="goal-circle">
              <svg :width="120" :height="120" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#e5e7eb"
                  stroke-width="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  :stroke="getProgressColor()"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="circumference * (1 - todayProgress)"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div class="goal-text">
                <div class="goal-percentage">{{ todayProgressPercent }}%</div>
                <div class="goal-label">完成度</div>
              </div>
            </div>
            <div class="goal-stats">
              <div class="stat-item">
                <span class="stat-value">{{ dashboard.stats.today_reviews }}</span>
                <span class="stat-label">已复习</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ dashboard.stats.due_count }}</span>
                <span class="stat-label">待复习</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ (dashboard.stats.effectiveness * 100).toFixed(0) }}%</span>
                <span class="stat-label">有效率</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 复习计划 -->
      <div v-if="dashboard.daily_plan && dashboard.daily_plan.sections.length > 0" class="section plan-section">
        <h3>📋 今日复习计划</h3>
        <div class="plan-sections">
          <div
            v-for="section in dashboard.daily_plan.sections"
            :key="section.type"
            class="plan-card"
            :class="`priority-${section.priority}`"
          >
            <div class="plan-header">
              <h4>{{ section.title }}</h4>
              <span class="plan-count">{{ section.count }}题</span>
            </div>
            <p class="plan-description">{{ section.description }}</p>
            <p class="plan-reason">💡 {{ section.reason }}</p>
            <button @click="startSection(section)" class="btn-start">
              开始复习 →
            </button>
          </div>
        </div>
      </div>

      <!-- 薄弱知识点 -->
      <div v-if="dashboard.weak_points && dashboard.weak_points.length > 0" class="section weak-section">
        <h3>🎯 薄弱知识点突破</h3>
        <div class="weak-points">
          <div
            v-for="wp in dashboard.weak_points"
            :key="wp.law_category"
            class="weak-point-card"
          >
            <div class="weak-header">
              <span class="weak-category">{{ wp.law_category }}</span>
              <span class="weak-accuracy" :class="getAccuracyClass(wp.accuracy * 100)">
                {{ (wp.accuracy * 100).toFixed(1) }}%
              </span>
            </div>
            <div class="weak-stats">
              <span class="weak-stat">练习{{ wp.practice_count }}次</span>
              <span class="weak-stat">掌握度{{ (wp.mastery_level * 100).toFixed(0) }}%</span>
            </div>
            <p class="weak-reason">❌ {{ wp.weakness_reason }}</p>
            <p class="weak-action">💡 {{ wp.recommended_action }}</p>
            <button @click="startWeakPoint(wp)" class="btn-practice">
              开始练习
            </button>
          </div>
        </div>
      </div>

      <!-- 复习效果分析 -->
      <div v-if="dashboard.effect_analysis" class="section effect-section">
        <h3>📊 复习效果分析</h3>
        <div class="effect-card">
          <div class="effect-overview">
            <div class="effect-metric">
              <span class="metric-label">整体效果</span>
              <span class="metric-value" :class="getEffectClass(dashboard.effect_analysis.overall)">
                {{ dashboard.effect_analysis.overall }}
              </span>
            </div>
            <div class="effect-metric">
              <span class="metric-label">有效率</span>
              <span class="metric-value">
                {{ (dashboard.effect_analysis.effectiveness * 100).toFixed(1) }}%
              </span>
            </div>
          </div>

          <div v-if="dashboard.effect_analysis.suggestions.length > 0" class="effect-suggestions">
            <h4>💡 建议</h4>
            <ul>
              <li v-for="(suggestion, index) in dashboard.effect_analysis.suggestions" :key="index">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 快速开始按钮 -->
      <div class="section quick-start">
        <button @click="startQuickReview" class="btn-quick-start">
          🚀 快速开始复习
        </button>
      </div>
    </div>

    <!-- 复习模式 -->
    <div v-if="reviewMode && currentQuestion" class="review-mode">
      <!-- 移动端复习顶部栏 -->
      <div class="mobile-review-header">
        <button @click="exitReview" class="mobile-exit-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="mobile-review-info">
          <span class="review-progress-text">{{ currentIndex + 1 }}/{{ questions.length }}</span>
          <span class="review-correct">{{ correctCount }}✓</span>
        </div>
        <div class="mobile-review-spacer"></div>
      </div>

      <div class="review-header">
        <div class="review-info">
          <span class="review-count">第 {{ currentIndex + 1 }}/{{ questions.length }} 题</span>
          <span class="review-urgency" :class="`urgency-${currentQuestion.urgency_label}`">
            {{ currentQuestion.urgency_label }}
          </span>
        </div>
        <div class="review-stats">
          <span class="stat">✓ {{ correctCount }}</span>
          <span class="stat">✗ {{ wrongCount }}</span>
        </div>
        <button @click="exitReview" class="btn-exit">退出</button>
      </div>

      <div class="question-container">
        <div class="question-card">
          <!-- 知识点标签 -->
          <div class="knowledge-tags">
            <span class="tag">{{ currentQuestion.law_category }}</span>
            <span class="tag">{{ currentQuestion.tech_category }}</span>
          </div>

          <!-- 题目内容 -->
          <div class="question-content">
            <div class="question-header">
              <span class="question-number">题目编号：{{ currentQuestion.question_no || currentQuestion.id }}</span>
            </div>
            <p class="question-text">{{ currentQuestion.question_text }}</p>

            <!-- 选项 -->
            <div v-if="isChoiceQuestion()" class="options-list">
              <div
                v-for="(option, index) in getOptions()"
                :key="index"
                class="option-item"
                :class="{ 'selected': selectedAnswer === option }"
                @click="selectAnswer(option)"
              >
                <span class="option-label">{{ getOptionLabel(index) }}</span>
                <span class="option-text">{{ option }}</span>
              </div>
            </div>

            <!-- 判断题 -->
            <div v-if="currentQuestion.question_type === '判断题'" class="judge-options">
              <div
                class="judge-option"
                :class="{ 'selected': selectedAnswer === '正确' }"
                @click="selectAnswer('正确')"
              >
                ✓ 正确
              </div>
              <div
                class="judge-option"
                :class="{ 'selected': selectedAnswer === '错误' }"
                @click="selectAnswer('错误')"
              >
                ✗ 错误
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="question-actions">
            <button
              @click="submitAnswer"
              class="btn-submit"
              :disabled="!selectedAnswer"
            >
              提交答案
            </button>
            <button @click="toggleUncertain" class="btn-uncertain" :class="{ active: isUncertain }">
              {{ isUncertain ? '🤔 不确定' : '标记不确定' }}
            </button>
          </div>

          <!-- 结果显示 -->
          <div v-if="showResult" class="answer-result" :class="{ correct: isCorrect, wrong: !isCorrect }">
            <p class="result-text">
              {{ isCorrect ? '✓ 回答正确！' : '✗ 回答错误' }}
            </p>
            <p class="correct-answer">
              正确答案：{{ currentQuestion.correct_answer }}
            </p>
            <div v-if="currentQuestion.explanation" class="explanation">
              <strong>解析：</strong>{{ currentQuestion.explanation }}
            </div>
            <div class="quality-feedback">
              <p>复习效果：{{ qualityMessage }}</p>
              <p class="next-review">
                下次复习：{{ nextReviewDate }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="review-navigation">
        <button @click="previousQuestion" :disabled="currentIndex === 0" class="btn-prev">
          ← 上一题
        </button>
        <button @click="nextQuestion" class="btn-next">
          {{ currentIndex === questions.length - 1 ? '完成' : '下一题 →' }}
        </button>
      </div>
    </div>

    <!-- 完成页面 -->
    <div v-if="reviewCompleted" class="review-completed">
      <div class="completed-card">
        <div class="completed-icon">🎉</div>
        <h2>复习完成！</h2>
        <div class="completed-stats">
          <div class="stat">
            <span class="stat-value">{{ questions.length }}</span>
            <span class="stat-label">总题数</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ correctCount }}</span>
            <span class="stat-label">正确</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ wrongCount }}</span>
            <span class="stat-label">错误</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ ((correctCount / questions.length) * 100).toFixed(1) }}%</span>
            <span class="stat-label">正确率</span>
          </div>
        </div>
        <div class="completed-actions">
          <button @click="reviewAgain" class="btn-primary">
            继续复习
          </button>
          <button @click="exitReview" class="btn-secondary">
            返回首页
          </button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !dashboard" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载复习数据...</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const API_BASE = '/api/v2'

export default {
  name: 'IntelligentReview',
  emits: ['back'],
  data() {
    return {
      dashboard: null,
      questions: [],
      currentIndex: 0,
      currentQuestion: null,
      selectedAnswer: null,
      showResult: false,
      isCorrect: false,
      isUncertain: false,
      correctCount: 0,
      wrongCount: 0,
      reviewMode: false,
      reviewCompleted: false,
      answerStartTime: null,
      loading: true,
      circumference: 2 * Math.PI * 54
    }
  },
  computed: {
    userId() {
      return this.$root.authStore?.getCurrentUserId() || 'exam_user_001'
    },
    todayProgress() {
      if (!this.dashboard) return 0
      const { today_reviews, due_count } = this.dashboard.stats
      const total = today_reviews + due_count
      return total > 0 ? today_reviews / total : 0
    },
    todayProgressPercent() {
      return Math.round(this.todayProgress * 100)
    },
    qualityMessage() {
      if (!this.showResult) return ''
      if (this.isUncertain) {
        return this.isCorrect ? '正确但不确定，继续巩固' : '答错且不确定，需要加强'
      }
      if (this.isCorrect) {
        return '掌握良好，继续保持'
      }
      return '需要加强，及时复习'
    },
    nextReviewDate() {
      if (!this.showResult || !this.currentQuestion) return ''
      const interval = this.currentQuestion.review_interval || 1
      const date = new Date()
      date.setDate(date.getDate() + interval)
      return date.toLocaleDateString('zh-CN')
    }
  },
  async mounted() {
    console.log('IntelligentReview mounted, userId:', this.userId)
    await this.loadDashboard()
  },
  methods: {
    async loadDashboard() {
      try {
        console.log('正在加载80分目标仪表板数据...')
        const response = await axios.get(`${API_BASE}/intelligent-review/v2/dashboard/${this.userId}`)
        console.log('仪表板数据响应:', response.data)

        // 合并v2数据与原有数据结构
        const v2Data = response.data.data
        this.dashboard = {
          ...v2Data,
          // 保持与原组件的兼容性
          stats: {
            today_reviews: 0,
            due_count: v2Data.due_questions?.length || 0,
            effectiveness: 0.8
          },
          daily_plan: v2Data.daily_plan,
          weak_points: v2Data.weak_points,
          effect_analysis: {
            overall: v2Data.meets_target ? '优秀' : '需要改进',
            effectiveness: v2Data.current_score / 100,
            suggestions: v2Data.strategy_recommendations?.map(r => r.message) || []
          }
        }
        console.log('仪表板数据已设置:', this.dashboard)
      } catch (error) {
        console.error('加载仪表板失败:', error)
        this.loading = false
      } finally {
        this.loading = false
      }
    },

    getProgressColor() {
      const progress = this.todayProgress
      if (progress >= 0.8) return '#10b981'
      if (progress >= 0.5) return '#f59e0b'
      return '#ef4444'
    },

    getAccuracyClass(accuracy) {
      if (accuracy >= 80) return 'high'
      if (accuracy >= 60) return 'medium'
      return 'low'
    },

    getEffectClass(effect) {
      const map = {
        '优秀': 'excellent',
        '良好': 'good',
        '一般': 'average',
        '需要改进': 'poor'
      }
      return map[effect] || 'average'
    },

    getTargetColor() {
      if (!this.dashboard) return '#ef4444'
      const score = this.dashboard.current_score
      if (score >= 80) return '#10b981'
      if (score >= 60) return '#f59e0b'
      return '#ef4444'
    },

    getCategoryScoreColor(score) {
      if (score >= 0.8) return '#10b981'
      if (score >= 0.6) return '#f59e0b'
      return '#ef4444'
    },

    async startSection(section) {
      this.reviewMode = true
      await this.loadQuestions(section.type)
    },

    async startQuickReview() {
      this.reviewMode = true
      await this.loadQuestions('all')
    },

    async startWeakPoint(wp) {
      this.reviewMode = true
      // 按知识点加载题目
      await this.loadQuestions('weak_point', wp.law_category)
    },

    async loadQuestions(type, category = null) {
      try {
        let url = `${API_BASE}/intelligent-review/due-questions/${this.userId}?limit=20`

        const response = await axios.get(url)
        this.questions = response.data.data
        this.currentIndex = 0
        this.showQuestion()
      } catch (error) {
        console.error('加载题目失败:', error)
        alert('加载题目失败')
      }
    },

    showQuestion() {
      this.currentQuestion = this.questions[this.currentIndex]
      this.selectedAnswer = null
      this.showResult = false
      this.isUncertain = false
      this.answerStartTime = Date.now()
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

    toggleUncertain() {
      this.isUncertain = !this.isUncertain
    },

    async submitAnswer() {
      if (!this.selectedAnswer) return

      const timeSpent = this.answerStartTime
        ? Math.round((Date.now() - this.answerStartTime) / 1000)
        : 30

      const isCorrect = this.selectedAnswer === this.currentQuestion.correct_answer
      this.isCorrect = isCorrect
      this.showResult = true

      if (isCorrect) {
        this.correctCount++
      } else {
        this.wrongCount++
      }

      // 提交到智能复习API
      try {
        await axios.post(`${API_BASE}/intelligent-review/submit`, {
          user_id: this.userId,
          question_id: this.currentQuestion.question_id,
          is_correct: isCorrect,
          time_spent: timeSpent,
          is_uncertain: this.isUncertain
        })
      } catch (error) {
        console.error('提交复习失败:', error)
      }
    },

    nextQuestion() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++
        this.showQuestion()
      } else {
        this.reviewCompleted = true
      }
    },

    previousQuestion() {
      if (this.currentIndex > 0) {
        this.currentIndex--
        this.showQuestion()
      }
    },

    async reviewAgain() {
      this.reviewCompleted = false
      this.correctCount = 0
      this.wrongCount = 0
      await this.loadQuestions('all')
    },

    exitReview() {
      this.reviewMode = false
      this.reviewCompleted = false
      this.questions = []
      this.currentIndex = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.loadDashboard() // 刷新数据
    }
  }
}
</script>

<style scoped>
.intelligent-review {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 2rem 1rem;
}

/* ========== 80分目标进度卡片 ========== */
.target-section {
  margin-bottom: 1.5rem;
}

.target-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.target-progress {
  display: flex;
  justify-content: center;
  align-items: center;
}

.target-circle {
  position: relative;
  width: 140px;
  height: 140px;
}

.target-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.target-score {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
}

.target-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.target-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  margin-top: 0.5rem;
}

.target-status.met {
  background: #d1fae5;
  color: #065f46;
}

.target-status.not-met {
  background: #fee2e2;
  color: #991b1b;
}

/* ========== 考试类别得分分析 ========== */
.category-section {
  margin-bottom: 1.5rem;
}

.category-cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.category-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #ef4444;
  transition: all 0.3s ease;
}

.category-card.meets-target {
  border-left-color: #10b981;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.category-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.category-weight {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.category-score-bar {
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.category-score-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
  transition: width 0.5s ease;
}

.category-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.category-gap {
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 500;
}

/* ========== 学习路径推荐 ========== */
.path-section {
  margin-bottom: 1.5rem;
}

.path-phases {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.phase-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.phase-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.phase-content {
  flex: 1;
}

.phase-content h4 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
  font-size: 1rem;
}

.phase-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.phase-details {
  display: flex;
  gap: 1rem;
  margin: 0.5rem 0;
}

.phase-detail {
  font-size: 0.85rem;
  color: #6b7280;
}

.phase-focus {
  font-size: 0.85rem;
  color: #4b5563;
  margin-top: 0.5rem;
}

.path-summary {
  background: #f0f9ff;
  border-left: 4px solid #3b82f6;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.path-summary p {
  margin: 0;
  color: #1e40af;
  font-weight: 500;
}


/* ========== 移动端顶部导航栏 ========== */
.mobile-top-bar {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  align-items: center;
  gap: 1rem;
  padding: 0 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.mobile-back-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  padding: 0;
}

.mobile-back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-2px);
}

.mobile-back-btn:active {
  transform: translateX(-1px);
}

.mobile-back-btn svg {
  width: 24px;
  height: 24px;
}

.mobile-title {
  flex: 1;
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
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

.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.section {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
}

.section h3 {
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
  color: #2d3748;
}

/* 今日目标 */
.goal-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.goal-progress {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.goal-circle {
  position: relative;
  width: 120px;
  height: 120px;
}

.goal-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.goal-percentage {
  font-size: 2rem;
  font-weight: bold;
  line-height: 1;
}

.goal-label {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-top: 0.25rem;
}

.goal-stats {
  flex: 1;
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-top: 0.5rem;
}

/* 复习计划 */
.plan-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.plan-card {
  padding: 1.5rem;
  border-radius: 12px;
  border-left: 4px solid;
  background: #f7fafc;
}

.plan-card.priority-1 {
  border-left-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
}

.plan-card.priority-2 {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
}

.plan-card.priority-3 {
  border-left-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.plan-header h4 {
  margin: 0;
  font-size: 1.1rem;
  color: #2d3748;
}

.plan-count {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.plan-description {
  margin: 0.5rem 0;
  color: #4a5568;
  font-size: 0.95rem;
}

.plan-reason {
  margin: 0.5rem 0;
  color: #718096;
  font-size: 0.875rem;
}

.btn-start {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 薄弱知识点 */
.weak-points {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.weak-point-card {
  padding: 1.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
}

.weak-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.weak-category {
  font-weight: 600;
  color: #2d3748;
}

.weak-accuracy {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.weak-accuracy.low {
  background: #fee2e2;
  color: #991b1b;
}

.weak-accuracy.medium {
  background: #ffedd5;
  color: #9a3412;
}

.weak-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  color: #718096;
  font-size: 0.875rem;
}

.weak-reason {
  margin: 0.5rem 0;
  color: #991b1b;
  font-size: 0.9rem;
}

.weak-action {
  margin: 0.5rem 0 1rem;
  color: #4a5568;
  font-size: 0.9rem;
}

.btn-practice {
  padding: 0.75rem 1.5rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.btn-practice:hover {
  background: #dc2626;
  transform: translateY(-2px);
}

/* 复习效果 */
.effect-card {
  background: #f7fafc;
  padding: 1.5rem;
  border-radius: 12px;
}

.effect-overview {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.effect-metric {
  flex: 1;
  text-align: center;
}

.metric-label {
  display: block;
  color: #718096;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2d3748;
}

.metric-value.excellent {
  color: #10b981;
}

.metric-value.good {
  color: #3b82f6;
}

.metric-value.average {
  color: #f59e0b;
}

.metric-value.poor {
  color: #ef4444;
}

.effect-suggestions h4 {
  margin: 0 0 1rem;
  color: #2d3748;
}

.effect-suggestions ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.effect-suggestions li {
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  color: #4a5568;
  line-height: 1.6;
}

/* 快速开始 */
.quick-start {
  text-align: center;
}

.btn-quick-start {
  padding: 1.25rem 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-quick-start:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

/* 复习模式 */
.review-header {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.review-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.review-count {
  font-weight: 600;
  color: #2d3748;
}

.review-urgency {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.urgency-非常紧急 {
  background: #fee2e2;
  color: #991b1b;
}

.urgency-紧急 {
  background: #ffedd5;
  color: #9a3412;
}

.urgency-重要 {
  background: #fef3c7;
  color: #92400e;
}

.review-stats {
  display: flex;
  gap: 1.5rem;
  color: #4a5568;
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

/* ========== 移动端复习头部 ========== */
.mobile-review-header {
  display: none;
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  height: 50px;
  background: white;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 99;
}

.mobile-exit-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fed7d7;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  color: #c53030;
  padding: 0;
}

.mobile-exit-btn:hover {
  background: #feb2b2;
  transform: translateX(-2px);
}

.mobile-exit-btn svg {
  width: 20px;
  height: 20px;
}

.mobile-review-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.review-progress-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: #2d3748;
}

.review-correct {
  font-size: 0.875rem;
  color: #10b981;
  font-weight: 600;
}

.mobile-review-spacer {
  width: 40px;
}

.question-card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.knowledge-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  padding: 0.25rem 0.75rem;
  background: #edf2f7;
  color: #4a5568;
  border-radius: 12px;
  font-size: 0.875rem;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.question-number {
  font-size: 0.875rem;
  font-weight: 600;
  color: #667eea;
  background: #f0f4ff;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
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

.btn-submit {
  flex: 2;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.btn-uncertain {
  flex: 1;
  padding: 1rem;
  background: #edf2f7;
  color: #4a5568;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-uncertain.active {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
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

.quality-feedback {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.next-review {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
  margin-top: 0.5rem;
}

.review-navigation {
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
.btn-next:hover {
  background: #f7fafc;
  border-color: #667eea;
}

.btn-prev:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 完成页面 */
.review-completed {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.completed-card {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.completed-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.completed-card h2 {
  margin: 0 0 2rem;
  color: #2d3748;
}

.completed-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  font-size: 0.875rem;
  color: #718096;
  margin-top: 0.5rem;
}

.completed-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #edf2f7;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

/* 加载状态 */
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

/* 移动端优化 */
@media (max-width: 768px) {
  /* ========== 80分目标移动端优化 ========== */
  .target-circle {
    width: 120px;
    height: 120px;
  }

  .target-score {
    font-size: 1.75rem;
  }

  .target-label {
    font-size: 0.8rem;
  }

  .target-status {
    font-size: 0.7rem;
  }

  /* ========== 考试类别移动端优化 ========== */
  .category-cards {
    grid-template-columns: 1fr;
  }

  .category-card {
    padding: 1rem;
  }

  .category-name {
    font-size: 0.9rem;
  }

  .category-stats {
    font-size: 0.8rem;
  }

  /* ========== 学习路径移动端优化 ========== */
  .phase-card {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }

  .phase-number {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .phase-content h4 {
    font-size: 0.95rem;
  }

  .phase-description {
    font-size: 0.8rem;
  }

  .phase-details {
    flex-direction: column;
    gap: 0.5rem;
  }

  .phase-detail {
    font-size: 0.8rem;
  }

  .phase-focus {
    font-size: 0.8rem;
  }

  /* 显示移动端顶部栏，隐藏桌面端header */
  .mobile-top-bar {
    display: flex;
  }

  .header {
    display: none;
  }

  /* 显示移动端复习头部，隐藏桌面端复习头部 */
  .mobile-review-header {
    display: flex;
  }

  .review-header {
    display: none;
  }

  /* 调整内容区域，避免被固定导航栏遮挡 */
  .intelligent-review {
    padding-top: calc(56px + env(safe-area-inset-top) + 1rem);
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-bottom: 1rem;
  }

  .review-mode {
    padding-top: 106px;
  }

  /* 移动端今日目标优化 */
  .goal-card {
    padding: 1.25rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .goal-circle {
    width: 100px;
    height: 100px;
  }

  .goal-percentage {
    font-size: 1.5rem;
  }

  .goal-label {
    font-size: 0.75rem;
  }

  .goal-stats {
    gap: 1rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }

  .header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .section {
    padding: 1.25rem;
  }

  .goal-progress {
    flex-direction: column;
    gap: 1.5rem;
  }

  .goal-stats {
    flex-direction: row;
    justify-content: space-around;
  }

  .plan-sections,
  .weak-points {
    grid-template-columns: 1fr;
  }

  .effect-overview {
    flex-direction: column;
    gap: 1rem;
  }

  .completed-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .completed-actions {
    flex-direction: column;
  }

  /* ========== 移动端题号显示优化 ========== */
  .question-number {
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
  }

  .question-text {
    font-size: 1rem;
  }
}
</style>
