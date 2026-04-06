<template>
  <div class="smart-review">
    <div class="header">
      <h2>🧠 智能复习</h2>
      <button @click="goBack" class="btn-back">← 返回</button>
    </div>

    <!-- 复习统计 -->
    <div class="review-stats">
      <div class="stat-card">
        <div class="stat-value">{{ reviewStats.total_review_questions || 0 }}</div>
        <div class="stat-label">待复习题目</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ reviewStats.due_today || 0 }}</div>
        <div class="stat-label">今日到期</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ reviewStats.average_mastery || 0 }}%</div>
        <div class="stat-label">平均掌握度</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ reviewStats.mastered_count || 0 }}</div>
        <div class="stat-label">已掌握</div>
      </div>
    </div>

    <!-- 复习模式选择 -->
    <div v-if="!reviewMode && !currentQuestion" class="review-modes">
      <h3>选择复习模式</h3>

      <div class="mode-cards">
        <div @click="startReview('today')" class="mode-card">
          <div class="mode-icon">📅</div>
          <h4>今日复习</h4>
          <p>复习今天到期的题目</p>
          <div class="mode-count">{{ reviewStats.due_today || 0 }}题</div>
        </div>
        <div @click="startReview('recommend')" class="mode-card">
          <div class="mode-icon">⭐</div>
          <h4>智能推荐</h4>
          <p>优先复习即将遗忘的题目</p>
          <div class="mode-count">全部题目</div>
        </div>
        <div @click="startReview('all')" class="mode-card">
          <div class="mode-icon">📚</div>
          <h4>全部错题</h4>
          <p>复习所有错题</p>
          <div class="mode-count">{{ reviewStats.total_review_questions || 0 }}题</div>
        </div>
      </div>
    </div>

    <!-- 答题区域 -->
    <div v-if="currentQuestion" class="review-area">
      <div class="review-header">
        <span class="question-number">🔢 题号：{{ currentQuestion.question_no || currentQuestion.id }}</span>
        <span class="category-tag">{{ currentQuestion.law_category || currentQuestion.category }}</span>
        <span v-if="currentQuestion.tech_category" class="tech-tag">{{ currentQuestion.tech_category }}</span>
        <span class="review-count">
          第{{ (currentQuestion.review_count || 0) + 1 }}次复习
        </span>
        <span class="mastery-level">
          掌握度: {{ Math.round(currentQuestion.mastery_level * 100) }}%
        </span>
        <button @click="exitReview" class="btn-exit">✕ 退出</button>
      </div>

      <div class="question-content">
        <h3>{{ currentQuestion.question_text }}</h3>

        <!-- 未答题：显示答题选项 -->
        <div v-if="!hasAnswered">
          <!-- 判断题 -->
          <div v-if="currentQuestion.question_type === '判断题'" class="options">
            <button @click="submitAnswer('A')" class="option-btn">✅ 正确</button>
            <button @click="submitAnswer('B')" class="option-btn">❌ 错误</button>
          </div>

          <!-- 单选题 -->
          <div v-else-if="currentQuestion.question_type === '单项选择题'" class="options">
            <button
              v-for="(option, key) in getOptions(currentQuestion)"
              :key="key"
              v-show="option"
              @click="submitAnswer(key)"
              class="option-btn"
              :class="{ selected: userAnswer === key }"
            >
              {{ key }}. {{ option }}
            </button>
          </div>

          <!-- 多选题 -->
          <div v-else class="options multi-select">
            <button
              v-for="(option, key) in getOptions(currentQuestion)"
              :key="key"
              v-show="option"
              @click="toggleOption(key)"
              class="option-btn"
              :class="{ selected: selectedOptions.includes(key) }"
            >
              <span class="checkbox">{{ selectedOptions.includes(key) ? '☑' : '☐' }}</span>
              <span class="option-text">{{ key }}. {{ option }}</span>
            </button>
          </div>

          <!-- 多选题提交按钮 -->
          <div v-if="currentQuestion.question_type === '多项选择题'" class="submit-section">
            <button
              @click="submitMultiAnswer"
              class="btn-submit-multi"
              :disabled="selectedOptions.length === 0"
            >
              确认答案 (已选 {{ selectedOptions.length }} 项)
            </button>
          </div>
        </div>

        <!-- 已答题：显示结果和评分 -->
        <div v-if="hasAnswered">
          <!-- 答题结果 -->
          <div class="answer-result" :class="{ correct: isAnswerCorrect, wrong: !isAnswerCorrect }">
            <div class="result-icon">{{ isAnswerCorrect ? '✅' : '❌' }}</div>
            <div class="result-text">{{ isAnswerCorrect ? '回答正确！' : '回答错误！' }}</div>
          </div>

          <!-- 选项显示（标记对错） -->
          <div class="options review-options">
            <div
              v-for="(option, key) in getOptions(currentQuestion)"
              :key="key"
              class="option-display"
              :class="{
                'correct-option': currentQuestion.correct_answer.includes(key),
                'wrong-option': !isAnswerCorrect && isOptionSelected(key),
                'selected-option': isOptionSelected(key)
              }"
            >
              <span class="option-icon">
                <span v-if="currentQuestion.correct_answer.includes(key)">✅</span>
                <span v-else-if="!isAnswerCorrect && isOptionSelected(key)">❌</span>
                <span v-else></span>
              </span>
              <span class="option-text">{{ key }}. {{ option }}</span>
            </div>
          </div>

          <!-- 答案和评分 -->
          <div class="answer-area">
            <!-- 正确答案 -->
            <div class="correct-answer" :class="{ 'user-correct': isAnswerCorrect, 'user-wrong': !isAnswerCorrect }">
              <div class="answer-label">✅ 正确答案</div>
              <div class="answer-value">{{ formatCorrectAnswer(currentQuestion.correct_answer) }}</div>
            </div>

            <!-- 你的答案（如果答错） -->
            <div v-if="!isAnswerCorrect" class="your-answer">
              <div class="answer-label">❌ 你的答案</div>
              <div class="answer-value">{{ getYourAnswer() }}</div>
            </div>

            <!-- 答案解析 -->
            <div v-if="currentQuestion.explanation" class="explanation-display">
              <div class="explanation-label">📖 答案解析</div>
              <div class="explanation-text">{{ currentQuestion.explanation }}</div>
            </div>

            <!-- 知识点 -->
            <div v-if="currentQuestion.knowledge_point" class="knowledge-point-display">
              💡 知识点: {{ currentQuestion.knowledge_point }}
            </div>

            <!-- 评分 -->
            <div class="quality-rating">
              <h4>{{ !isAnswerCorrect ?
                '这道题答错了，需要加强复习！请选择掌握情况：' :
                '请评价你的掌握情况：' }}</h4>
              <div class="quality-options">
                <button
                  v-for="level in qualityLevels"
                  :key="level.value"
                  @click="submitReview(level.value)"
                  class="quality-btn"
                  :class="level.class"
                >
                  <div class="quality-score">{{ level.value }}</div>
                  <div class="quality-label">{{ level.label }}</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 完成提示 -->
    <div v-if="reviewComplete" class="complete-message">
      <div class="complete-icon">🎉</div>
      <h3>复习完成！</h3>
      <p>本次复习了 {{ reviewedCount }} 道题目</p>
      <button @click="reset" class="btn primary">返回</button>
    </div>

    <!-- 空状态 -->
    <div v-if="isEmpty && !reviewComplete" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>暂无待复习题目</h3>
      <p>继续练习，积累错题后再来复习吧！</p>
      <button @click="goBack" class="btn primary">开始练习</button>
    </div>
  </div>
