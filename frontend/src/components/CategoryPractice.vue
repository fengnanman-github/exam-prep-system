<template>
  <div class="category-practice">
    <!-- 顶部导航 -->
    <div class="header">
      <div class="header-left">
        <h2>📚 分类练习</h2>
        <p class="subtitle">按法律法规和技术专业分类练习</p>
      </div>
      <button @click="goBack" class="btn-back">← 返回首页</button>
    </div>

    <!-- 分类选择 -->
    <div v-if="!selectedCategory && !currentQuestion" class="category-selection">
      <!-- 法律法规大类 -->
      <section class="category-section">
        <h3 class="section-title">📚 法律法规大类</h3>
        <div class="category-grid">
          <div
            v-for="cat in lawCategories"
            :key="cat.law_category"
            @click="selectLawCategory(cat.law_category)"
            class="category-card law-card"
            :style="{ borderColor: getLawCategoryColor(cat.law_category) }"
          >
            <div class="card-header">
              <span class="card-icon">{{ getLawCategoryIcon(cat.law_category) }}</span>
              <h4>{{ cat.law_category }}</h4>
              <span class="card-count">{{ cat.total_count }} 题</span>
            </div>
            <div class="card-stats">
              <div class="stat-item">
                <span class="stat-label">已练</span>
                <span class="stat-value practiced">{{ cat.practiced_count || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">正确率</span>
                <span class="stat-value" :class="getAccuracyClass(cat.accuracy_rate)">
                  {{ cat.accuracy_rate || 0 }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 技术专业类别 -->
      <section class="category-section">
        <h3 class="section-title">🔧 技术专业类别</h3>
        <div class="category-grid">
          <div
            v-for="cat in techCategories"
            :key="cat.tech_category"
            @click="selectTechCategory(cat.tech_category)"
            class="category-card tech-card"
            :style="{ borderColor: getTechCategoryColor(cat.tech_category) }"
          >
            <div class="card-header">
              <span class="card-icon">{{ getTechCategoryIcon(cat.tech_category) }}</span>
              <h4>{{ cat.tech_category }}</h4>
              <span class="card-count">{{ cat.total_count }} 题</span>
            </div>
            <div class="card-stats">
              <div class="stat-item">
                <span class="stat-label">已练</span>
                <span class="stat-value practiced">{{ cat.practiced_count || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">正确率</span>
                <span class="stat-value" :class="getAccuracyClass(cat.accuracy_rate)">
                  {{ cat.accuracy_rate || 0 }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 练习模式选择 -->
    <div v-if="selectedCategory && !currentQuestion" class="practice-setup">
      <div class="setup-card">
        <h3>{{ selectedCategory }}</h3>
        <p class="setup-info">
          该分类共有 <strong>{{ categoryStats.total_count }}</strong> 道题目
        </p>

        <div class="practice-options">
          <h4>选择练习模式：</h4>
          <div class="option-buttons">
            <button @click="startPractice('random')" class="option-card">
              <div class="option-icon">🎲</div>
              <div class="option-content">
                <h5>随机练习</h5>
                <p>随机抽取题目进行练习</p>
              </div>
            </button>

            <button @click="startPractice('new')" class="option-card">
              <div class="option-icon">🆕</div>
              <div class="option-content">
                <h5>新题练习</h5>
                <p>只做未练习过的题目</p>
              </div>
            </button>

            <button @click="startPractice('wrong')" class="option-card" :disabled="wrongCount === 0">
              <div class="option-icon">❌</div>
              <div class="option-content">
                <h5>错题重练</h5>
                <p>重点练习之前答错的题目 ({{ wrongCount }}题)</p>
              </div>
            </button>
          </div>
        </div>

        <button @click="selectedCategory = null" class="btn-back">← 返回分类列表</button>
      </div>
    </div>

    <!-- 答题区域 -->
    <div v-if="currentQuestion" class="question-area">
      <div class="question-header">
        <div class="header-left">
          <span v-if="currentQuestion.law_category" class="category-tag law-tag">
            {{ currentQuestion.law_category }}
          </span>
          <span v-if="currentQuestion.tech_category" class="category-tag tech-tag">
            {{ currentQuestion.tech_category }}
          </span>
          <span class="progress-badge">第 {{ currentIndex + 1 }} 题</span>
        </div>
        <div class="header-right">
          <span class="score-badge">
            正确: {{ correctCount }} | 错误: {{ wrongCount }}
          </span>
        </div>
        <button @click="exitPractice" class="btn-exit">✕ 退出</button>
      </div>

      <div class="question-content">
        <div class="question-meta">
          <span class="question-no">题号 {{ currentQuestion.question_no }}</span>
          <span class="difficulty-tag" :class="currentQuestion.difficulty">
            {{ getDifficultyText(currentQuestion.difficulty) }}
          </span>
        </div>

        <h3 class="question-text">{{ currentQuestion.question_text }}</h3>

        <!-- 判断题 -->
        <div v-if="currentQuestion.question_type === '判断题'" class="options judgment">
          <button @click="submitAnswer('A')" class="option-btn judgment-btn correct">
            ✅ 正确
          </button>
          <button @click="submitAnswer('B')" class="option-btn judgment-btn wrong">
            ❌ 错误
          </button>
        </div>

        <!-- 单选题 -->
        <div v-else-if="currentQuestion.question_type === '单项选择题'" class="options">
          <button
            v-for="(option, key) in getOptions(currentQuestion)"
            :key="key"
            @click="submitAnswer(key)"
            class="option-btn"
          >
            <span class="option-label">{{ key }}</span>
            <span class="option-text">{{ option }}</span>
          </button>
        </div>

        <!-- 多选题 -->
        <div v-else class="options multi-select">
          <button
            v-for="(option, key) in getOptions(currentQuestion)"
            :key="key"
            @click="toggleOption(key)"
            class="option-btn"
            :class="{ selected: selectedOptions.includes(key) }"
          >
            <span class="checkbox">{{ selectedOptions.includes(key) ? '☑' : '☐' }}</span>
            <span class="option-label">{{ key }}</span>
            <span class="option-text">{{ option }}</span>
          </button>
        </div>

        <!-- 多选题提交按钮 -->
        <div v-if="currentQuestion.question_type === '多项选择题' && !showResult" class="submit-section">
          <button
            @click="submitMultiAnswer"
            class="btn-submit"
            :disabled="selectedOptions.length === 0"
          >
            确认答案 (已选 {{ selectedOptions.length }} 项)
          </button>
        </div>
      </div>

      <!-- 答题结果 -->
      <div v-if="showResult" class="result-area">
        <div :class="['result-card', { correct: isCorrect, wrong: !isCorrect }]">
          <div class="result-header">
            <span class="result-icon">{{ isCorrect ? '✅' : '❌' }}</span>
            <span class="result-title">{{ isCorrect ? '回答正确！' : '回答错误' }}</span>
          </div>

          <div v-if="!isCorrect" class="correct-answer-section">
            <p class="correct-answer-label">正确答案：</p>
            <p class="correct-answer-value">{{ currentQuestion.correct_answer }}</p>
          </div>

          <div v-if="currentQuestion.question_type === '多项选择题' && !isCorrect" class="answer-comparison">
            <p class="your-answer-label">你的答案：</p>
            <p class="your-answer-value">{{ selectedOptions.sort().join('') || '未作答' }}</p>
          </div>

          <div v-if="currentQuestion.knowledge_point" class="knowledge-point">
            <span class="kp-icon">💡</span>
            <span class="kp-text">{{ currentQuestion.knowledge_point }}</span>
          </div>
        </div>

        <div class="action-buttons">
          <button @click="nextQuestion" class="btn-primary">
            {{ currentIndex < totalQuestions - 1 ? '下一题 →' : '完成练习' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../utils/api'
import { unifiedStateStore } from '../stores/unifiedState'
import { versionConfig } from '../config/version-config'
import { PRACTICE, ERROR_MESSAGES } from '../config/constants'
import { QuestionState } from '../stores/unifiedState'

const API_BASE = '/api/v2'

export default {
	inject: ['authStore'],
  name: 'CategoryPractice',
  emits: ['back', 'update-stats', 'complete'],
  data() {
    return {
      lawCategories: [],
      techCategories: [],
      selectedCategory: null,
      categoryType: null, // 'law' or 'tech'
      questions: [],
      currentIndex: 0,
      currentQuestion: null,
      showResult: false,
      isCorrect: false,
      questionStartTime: null,
      selectedOptions: [],
      correctCount: 0,
      wrongCount: 0,
      // 统一API支持
      useUnifiedAPI: false
    }
  },
  computed: {
    userId() {
      return this.authStore.getCurrentUserId()
    },
    categoryStats() {
      if (!this.selectedCategory) return {}
      const categories = this.categoryType === 'law' ? this.lawCategories : this.techCategories
      return categories.find(c =>
        this.categoryType === 'law'
          ? c.law_category === this.selectedCategory
          : c.tech_category === this.selectedCategory
      ) || {}
    },
    totalQuestions() {
      return this.questions.length
    },
    // 错题数量（用于显示"错题重练"选项的错题数）
    categoryWrongCount() {
      // 返回当前会话的错题数
      return this.wrongCount
    },
    isUnifiedEnabled() {
      return this.useUnifiedAPI && versionConfig.isFeatureEnabled('unifiedSuperMemo')
    }
  },
  async mounted() {
    // 检查版本配置
    try {
      await versionConfig.init()
      this.useUnifiedAPI = versionConfig.useUnifiedAPI()
      console.log('CategoryPractice: 统一API状态', this.useUnifiedAPI)
    } catch (error) {
      console.error('检查版本配置失败:', error)
      this.useUnifiedAPI = false
    }
    await this.loadCategories()
  },
  async activated() {
    console.log('CategoryPractice: 组件被激活，刷新数据')
    await this.loadCategories()
  },
  methods: {
    goBack() {
      this.$router.back()
    },
    async loadCategories() {
      try {
        console.log('开始加载分类数据...')

        // 使用统一统计API获取分类数据（包含用户统计）
        const statsRes = await api.get(`/api/v2/stats/user/${this.userId}`)
        const stats = statsRes.data

        // 转换法律法规分类数据
        this.lawCategories = stats.by_law_category.map(cat => ({
          law_category: cat.category,
          total_count: cat.total,
          easy_count: 0, // 需要从题目统计获取
          medium_count: 0,
          hard_count: 0,
          practiced_count: cat.practiced,
          correct_count: cat.correct,
          accuracy_rate: Math.round(cat.accuracy * 100 * 10) / 10
        }))

        // 转换技术专业分类数据
        this.techCategories = stats.by_tech_category.map(cat => ({
          tech_category: cat.category,
          total_count: cat.total,
          easy_count: 0, // 需要从题目统计获取
          medium_count: 0,
          hard_count: 0,
          practiced_count: cat.practiced,
          correct_count: cat.correct,
          accuracy_rate: Math.round(cat.accuracy * 100 * 10) / 10
        }))

        console.log('法律法规分类:', this.lawCategories)
        console.log('技术专业分类:', this.techCategories)
      } catch (error) {
        console.error('加载分类失败:', error)
        // 显示友好提示而不是alert
        this.$emit('error', '加载分类失败，请刷新页面重试')
      }
    },

    selectLawCategory(category) {
      this.selectedCategory = category
      this.categoryType = 'law'
    },

    selectTechCategory(category) {
      this.selectedCategory = category
      this.categoryType = 'tech'
    },

    async startPractice(mode) {
      try {
        let url = `${API_BASE}/questions`
        const params = {
          user_id: this.userId,
          limit: PRACTICE.DEFAULT_LIMIT * 2 // 类别练习默认加载更多题目
        }

        if (this.categoryType === 'law') {
          params.law_category = this.selectedCategory
        } else if (this.categoryType === 'tech') {
          params.tech_category = this.selectedCategory
        }

        if (mode === 'new') {
          params.exclude_practiced = true
        } else if (mode === 'wrong') {
          params.wrong_only = true
        }

        if (this.categoryType === 'law') {
          params.law_category = this.selectedCategory
        } else {
          params.tech_category = this.selectedCategory
        }

        if (mode === 'new') {
          params.exclude_practiced = true
        }

        const response = await api.get(url, { params })
        this.questions = response.data
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
      if (this.currentIndex < this.questions.length) {
        this.currentQuestion = this.questions[this.currentIndex]
        this.showResult = false
        this.questionStartTime = Date.now()
        this.selectedOptions = []
      } else {
        this.completePractice()
      }
    },

    toggleOption(key) {
      if (this.showResult) return

      const index = this.selectedOptions.indexOf(key)
      if (index > -1) {
        this.selectedOptions.splice(index, 1)
      } else {
        this.selectedOptions.push(key)
      }
    },

    async submitMultiAnswer() {
      if (this.selectedOptions.length === 0) {
        alert('请至少选择一个选项')
        return
      }

      const answer = this.selectedOptions.sort().join('')
      await this.submitAnswer(answer)
    },

    async submitAnswer(answer) {
      const timeSpent = Math.round((Date.now() - this.questionStartTime) / 1000)

      if (this.currentQuestion.question_type === '多项选择题') {
        const userAnswerSorted = this.selectedOptions.sort().join('')
        const correctAnswerSorted = this.currentQuestion.correct_answer.split('').sort().join('')
        this.isCorrect = userAnswerSorted === correctAnswerSorted
      } else {
        this.isCorrect = answer === this.currentQuestion.correct_answer
      }

      if (this.isCorrect) {
        this.correctCount++
      } else {
        this.wrongCount++
      }

      this.showResult = true

      // 记录练习历史（使用统一API或旧API）
      try {
        if (this.isUnifiedEnabled) {
          // 使用统一API
          const response = await api.post(`${API_BASE}/unified/practice/submit`, {
            user_id: this.userId,
            question_id: this.currentQuestion.id,
            user_answer: answer,
            is_correct: this.isCorrect,
            time_spent: timeSpent,
            practice_mode: 'category'
          })

          // 更新本地状态缓存
          if (response.data && response.data.state) {
            const state = new QuestionState(response.data.state)
            unifiedStateStore.questionStates.set(this.currentQuestion.id, state)
          }

          // 统一API已经处理了错题记录
          if (!this.isCorrect) {
            this.$emit('wrong-answer-recorded')
          }
        } else {
          // 使用旧API
          await api.post(`${API_BASE}/practice/history`, {
            user_id: this.userId,
            question_id: this.currentQuestion.id,
            user_answer: answer,
            is_correct: this.isCorrect,
            time_spent: timeSpent,
            practice_mode: 'category'
          })

          if (!this.isCorrect) {
            await api.post(`/api/wrong-answers`, {
              question_id: this.currentQuestion.id,
              user_id: this.userId
            })
            this.$emit('wrong-answer-recorded')
          }
        }

        this.$emit('update-stats')
      } catch (error) {
        console.error('记录练习失败:', error)
        // 显示用户友好的错误提示
        if (error.response?.status === 401) {
          alert('登录已过期，请重新登录')
        } else if (error.response?.status === 500) {
          alert('服务器错误，请稍后重试')
        } else {
          alert('记录答案失败: ' + (error.response?.data?.error || error.message || '未知错误'))
        }
      }
    },

    nextQuestion() {
      this.currentIndex++
      if (this.currentIndex < this.questions.length) {
        this.showQuestion()
      } else {
        this.completePractice()
      }
    },

    completePractice() {
      const accuracy = this.totalQuestions > 0
        ? Math.round((this.correctCount / this.totalQuestions) * 100)
        : 0

      alert(`🎉 练习完成！\n\n✓ 正确: ${this.correctCount} 题\n✗ 错误: ${this.wrongCount} 题\n📊 正确率: ${accuracy}%`)

      // 重置状态
      this.selectedCategory = null
      this.categoryType = null
      this.currentQuestion = null
      this.questions = []

      this.$emit('update-stats')
      this.$emit('complete')
    },

    exitPractice() {
      if (confirm('确定要退出练习吗？当前进度将会丢失。')) {
        this.selectedCategory = null
        this.categoryType = null
        this.currentQuestion = null
        this.questions = []
        this.currentIndex = 0
      }
    },

    getOptions(question) {
      const options = {}
      if (question.option_a) options.A = question.option_a
      if (question.option_b) options.B = question.option_b
      if (question.option_c) options.C = question.option_c
      if (question.option_d) options.D = question.option_d
      return options
    },

    getDifficultyText(difficulty) {
      const map = { easy: '简单', medium: '中等', hard: '困难' }
      return map[difficulty] || '未知'
    },

    getLawCategoryColor(category) {
      const colors = {
        '密码标准与规范': '#4CAF50',
        '密码法': '#2196F3',
        '商用密码管理条例': '#FF9800',
        '其他法律法规': '#9C27B0'
      }
      return colors[category] || '#2196F3'
    },

    getTechCategoryColor(category) {
      const colors = {
        '密码算法': '#F44336',
        '密码应用': '#4CAF50',
        '密码协议': '#2196F3',
        '密钥管理': '#FF9800',
        '密码产品': '#9C27B0'
      }
      return colors[category] || '#2196F3'
    },

    getLawCategoryIcon(category) {
      const icons = {
        '密码标准与规范': '📋',
        '密码法': '⚖️',
        '商用密码管理条例': '📜',
        '其他法律法规': '📚'
      }
      return icons[category] || '📚'
    },

    getTechCategoryIcon(category) {
      const icons = {
        '密码算法': '🔐',
        '密码应用': '💼',
        '密码协议': '🔒',
        '密钥管理': '🔑',
        '密码产品': '🛡️'
      }
      return icons[category] || '🔧'
    },

    getAccuracyClass(rate) {
      if (rate >= 80) return 'high'
      if (rate >= 60) return 'medium'
      return 'low'
    }
  },
}
</script>

<style scoped>
.category-practice {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* 顶部导航 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.header-left h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.btn-back {
  background: #f5f5f5;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-back:hover {
  background: #e0e0e0;
}

/* 分类选择 */
.category-section {
  margin-bottom: 2rem;
}

.section-title {
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: #333;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.category-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
  border: 2px solid transparent;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-header {
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.card-icon {
  font-size: 1.5rem;
}

.card-header h4 {
  margin: 0;
  flex: 1;
  font-size: 1.1rem;
}

.card-count {
  font-size: 0.9rem;
  color: #666;
  background: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.card-stats {
  padding: 1rem;
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.stat-value.practiced {
  color: #2196F3;
}

.stat-value.high {
  color: #4CAF50;
}

.stat-value.medium {
  color: #FF9800;
}

.stat-value.low {
  color: #f44336;
}

/* 练习设置 */
.practice-setup {
  max-width: 600px;
  margin: 2rem auto;
}

.setup-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.setup-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.setup-info {
  margin: 0 0 2rem 0;
  color: #666;
  text-align: center;
  font-size: 1rem;
}

.option-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.option-card:hover:not(:disabled) {
  border-color: #2196F3;
  background: #f5f9ff;
}

.option-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-icon {
  font-size: 1.5rem;
}

.option-content h5 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
}

.option-content p {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}

/* 答题区域 */
.question-area {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.question-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.category-tag {
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.law-tag {
  background: rgba(255, 255, 255, 0.2);
}

.tech-tag {
  background: rgba(255, 255, 255, 0.2);
}

.progress-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.score-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.btn-exit {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-exit:hover {
  background: rgba(255, 255, 255, 0.3);
}

.question-content {
  padding: 2rem;
}

.question-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.question-no {
  color: #666;
  font-size: 0.9rem;
}

.difficulty-tag {
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.difficulty-tag.easy {
  background: #e8f5e9;
  color: #4CAF50;
}

.difficulty-tag.medium {
  background: #fff3e0;
  color: #FF9800;
}

.difficulty-tag.hard {
  background: #ffebee;
  color: #F44336;
}

.question-text {
  font-size: 1.3rem;
  line-height: 1.7;
  margin-bottom: 2rem;
  color: #333;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-btn {
  padding: 1rem 1.25rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.option-btn:hover {
  border-color: #2196F3;
  background: #f5f9ff;
}

.option-label {
  font-weight: bold;
  color: #2196F3;
  min-width: 1.5rem;
}

.option-text {
  flex: 1;
}

.judgment {
  flex-direction: row;
  justify-content: center;
  gap: 2rem;
}

.judgment-btn {
  flex: 1;
  max-width: 200px;
  padding: 1.5rem;
  font-size: 1.2rem;
  justify-content: center;
}

.judgment-btn.correct:hover {
  border-color: #4CAF50;
  background: #e8f5e9;
}

.judgment-btn.wrong:hover {
  border-color: #F44336;
  background: #ffebee;
}

.multi-select .option-btn.selected {
  border-color: #2196F3;
  background: #e3f2fd;
}

.checkbox {
  font-size: 1.5rem;
  min-width: 2rem;
}

.submit-section {
  margin-top: 2rem;
  text-align: center;
}

.btn-submit {
  background: #2196F3;
  color: white;
  border: none;
  padding: 1rem 2.5rem;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-submit:hover:not(:disabled) {
  background: #1976D2;
}

.btn-submit:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 结果区域 */
.result-area {
  padding: 2rem;
  background: #f9f9f9;
}

.result-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.result-card.correct {
  border: 2px solid #4CAF50;
}

.result-card.wrong {
  border: 2px solid #F44336;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.result-icon {
  font-size: 2.5rem;
}

.result-title {
  font-size: 1.5rem;
  font-weight: bold;
}

.result-card.correct .result-title {
  color: #4CAF50;
}

.result-card.wrong .result-title {
  color: #F44336;
}

.correct-answer-section {
  margin: 1rem 0;
  padding: 1rem;
  background: #fff3e0;
  border-radius: 8px;
}

.correct-answer-label {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: #666;
}

.correct-answer-value {
  margin: 0;
  font-size: 1.2rem;
  font-weight: bold;
  color: #FF9800;
}

.answer-comparison {
  margin: 1rem 0;
}

.your-answer-label {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  color: #666;
}

.your-answer-value {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.knowledge-point {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background: #e3f2fd;
  border-radius: 8px;
}

.kp-icon {
  font-size: 1.2rem;
}

.kp-text {
  color: #1976D2;
  font-size: 0.95rem;
}

.action-buttons {
  margin-top: 2rem;
  text-align: center;
}

.btn-primary {
  background: #2196F3;
  color: white;
  border: none;
  padding: 1rem 2.5rem;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: #1976D2;
}

/* 桌面端优化 */
@media (min-width: 768px) {
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .header-left h2 {
    font-size: 1.8rem;
  }
}
</style>
