<template>
  <div class="mock-exam">
    <div class="header">
      <h2>📝 模拟考试</h2>
      <button v-if="examState !== 'taking'" @click="$emit('back')" class="btn-back">← 返回</button>
    </div>

    <!-- 考试设置 -->
    <div v-if="examState === 'setup'" class="exam-setup">
      <h3>考试设置</h3>
      <div class="setup-form">
        <div class="form-group">
          <label>考试名称</label>
          <input v-model="examConfig.name" type="text" placeholder="输入考试名称" class="input-field" />
        </div>

        <div class="form-group">
          <label>题目数量</label>
          <input v-model.number="examConfig.totalQuestions" type="number" min="5" max="100" class="input-field" />
        </div>

        <div class="form-group">
          <label>法律法规分类</label>
          <div class="category-config">
            <label v-for="cat in lawCategories" :key="cat.law_category" class="category-checkbox">
              <input
                type="checkbox"
                v-model="examConfig.selectedLawCategories"
                :value="cat.law_category"
              />
              <span>{{ cat.law_category }}</span>
              <small>({{ cat.total_count }}题)</small>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>技术专业分类</label>
          <div class="category-config">
            <label v-for="cat in techCategories" :key="cat.tech_category" class="category-checkbox">
              <input
                type="checkbox"
                v-model="examConfig.selectedTechCategories"
                :value="cat.tech_category"
              />
              <span>{{ cat.tech_category }}</span>
              <small>({{ cat.total_count }}题)</small>
            </label>
          </div>
        </div>

        <button @click="startExam" class="btn primary start-btn">开始考试</button>
      </div>
    </div>

    <!-- 考试进行中 -->
    <div v-if="examState === 'taking'" class="exam-taking">
      <div class="exam-header">
        <div class="exam-info">
          <span class="exam-name">{{ currentExam.exam_name }}</span>
          <span class="timer">⏱️ {{ formatTime(elapsedTime) }}</span>
        </div>
        <div class="progress-info">
          <span>题目 {{ currentIndex + 1 }}/{{ examQuestions.length }}</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="question-area">
        <div class="question-header">
          <span v-if="currentQuestion.law_category" class="category-tag">{{ currentQuestion.law_category }}</span>
          <span v-if="currentQuestion.tech_category" class="tech-tag">{{ currentQuestion.tech_category }}</span>
          <span v-else-if="currentQuestion.category" class="category-tag">{{ currentQuestion.category }}</span>
          <span class="question-no-tag">题号 {{ currentQuestion.question_no }}</span>
          <span class="question-type">{{ currentQuestion.question_type }}</span>
        </div>

        <h3 class="question-text">{{ currentQuestion.question_text }}</h3>

        <div v-if="currentQuestion.question_type === '判断题'" class="options">
          <label class="option-label">
            <input type="radio" v-model="userAnswer" value="A" />
            <span>✅ 正确</span>
          </label>
          <label class="option-label">
            <input type="radio" v-model="userAnswer" value="B" />
            <span>❌ 错误</span>
          </label>
        </div>

        <!-- 单选题 -->
        <div v-else-if="currentQuestion.question_type === '单项选择题'" class="options">
          <label
            v-for="(option, key) in getOptions(currentQuestion)"
            :key="key"
            class="option-label"
          >
            <input type="radio" v-model="userAnswer" :value="key" />
            <span>{{ key }}. {{ option }}</span>
          </label>
        </div>

        <!-- 多选题 -->
        <div v-else class="options multi-select">
          <label
            v-for="(option, key) in getOptions(currentQuestion)"
            :key="key"
            class="option-label"
            :class="{ selected: selectedOptions.includes(key) }"
            @click.prevent="toggleOption(key)"
          >
            <span class="checkbox">{{ selectedOptions.includes(key) ? '☑' : '☐' }}</span>
            <span class="option-text">{{ key }}. {{ option }}</span>
          </label>
        </div>

        <div class="exam-actions">
          <button
            @click="prevQuestion"
            :disabled="currentIndex === 0"
            class="btn"
          >
            ← 上一题
          </button>
          <button
            v-if="currentIndex < examQuestions.length - 1"
            @click="nextQuestion"
            :disabled="!userAnswer"
            class="btn primary"
          >
            下一题 →
          </button>
          <button
            v-else
            @click="submitExam"
            :disabled="!userAnswer"
            class="btn submit-btn"
          >
            提交试卷
          </button>
        </div>

        <!-- 题目导航 -->
        <div class="question-nav">
          <div
            v-for="(q, index) in examQuestions"
            :key="q.id"
            @click="goToQuestion(index)"
            class="nav-item"
            :class="{
              'current': index === currentIndex,
              'answered': isQuestionAnswered(q, index),
              'unanswered': !isQuestionAnswered(q, index)
            }"
          >
            {{ index + 1 }}
          </div>
        </div>
      </div>
    </div>

    <!-- 考试结果 -->
    <div v-if="examState === 'result'" class="exam-result">
      <div class="result-header">
        <div class="result-icon" :class="{ pass: resultData.summary.score >= 60, fail: resultData.summary.score < 60 }">
          {{ resultData.summary.score >= 60 ? '🎉' : '📊' }}
        </div>
        <h2>{{ resultData.summary.score >= 60 ? '恭喜通过！' : '继续努力！' }}</h2>
        <p class="score">{{ resultData.summary.score }}分</p>
      </div>

      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-label">总题数</span>
          <span class="stat-value">{{ resultData.summary.total }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">正确</span>
          <span class="stat-value correct">{{ resultData.summary.correct }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">错误</span>
          <span class="stat-value wrong">{{ resultData.summary.wrong }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">用时</span>
          <span class="stat-value">{{ formatTime(resultData.exam.time_spent) }}</span>
        </div>
      </div>

      <!-- 错题解析 -->
      <div class="wrong-answers" v-if="wrongAnswers.length > 0">
        <h3>错题解析</h3>
        <div class="wrong-list">
          <div
            v-for="item in wrongAnswers"
            :key="item.question_id"
            class="wrong-item"
          >
            <h4>{{ item.question_text }}</h4>
            <p class="answer-comparison">
              <span class="wrong">你的答案: {{ item.user_answer }}</span>
              <span class="correct">正确答案: {{ item.correct_answer }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="result-actions">
        <button @click="reset" class="btn">返回</button>
        <button @click="reviewWrong" v-if="wrongAnswers.length > 0" class="btn primary">
          查看错题解析
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const API_BASE = '/api/v2'

export default {
  name: 'MockExam',
  emits: ['back'],
  data() {
    return {
      examState: 'setup', // setup, taking, result
      lawCategories: [],
      techCategories: [],
      examConfig: {
        name: '',
        totalQuestions: 20,
        selectedLawCategories: [],
        selectedTechCategories: []
      },
      currentExam: null,
      examQuestions: [],
      currentIndex: 0,
      currentQuestion: null,
      userAnswer: null,
      selectedOptions: [],  // 多选题选中的选项
      answers: {},
      startTime: null,
      elapsedTime: 0,
      timerInterval: null,
      resultData: null
    }
  },
  computed: {
    progressPercent() {
      return ((this.currentIndex + 1) / this.examQuestions.length) * 100
    },
    wrongAnswers() {
      if (!this.resultData) return []
      return this.resultData.answers.filter(a => !a.is_correct)
    }
  },
  async mounted() {
    await this.loadCategories()
  },
  beforeUnmount() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
  },
  methods: {
    async loadCategories() {
      try {
        const [lawRes, techRes] = await Promise.all([
          axios.get(`${API_BASE}/categories/law`),
          axios.get(`${API_BASE}/categories/tech`)
        ])
        this.lawCategories = lawRes.data
        this.techCategories = techRes.data
        // 默认全选
        this.examConfig.selectedLawCategories = this.lawCategories.map(c => c.law_category)
        this.examConfig.selectedTechCategories = this.techCategories.map(c => c.tech_category)
      } catch (error) {
        console.error('加载分类失败:', error)
      }
    },

    async startExam() {
      if (!this.examConfig.name) {
        alert('请输入考试名称')
        return
      }

      if (this.examConfig.selectedLawCategories.length === 0 && this.examConfig.selectedTechCategories.length === 0) {
        alert('请选择至少一个分类')
        return
      }

      try {
        const config = {
          total_questions: this.examConfig.totalQuestions,
          law_categories: this.examConfig.selectedLawCategories,
          tech_categories: this.examConfig.selectedTechCategories
        }

        const response = await axios.post(`${API_BASE}/exam`, {
          user_id: this.userId,
          exam_name: this.examConfig.name,
          config
        })

        this.currentExam = response.data.exam
        const questionIds = response.data.questions

        // 获取题目详情
        const questionsResponse = await axios.post(`${API_BASE}/questions/batch`, {
          ids: questionIds
        })

        this.examQuestions = questionsResponse.data
        this.examState = 'taking'
        this.startTime = Date.now()
        this.startTimer()
        this.showQuestion()
      } catch (error) {
        console.error('创建考试失败:', error)
        alert('创建考试失败，请重试')
      }
    },

    startTimer() {
      this.timerInterval = setInterval(() => {
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000)
      }, 1000)
    },

    showQuestion() {
      this.currentQuestion = this.examQuestions[this.currentIndex]
      this.userAnswer = this.answers[this.currentIndex] || null

      // 多选题：处理已保存的答案
      if (this.currentQuestion.question_type === '多项选择题') {
        if (Array.isArray(this.answers[this.currentIndex])) {
          this.selectedOptions = [...this.answers[this.currentIndex]]
        } else {
          this.selectedOptions = []
        }
      } else {
        this.selectedOptions = []
      }
    },

    toggleOption(key) {
      const index = this.selectedOptions.indexOf(key)
      if (index > -1) {
        this.selectedOptions.splice(index, 1)
      } else {
        this.selectedOptions.push(key)
      }
    },

    goToQuestion(index) {
      this.saveCurrentAnswer()
      this.currentIndex = index
      this.showQuestion()
    },

    prevQuestion() {
      this.saveCurrentAnswer()
      this.currentIndex--
      this.showQuestion()
    },

    nextQuestion() {
      if (!this.hasValidAnswer()) return
      this.saveCurrentAnswer()
      this.currentIndex++
      this.showQuestion()
    },

    saveCurrentAnswer() {
      // 多选题保存数组，单选题和判断题保存字符串
      if (this.currentQuestion.question_type === '多项选择题') {
        this.answers[this.currentIndex] = [...this.selectedOptions]
      } else {
        this.answers[this.currentIndex] = this.userAnswer
      }
    },

    hasValidAnswer() {
      if (this.currentQuestion.question_type === '多项选择题') {
        return this.selectedOptions.length > 0
      }
      return !!this.userAnswer
    },

    async submitExam() {
      if (!this.hasValidAnswer()) return
      this.saveCurrentAnswer()

      if (!confirm('确定要提交试卷吗？')) return

      clearInterval(this.timerInterval)

      try {
        const answersArray = this.examQuestions.map((q, index) => {
          let userAnswer = this.answers[index] || ''
          // 多选题：将数组转换为排序后的字符串
          if (q.question_type === '多项选择题' && Array.isArray(userAnswer)) {
            userAnswer = userAnswer.sort().join('')
          }
          return {
            question_id: q.id,
            user_answer: userAnswer
          }
        })

        const response = await axios.post(`${API_BASE}/exam/${this.currentExam.id}/submit`, {
          answers: answersArray,
          time_spent: this.elapsedTime
        })

        this.resultData = response.data
        this.examState = 'result'
      } catch (error) {
        console.error('提交试卷失败:', error)
        alert('提交失败，请重试')
      }
    },

    reset() {
      this.examState = 'setup'
      this.currentExam = null
      this.examQuestions = []
      this.currentIndex = 0
      this.currentQuestion = null
      this.userAnswer = null
      this.selectedOptions = []
      this.answers = {}
      this.elapsedTime = 0
      this.resultData = null
    },

    reviewWrong() {
      // 可以添加查看错题详情的功能
      this.$emit('review-wrong', this.wrongAnswers)
    },

    getOptions(question) {
      const options = {}
      if (question.option_a) options.A = question.option_a
      if (question.option_b) options.B = question.option_b
      if (question.option_c) options.C = question.option_c
      if (question.option_d) options.D = question.option_d
      return options
    },

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    },

    isQuestionAnswered(question, index) {
      const answer = this.answers[index]
      if (question.question_type === '多项选择题') {
        return Array.isArray(answer) && answer.length > 0
      }
      return !!answer
    }
  },
  props: {
    userId: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>
.mock-exam {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.btn-back {
  background: #f0f0f0;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.exam-setup {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.setup-form {
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #333;
}

.input-field {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
}

.category-config {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.category-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.category-checkbox:hover {
  background: #f5f5f5;
}

.start-btn {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
}

.exam-taking {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.exam-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.exam-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.exam-name {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
}

.timer {
  font-size: 1.5rem;
  font-weight: bold;
  color: #f44336;
  font-family: monospace;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2196F3;
  transition: width 0.3s ease;
}

.question-area {
  max-width: 700px;
  margin: 0 auto;
}

.question-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
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

.question-no-tag {
  background: #4CAF50;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.question-type {
  background: #FF9800;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.question-text {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.option-label:hover {
  border-color: #2196F3;
  background: #f5f5f5;
}

.option-label input[type="radio"] {
  width: 20px;
  height: 20px;
}

.exam-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  background: #f0f0f0;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: #2196F3;
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: #1976D2;
}

.submit-btn {
  background: #4CAF50;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #45a049;
}

.question-nav {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 0.5rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;
}

.nav-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.nav-item.current {
  border-color: #2196F3;
  background: #e3f2fd;
}

.nav-item.answered {
  border-color: #4CAF50;
  background: #e8f5e9;
}

.nav-item.unanswered {
  border-color: #f44336;
}

.exam-result {
  background: white;
  padding: 3rem 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.result-header {
  margin-bottom: 3rem;
}

.result-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.score {
  font-size: 4rem;
  font-weight: bold;
  margin: 1rem 0;
}

.result-icon.pass .score {
  color: #4CAF50;
}

.result-icon.fail .score {
  color: #f44336;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}

.stat-value.correct {
  color: #4CAF50;
}

.stat-value.wrong {
  color: #f44336;
}

.wrong-answers {
  text-align: left;
  margin-bottom: 3rem;
}

.wrong-answers h3 {
  margin-bottom: 1.5rem;
  color: #333;
}

.wrong-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.wrong-item {
  padding: 1rem;
  background: #ffebee;
  border-left: 4px solid #f44336;
  border-radius: 4px;
}

.wrong-item h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.answer-comparison {
  display: flex;
  gap: 2rem;
  font-size: 0.9rem;
}

.answer-comparison .wrong {
  color: #f44336;
}

.answer-comparison .correct {
  color: #4CAF50;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

@media (max-width: 768px) {
  .exam-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .exam-actions {
    flex-direction: column;
  }

  .result-stats {
    gap: 1.5rem;
  }
}

/* 多选题样式 */
.multi-select .option-label {
  cursor: pointer;
  user-select: none;
}

.multi-select .option-label.selected {
  border-color: #2196F3;
  background: #e3f2fd;
}

.multi-select .checkbox {
  font-size: 1.25rem;
  min-width: 1.5rem;
  text-align: center;
}

.multi-select .option-text {
  flex: 1;
}
</style>