</template>

<script>
import api from '../utils/api'
import { authStore } from '../store/auth'
import { unifiedStateStore } from '../stores/unifiedState'
import { QuestionState } from '../stores/unifiedState'
import { versionConfig } from '../config/version-config'

const API_BASE = '/api/v2'

export default {
	inject: ['authStore'],
  name: 'SmartReview',
  emits: ['back'],
  data() {
    return {
      reviewStats: {},
      reviewMode: null,
      reviewQuestions: [],
      currentIndex: 0,
      currentQuestion: null,
      reviewComplete: false,
      reviewedCount: 0,
      isEmpty: false,
      userAnswer: null,
      selectedOptions: [],
      hasAnswered: false,
      isAnswerCorrect: false,
      answerStartTime: null,
      qualityLevels: [
        { value: 5, label: '完美', class: 'perfect' },
        { value: 4, label: '良好', class: 'good' },
        { value: 3, label: '一般', class: 'fair' },
        { value: 2, label: '模糊', class: 'vague' },
        { value: 1, label: '困难', class: 'hard' },
        { value: 0, label: '忘记', class: 'forgot' }
      ],
      // 统一API相关
      useUnifiedAPI: false
    }
  },
  computed: {
    userId() {
      return this.authStore.getCurrentUserId()
    },
    isUnifiedEnabled() {
      return this.useUnifiedAPI && versionConfig.isFeatureEnabled('unifiedSuperMemo')
    }
  },
  async mounted() {
    // 检查是否使用统一API
    await this.checkAPIVersion()
    await this.loadReviewStats()
  },
  async activated() {
    console.log('SmartReview: 组件被激活，刷新数据')
    await this.loadReviewStats()
  },
  methods: {
    goBack() {
      this.$router.back()
    },
    async checkAPIVersion() {
      try {
        await versionConfig.init()
        this.useUnifiedAPI = versionConfig.useUnifiedAPI()
        console.log('统一API状态:', this.useUnifiedAPI)
      } catch (error) {
        console.error('检查API版本失败:', error)
        this.useUnifiedAPI = false
      }
    },

    async loadReviewStats() {
      try {
        if (this.isUnifiedEnabled) {
          // 使用统一统计API
          const stats = await unifiedStateStore.getUserStats()
          if (stats && stats.wrong_answers) {
            this.reviewStats = {
              total_review_questions: stats.wrong_answers.total,
              due_today: stats.wrong_answers.due_review,
              average_mastery: stats.wrong_answers.avg_mastery,
              mastered_count: stats.wrong_answers.mastered
            }
          }
        } else {
          // 使用旧版API
          const response = await api.get(`${API_BASE}/review/stats/${this.userId}`)
          this.reviewStats = response.data
        }
      } catch (error) {
        console.error('加载复习统计失败:', error)
        let errorMessage = '加载复习统计失败'
        if (error.response?.status === 401) {
          errorMessage = '登录已过期，请重新登录'
        } else if (error.response?.status === 500) {
          errorMessage = '服务器错误，请稍后重试'
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.message) {
          errorMessage = error.message
        }
        alert(errorMessage)
      }
    },

    async startReview(mode) {
      this.reviewMode = mode
      try {
        let questions = []

        if (this.isUnifiedEnabled) {
          // 使用统一API获取题目
          const url = `${API_BASE}/unified/practice/due-review/${this.userId}`
          const response = await api.get(url, {
            params: { limit: mode === 'all' ? 100 : 20 }
          })
          questions = response.data.questions
        } else {
          // 使用旧版API
          let url = `${API_BASE}/review/`
          if (mode === 'today') {
            url += `today/${this.userId}`
          } else if (mode === 'recommend') {
            url += `recommend/${this.userId}?limit=20`
          } else {
            url += `recommend/${this.userId}?limit=100`
          }
          const response = await api.get(url)
          questions = response.data
        }

        this.reviewQuestions = questions
        this.currentIndex = 0

        if (this.reviewQuestions.length === 0) {
          this.isEmpty = true
        } else {
          this.showQuestion()
        }
      } catch (error) {
        console.error('获取复习题目失败:', error)
        let errorMessage = '获取复习题目失败'
        if (error.response?.status === 401) {
          errorMessage = '登录已过期，请重新登录'
        } else if (error.response?.status === 404) {
          errorMessage = '没有可复习的题目'
        } else if (error.response?.status === 500) {
          errorMessage = '服务器错误，请稍后重试'
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.message) {
          errorMessage = error.message
        }
        alert(errorMessage)
      }
    },

    showQuestion() {
      if (this.currentIndex < this.reviewQuestions.length) {
        this.currentQuestion = this.reviewQuestions[this.currentIndex]
        this.hasAnswered = false
        this.userAnswer = null
        this.selectedOptions = []
        this.isAnswerCorrect = false
        // 开始计时
        this.answerStartTime = Date.now()
      } else {
        this.completeReview()
      }
    },

    getTimeSpent() {
      if (!this.answerStartTime) return 0
      return Math.round((Date.now() - this.answerStartTime) / 1000)
    },

    toggleOption(key) {
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
      this.checkAnswer(answer)
    },

    async submitAnswer(answer) {
      this.checkAnswer(answer)
    },

    checkAnswer(answer) {
      if (this.currentQuestion.question_type === '多项选择题') {
        const userAnswerSorted = this.selectedOptions.sort().join('')
        const correctAnswerSorted = this.currentQuestion.correct_answer.split('').sort().join('')
        this.isAnswerCorrect = userAnswerSorted === correctAnswerSorted
      } else {
        this.isAnswerCorrect = answer === this.currentQuestion.correct_answer
      }

      this.userAnswer = answer
      this.hasAnswered = true
    },

    getYourAnswer() {
      if (this.currentQuestion.question_type === '多项选择题') {
        return this.selectedOptions.sort().join('') || '未作答'
      }
      if (this.currentQuestion.question_type === '判断题') {
        return this.userAnswer === 'A' ? '正确' : '错误'
      }
      return this.userAnswer || '未作答'
    },

    isOptionSelected(key) {
      if (this.currentQuestion.question_type === '多项选择题') {
        return this.selectedOptions.includes(key)
      }
      return this.userAnswer === key
    },

    formatCorrectAnswer(answer) {
      if (this.currentQuestion.question_type === '判断题') {
        return answer === 'A' ? '正确' : '错误'
      }
      return answer.split('').join(' ')
    },

    exitReview() {
      if (confirm('确定要退出当前复习吗？进度将会保存。')) {
        this.reset()
      }
    },

    async submitReview(quality) {
      console.log('=== 智能复习提交 ===')
      console.log('用户ID:', this.userId)
      console.log('题目ID:', this.currentQuestion.question_id || this.currentQuestion.id)
      console.log('质量评分:', quality)
      console.log('使用统一API:', this.isUnifiedEnabled)

      try {
        const questionId = this.currentQuestion.question_id || this.currentQuestion.id
        if (!questionId) {
          throw new Error('题目ID不存在')
        }

        let response

        if (this.isUnifiedEnabled) {
          // 使用统一API提交
          // 质量评分映射：用户主观评分转换为正确性
          const isCorrect = this.isAnswerCorrect
          const timeSpent = this.getTimeSpent()

          response = await api.post(`${API_BASE}/unified/practice/submit`, {
            user_id: this.userId,
            question_id: questionId,
            user_answer: this.getYourAnswer(),
            is_correct: isCorrect,
            time_spent: timeSpent,
            practice_mode: 'review'
          })

          console.log('✅ 统一API提交成功:', response.data)

          // 更新本地状态缓存
          if (response.data.state) {
            const state = new QuestionState(response.data.state)
            unifiedStateStore.questionStates.set(questionId, state)
          }
        } else {
          // 使用旧版API
          response = await api.post(`${API_BASE}/review/submit`, {
            user_id: this.userId,
            question_id: questionId,
            quality: quality
          })

          console.log('✅ 旧版API提交成功:', response.data)
        }

        // 如果掌握了，显示提示
        if (response.data.mastered || response.data.supermemo?.removed_from_wrong_book) {
          alert('🎉 恭喜！该题目已掌握，从错题本移除')
        }

        // 更新统计
        await this.loadReviewStats()

        this.reviewedCount++
        this.currentIndex++
        this.showQuestion()
      } catch (error) {
        console.error('=== 提交复习失败 ===')
        console.error('错误:', error)

        // 显示详细的错误信息
        let errorMessage = '提交复习失败，请重试'
        if (error.response?.data?.error) {
          errorMessage = `提交失败: ${error.response.data.error}`
        } else if (error.message) {
          errorMessage = `提交失败: ${error.message}`
        }
        alert(errorMessage)
      }
    },

    completeReview() {
      this.reviewComplete = true
      this.currentQuestion = null
    },

    reset() {
      this.reviewMode = null
      this.reviewQuestions = []
      this.currentIndex = 0
      this.currentQuestion = null
      this.reviewComplete = false
      this.reviewedCount = 0
      this.isEmpty = false
      this.loadReviewStats()
    },

    getOptions(question) {
      const options = {}
      if (question.option_a) options.A = question.option_a
      if (question.option_b) options.B = question.option_b
      if (question.option_c) options.C = question.option_c
      if (question.option_d) options.D = question.option_d
      return options
    }
  },
}
</script>

<style scoped>
.smart-review {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h2 {
  margin: 0;
  color: #1a1a2e;
}

.btn-back {
  background: #f0f0f0;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.review-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #2196F3;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.5rem;
}

.review-modes h3 {
  margin-bottom: 1.5rem;
  color: #333;
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.mode-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.mode-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.mode-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.mode-card h4 {
  margin: 1rem 0 0.5rem 0;
  color: #333;
}

.mode-card p {
  color: #666;
  font-size: 0.9rem;
  margin: 0.5rem 0 1rem 0;
}

.mode-count {
  color: #2196F3;
  font-weight: bold;
  font-size: 1.1rem;
}

.review-area {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.question-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.category-tag {
  background: #2196F3;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.tech-tag {
  background: #FF9800;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.btn-exit {
  background: #f44336;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-exit:hover {
  background: #d32f2f;
}

.review-count, .mastery-level {
  color: #666;
  font-size: 0.9rem;
}

.question-content h3 {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-btn {
  padding: 1rem;
  border: 2px solid #2196F3;
  border-radius: 8px;
  background: white;
  color: #2196F3;
  cursor: pointer;
  transition: all 0.3s;
}

.option-btn:hover {
  background: #e3f2fd;
}

.option-btn.selected {
  background: #2196F3;
  color: white;
}

.option-display {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
}

.option-display.correct-option {
  background: #e8f5e9;
  border-color: #4CAF50;
}

.option-display.wrong-option {
  background: #ffebee;
  border-color: #f44336;
}

.option-display.selected-option {
  border-width: 3px;
}

.answer-result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.answer-result.correct {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
  color: #4CAF50;
  border: 2px solid #4CAF50;
}

.answer-result.wrong {
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
  color: #f44336;
  border: 2px solid #f44336;
}

.result-icon {
  font-size: 1.8rem;
}

.result-text {
  font-size: 1.1rem;
}

.review-options {
  margin-bottom: 1.5rem;
}

.option-display .option-icon {
  display: inline-block;
  width: 1.5rem;
  text-align: center;
  margin-right: 0.5rem;
  font-size: 1.1rem;
}

.answer-area {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;
}

.correct-answer {
  background: #e8f5e9;
  padding: 1.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.correct-answer.user-correct {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
  border-left: 4px solid #4CAF50;
}

.correct-answer.user-wrong {
  background: #FFF3E0;
  border-left: 4px solid #FF9800;
}

.your-answer {
  background: #FFEBEE;
  padding: 1.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #F44336;
}

.answer-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.answer-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2E7D32;
}

.your-answer .answer-value {
  color: #F44336;
}

.explanation-display {
  background: #F3E5F5;
  padding: 1.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #9C27B0;
}

.explanation-label {
  font-size: 0.9rem;
  color: #7B1FA2;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.explanation-text {
  font-size: 0.95rem;
  color: #4A148C;
  line-height: 1.8;
  white-space: pre-wrap;
}

.knowledge-point-display {
  background: #E3F2FD;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  border-left: 3px solid #2196F3;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  color: #1976D2;
}

.quality-rating h4 {
  text-align: center;
  margin-bottom: 1rem;
  color: #333;
}

.quality-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
}

.quality-btn {
  padding: 1rem 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.quality-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.quality-score {
  font-size: 1.5rem;
  font-weight: bold;
}

.quality-label {
  font-size: 0.85rem;
}

.quality-btn.perfect { border-color: #4CAF50; color: #4CAF50; }
.quality-btn.perfect:hover { background: #e8f5e9; }

.quality-btn.good { border-color: #8BC34A; color: #8BC34A; }
.quality-btn.good:hover { background: #f1f8e9; }

.quality-btn.fair { border-color: #FFC107; color: #FFC107; }
.quality-btn.fair:hover { background: #fffde7; }

.quality-btn.vague { border-color: #FF9800; color: #FF9800; }
.quality-btn.vague:hover { background: #fff3e0; }

.quality-btn.hard { border-color: #FF5722; color: #FF5722; }
.quality-btn.hard:hover { background: #fbe9e7; }

.quality-btn.forgot { border-color: #f44336; color: #f44336; }
.quality-btn.forgot:hover { background: #ffebee; }

.complete-message, .empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.complete-icon, .empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.complete-message h3, .empty-state h3 {
  margin-bottom: 1rem;
  color: #333;
}

.complete-message p, .empty-state p {
  color: #666;
  margin-bottom: 2rem;
}

.btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn.primary {
  background: #2196F3;
  color: white;
}

.btn.primary:hover {
  background: #1976D2;
}

.multi-select .option-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;
}

.multi-select .checkbox {
  font-size: 1.25rem;
  min-width: 1.5rem;
  text-align: center;
}

.multi-select .option-text {
  flex: 1;
}

.submit-section {
  margin-top: 1rem;
  text-align: center;
}

.btn-submit-multi {
  padding: 1rem 2rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-submit-multi:hover:not(:disabled) {
  background: #1976D2;
}

.btn-submit-multi:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
