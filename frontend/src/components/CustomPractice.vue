<template>
  <div class="custom-practice-view">
    <!-- 题号选择阶段 -->
    <div v-if="!practiceStarted" class="selection-phase">
      <div class="selector-container">
        <h2>🎯 专项练习复习</h2>
        <p class="subtitle">选择或输入要练习的题目</p>

        <!-- 快捷选择 -->
        <div class="quick-select-section">
          <h3>快捷选择</h3>
          <div class="quick-select-buttons">
            <button @click="selectWrongAnswers" class="quick-btn wrong-btn">
              📕 从错题本选择
            </button>
            <button @click="selectFavoritedQuestions" class="quick-btn favorite-btn">
              ⭐ 从收藏选择
            </button>
            <button @click="selectNotedQuestions" class="quick-btn note-btn">
              📝 从笔记选择
            </button>
          </div>
        </div>

        <!-- 手动输入 -->
        <div class="manual-input-section">
          <h3>手动输入题号</h3>
          <div class="input-group">
            <textarea
              v-model="questionIdsInput"
              placeholder="输入题号，用逗号、空格或换行分隔&#10;例如：1, 2, 3, 5, 8, 13&#10;或每行一个题号"
              class="question-ids-textarea"
              rows="4"
            ></textarea>
            <div class="input-actions">
              <span class="count-hint">已输入 {{ parsedQuestionIds.length }} 个题号</span>
              <button @click="clearInput" class="btn-clear">清空</button>
            </div>
          </div>
        </div>

        <!-- 文件名搜索 -->
        <div class="filename-search-section">
          <h3>📄 按文件名搜索</h3>
          <p class="section-desc">搜索题干中包含指定文件名的题目（如：密码法、商用密码管理条例等）</p>
          <div class="search-group">
            <div class="search-input-wrapper">
              <input
                v-model="filenameSearchInput"
                @keyup.enter="searchByFilename"
                placeholder="输入文件名，例如：密码法"
                class="filename-input"
                type="text"
              />
              <button
                @click="searchByFilename"
                :disabled="!filenameSearchInput.trim() || searchingByFilename"
                class="btn-search"
              >
                {{ searchingByFilename ? '搜索中...' : '🔍 搜索' }}
              </button>
            </div>
            <div v-if="filenameSearchResults.length > 0" class="search-results-info">
              找到 {{ filenameSearchResults.length }} 道题目
              <button @click="addSearchResults" class="btn-add-results">
                添加到练习列表
              </button>
              <button @click="clearSearchResults" class="btn-clear-search">
                清空搜索结果
              </button>
            </div>
            <div v-if="filenameSearchResults.length > 0" class="search-results-preview">
              <div class="results-header">
                <span>搜索结果预览（前20条）：</span>
              </div>
              <div class="results-list">
                <div
                  v-for="question in filenameSearchResults.slice(0, 20)"
                  :key="question.id"
                  class="result-item"
                >
                  <span class="result-number">#{{ question.question_no }}</span>
                  <span class="result-text">{{ truncateText(question.question_text, 80) }}</span>
                </div>
                <div v-if="filenameSearchResults.length > 20" class="more-results">
                  还有 {{ filenameSearchResults.length - 20 }} 道题目...
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 题号预览 -->
        <div v-if="parsedQuestionIds.length > 0" class="preview-section">
          <h3>已选择的题目 ({{ parsedQuestionIds.length }}题)</h3>
          <div class="question-chips">
            <span
              v-for="id in parsedQuestionIds.slice(0, 20)"
              :key="id"
              class="question-chip"
            >
              #{{ id }}
              <button @click="removeQuestionId(id)" class="chip-remove">×</button>
            </span>
            <span v-if="parsedQuestionIds.length > 20" class="more-chip">
              还有 {{ parsedQuestionIds.length - 20 }} 个...
            </span>
          </div>
        </div>

        <!-- 开始练习按钮 -->
        <div class="start-section">
          <button
            @click="startPractice"
            :disabled="parsedQuestionIds.length === 0"
            class="btn-start-practice"
          >
            🚀 开始练习 ({{ parsedQuestionIds.length }}题)
          </button>
        </div>
      </div>
    </div>

    <!-- 练习阶段 -->
    <div v-else class="practice-phase">
      <div class="practice-header">
        <button @click="exitPractice" class="btn-exit">← 返回</button>
        <h3>专项练习</h3>
        <div class="progress-info">
          {{ currentIndex + 1 }} / {{ practiceQuestions.length }}
        </div>
      </div>

      <!-- 题目区域 -->
      <div v-if="currentQuestion" class="question-area">
        <div class="question-meta">
          <span class="meta-tag number-meta">🔢 题号：{{ currentQuestion.question_no || currentQuestion.id }}</span>
          <span v-if="currentQuestion.practice_status === 'practiced'" class="meta-tag practiced-meta">
            已练习
          </span>
          <button
            @click="toggleFavorite"
            class="favorite-btn"
            :class="{ active: isFavorite }"
            :title="isFavorite ? '取消收藏' : '添加收藏'"
          >
            {{ isFavorite ? '⭐ 已收藏' : '☆ 收藏' }}
          </button>
        </div>

        <h3>{{ currentQuestion.question_text }}</h3>

        <!-- 选项 -->
        <div v-if="currentQuestion.question_type === '判断题'" class="options">
          <button
            @click="submitAnswer('A')"
            class="option-btn"
            :class="{ selected: userAnswer === 'A' }"
          >
            ✅ 正确
          </button>
          <button
            @click="submitAnswer('B')"
            class="option-btn"
            :class="{ selected: userAnswer === 'B' }"
          >
            ❌ 错误
          </button>
        </div>

        <div v-else-if="currentQuestion.question_type === '单项选择题'" class="options">
          <button
            v-for="(option, key) in getOptions(currentQuestion)"
            :key="key"
            @click="submitAnswer(key)"
            class="option-btn"
            :class="{ selected: userAnswer === key }"
          >
            {{ key }}. {{ option }}
          </button>
        </div>

        <div v-else class="options multi-select">
          <button
            v-for="(option, key) in getOptions(currentQuestion)"
            :key="key"
            @click="toggleOption(key)"
            class="option-btn"
            :class="{ selected: selectedOptions.includes(key) }"
          >
            <span class="checkbox">{{ selectedOptions.includes(key) ? '☑' : '☐' }}</span>
            <span class="option-text">{{ key }}. {{ option }}</span>
          </button>
        </div>

        <!-- 多选题提交 -->
        <div v-if="currentQuestion.question_type === '多项选择题' && !showResult" class="submit-section">
          <button
            @click="submitMultiAnswer"
            class="btn-submit-multi"
            :disabled="selectedOptions.length === 0"
          >
            确认答案 (已选 {{ selectedOptions.length }} 项)
          </button>
        </div>

        <!-- 结果显示 -->
        <div v-if="showResult" class="result-section">
          <div :class="{ correct: isCorrect, wrong: !isCorrect }" class="result-message">
            {{ isCorrect ? '✅ 回答正确！' : '❌ 回答错误！' }}
          </div>
          <p v-if="!isCorrect" class="correct-answer">
            正确答案: <strong>{{ currentQuestion.correct_answer }}</strong>
          </p>

          <!-- 详细解析 -->
          <div v-if="currentQuestion.explanation" class="explanation-box">
            <h4>📖 详细解析</h4>
            <div class="explanation-content">{{ currentQuestion.explanation }}</div>
          </div>

          <!-- 笔记功能（答题后始终可用，支持Markdown） -->
          <div v-if="showResult" class="note-section">
            <button
              @click="showNoteInput = !showNoteInput"
              class="btn-note"
              :class="{ active: showNoteInput || currentNote }"
            >
              {{ showNoteInput || currentNote ? '📝 编辑笔记 (支持Markdown)' : '📝 添加笔记 (支持Markdown)' }}
            </button>

            <!-- 笔记编辑区 -->
            <div v-if="showNoteInput" class="note-input-area">
              <!-- Markdown语法提示 -->
              <div class="markdown-hint">
                <span class="hint-title">💡 支持Markdown语法：</span>
                <span class="hint-examples">
                  **粗体** *斜体* `代码` # 标题 - 列表 > 引用
                </span>
                <button @click="showPreview = !showPreview" class="btn-toggle-preview">
                  {{ showPreview ? '编辑' : '预览' }}
                </button>
              </div>

              <!-- 编辑模式 -->
              <textarea
                v-if="!showPreview"
                v-model="currentNote"
                placeholder="记录笔记、解题思路、重要知识点...

支持Markdown语法：
- **粗体** 或 __粗体__
- *斜体* 或 _斜体_
- `代码`
- # 标题
- - 无序列表
- 1. 有序列表
- > 引用
- [链接](url)"
                class="note-textarea"
                rows="6"
              ></textarea>

              <!-- 预览模式 -->
              <div v-else class="note-preview">
                <MarkdownRenderer :content="currentNote" />
              </div>

              <div class="note-actions">
                <button @click="saveNote" :disabled="savingNote || !currentNote.trim()" class="btn-save-note">
                  {{ savingNote ? '保存中...' : '保存笔记' }}
                </button>
                <button @click="showNoteInput = false" class="btn-cancel-note">取消</button>
              </div>
            </div>

            <!-- 笔记显示区（使用Markdown渲染） -->
            <div v-else-if="currentNote && !showNoteInput" class="note-display">
              <MarkdownRenderer :content="currentNote" />
              <button @click="showNoteInput = true; showPreview = false" class="btn-edit-note">修改</button>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="result-actions">
            <button @click="nextQuestion" class="btn-next">
              {{ currentIndex >= practiceQuestions.length - 1 ? '查看结果' : '下一题 →' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 完成总结 -->
      <div v-else-if="practiceComplete" class="completion-summary">
        <div class="summary-card">
          <h2>🎉 练习完成！</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">总题数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value correct">{{ stats.correct }}</div>
              <div class="stat-label">正确</div>
            </div>
            <div class="stat-item">
              <div class="stat-value wrong">{{ stats.wrong }}</div>
              <div class="stat-label">错误</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.accuracy }}%</div>
              <div class="stat-label">正确率</div>
            </div>
          </div>
          <div class="summary-actions">
            <button @click="exitPractice" class="btn-back">返回选择</button>
            <button @click="retryWrong" v-if="stats.wrong > 0" class="btn-retry">
              重练错题 ({{ stats.wrong }}题)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import MarkdownRenderer from './MarkdownRenderer.vue'

const API_BASE = '/api'

export default {
  name: 'CustomPractice',
  components: {
    MarkdownRenderer
  },
  emits: ['back', 'practice-completed'],
  props: {
    userId: {
      type: String,
      required: true
    },
    questionIds: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      // 选择阶段
      questionIdsInput: '',
      practiceStarted: false,

      // 文件名搜索
      filenameSearchInput: '',
      filenameSearchResults: [],
      searchingByFilename: false,

      // 练习阶段
      practiceQuestions: [],
      currentIndex: 0,
      currentQuestion: null,

      // 答题状态
      showResult: false,
      isCorrect: false,
      userAnswer: null,
      selectedOptions: [],
      questionStartTime: null,

      // 笔记
      showNoteInput: false,
      currentNote: '',
	      showPreview: false,
      savingNote: false,

      // 收藏
      isFavorite: false,

      // 结果
      practiceComplete: false,
      questionResults: [], // 记录每道题的结果
      stats: {
        total: 0,
        correct: 0,
        wrong: 0,
        accuracy: 0
      }
    }
  },

  computed: {
    parsedQuestionIds() {
      if (!this.questionIdsInput) return []

      // 支持多种分隔符：逗号、空格、换行
      const ids = this.questionIdsInput
        .split(/[,\s\n]+/)
        .map(id => id.trim())
        .filter(id => id && !isNaN(id))
        .map(id => parseInt(id))
        .filter(id => id > 0)

      // 去重
      return [...new Set(ids)]
    }
  },
  mounted() {
    // 如果从外部传入questionIds，自动开始练习
    if (this.questionIds) {
      this.questionIdsInput = this.questionIds
      this.startPractice()
    }
  },

  methods: {
    // 快捷选择：从错题本
    async selectWrongAnswers() {
      try {
        const response = await axios.get(`${API_BASE}/wrong-answers/${this.userId}`)
        // 后端直接返回数组，不是包含wrong_answers字段的对象
        const wrongQuestions = Array.isArray(response.data) ? response.data : []

        if (wrongQuestions.length === 0) {
          alert('错题本为空')
          return
        }

        const ids = wrongQuestions.map(w => w.question_id)
        this.questionIdsInput = ids.join(', ')
      } catch (error) {
        console.error('获取错题本失败:', error)
        alert('获取错题本失败')
      }
    },

    // 快捷选择：从收藏
    async selectFavoritedQuestions() {
      try {
        const response = await axios.get(`${API_BASE}/favorites/${this.userId}`)
        // 后端返回 {favorites: [...], total: n}
        const favorites = response.data.favorites || []

        if (favorites.length === 0) {
          alert('没有收藏的题目')
          return
        }

        const ids = favorites.map(f => f.question_id)
        this.questionIdsInput = ids.join(', ')
      } catch (error) {
        console.error('获取收藏失败:', error)
        alert('获取收藏失败')
      }
    },

    // 快捷选择：从笔记
    async selectNotedQuestions() {
      try {
        const response = await axios.get(`${API_BASE}/notes/${this.userId}`)
        // 后端直接返回数组，不是包含notes字段的对象
        const notes = Array.isArray(response.data) ? response.data : []

        if (notes.length === 0) {
          alert('没有添加笔记的题目')
          return
        }

        const ids = notes.map(n => n.question_id)
        this.questionIdsInput = ids.join(', ')
      } catch (error) {
        console.error('获取笔记失败:', error)
        alert('获取笔记失败')
      }
    },

    // 按文件名搜索题目
    async searchByFilename() {
      if (!this.filenameSearchInput.trim()) {
        alert('请输入文件名')
        return
      }

      this.searchingByFilename = true
      try {
        const response = await axios.get('/api/questions/search', {
          params: {
            filename: this.filenameSearchInput.trim(),
            limit: 500
          }
        })

        if (response.data.success && response.data.data.length > 0) {
          this.filenameSearchResults = response.data.data
          console.log(`✅ 找到 ${response.data.data.length} 道题目`)
        } else {
          alert('未找到包含该文件名的题目')
          this.filenameSearchResults = []
        }
      } catch (error) {
        console.error('搜索失败:', error)
        alert('搜索失败，请重试')
        this.filenameSearchResults = []
      } finally {
        this.searchingByFilename = false
      }
    },

    // 将搜索结果添加到练习列表
    addSearchResults() {
      if (this.filenameSearchResults.length === 0) return

      const questionNos = this.filenameSearchResults.map(q => q.question_no)
      const existingIds = this.parsedQuestionIds

      // 合并题号，去重
      const allIds = [...new Set([...existingIds, ...questionNos])]
      this.questionIdsInput = allIds.join(', ')

      // 清空搜索结果
      this.clearSearchResults()

      console.log(`✅ 已添加 ${questionNos.length} 道题目到练习列表`)
    },

    // 清空搜索结果
    clearSearchResults() {
      this.filenameSearchResults = []
      this.filenameSearchInput = ''
    },

    // 截断文本
    truncateText(text, maxLength) {
      if (!text) return ''
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + '...'
    },

    // 清空输入
    clearInput() {
      this.questionIdsInput = ''
    },

    // 移除单个题号
    removeQuestionId(id) {
      const ids = this.parsedQuestionIds.filter(qid => qid !== id)
      this.questionIdsInput = ids.join(', ')
    },

    // 开始练习
    async startPractice() {
      if (this.parsedQuestionIds.length === 0) {
        alert('请先选择题目')
        return
      }

      try {
        // 获取题目
        const response = await axios.get(`${API_BASE}/questions/by-ids`, {
          params: { ids: this.parsedQuestionIds.join(',') }
        })

        // 检查是否成功获取到题目
        if (!response.data.questions || response.data.questions.length === 0) {
          alert('未找到题目，请检查题号是否正确')
          return
        }

        this.practiceQuestions = response.data.questions
        this.practiceStarted = true
        this.practiceComplete = false
        this.currentIndex = 0
        this.questionResults = []
        this.stats = { total: 0, correct: 0, wrong: 0, accuracy: 0 }
        this.loadQuestion(0)
      } catch (error) {
        console.error('加载题目失败:', error)
        alert('加载题目失败: ' + (error.response?.data?.error || error.message))
      }
    },

    // 加载题目
    loadQuestion(index) {
      if (index < 0 || index >= this.practiceQuestions.length) {
        this.practiceComplete = true
        this.currentQuestion = null
        return
      }

      const question = this.practiceQuestions[index]
      this.currentQuestion = question

      // 重置状态
      this.showResult = false
      this.isCorrect = false
      this.userAnswer = null
      this.selectedOptions = []
      this.questionStartTime = Date.now()
      this.showNoteInput = false
      this.currentNote = ''
      this.isFavorite = false

      // 加载笔记和收藏状态
      this.loadNote()
      this.checkFavorite()
    },

    // 检查收藏状态
    async checkFavorite() {
      if (!this.currentQuestion) return

      try {
        const response = await axios.get(`${API_BASE}/favorite/${this.userId}/${this.currentQuestion.id}`)
        this.isFavorite = response.data.is_favorite || false
      } catch (error) {
        // 如果404错误，说明未收藏
        if (error.response?.status === 404) {
          this.isFavorite = false
        } else {
          console.error('检查收藏状态失败:', error)
        }
      }
    },

    // 切换收藏状态
    async toggleFavorite() {
      if (!this.currentQuestion) return

      try {
        if (this.isFavorite) {
          // 取消收藏
          await axios.delete(`${API_BASE}/favorite/${this.userId}/${this.currentQuestion.id}`)
          this.isFavorite = false
          // 取消收藏成功，无需弹窗提示
        } else {
          // 添加收藏
          await axios.post(`${API_BASE}/favorite`, {
            user_id: this.userId,
            question_id: this.currentQuestion.id
          })
          this.isFavorite = true
          // 添加收藏成功，无需弹窗提示
        }
      } catch (error) {
        console.error('收藏操作失败:', error)
        alert(this.isFavorite ? '取消收藏失败' : '添加收藏失败')
      }
    },

    // 加载笔记
    async loadNote() {
      if (!this.currentQuestion) return

      try {
        const response = await axios.get(`${API_BASE}/notes/${this.userId}/${this.currentQuestion.id}`)
        if (response.data.note) {
          this.currentNote = response.data.note
        }
      } catch (error) {
        console.error('加载笔记失败:', error)
      }
    },

    // 多选题切换选项
    toggleOption(key) {
      if (this.showResult) return

      const index = this.selectedOptions.indexOf(key)
      if (index > -1) {
        this.selectedOptions.splice(index, 1)
      } else {
        this.selectedOptions.push(key)
      }
    },

    // 多选题提交
    async submitMultiAnswer() {
      if (this.selectedOptions.length === 0) {
        alert('请至少选择一个选项')
        return
      }

      const answer = this.selectedOptions.sort().join('')
      await this.submitAnswer(answer)
    },

    // 提交答案
    async submitAnswer(answer) {
      const timeSpent = Math.round((Date.now() - this.questionStartTime) / 1000)

      // 判断正确性
      if (this.currentQuestion.question_type === '多项选择题') {
        const userAnswerSorted = this.selectedOptions.sort().join('')
        const correctAnswerSorted = this.currentQuestion.correct_answer.split('').sort().join('')
        this.isCorrect = userAnswerSorted === correctAnswerSorted
      } else {
        this.isCorrect = answer === this.currentQuestion.correct_answer
      }

      this.showResult = true

      // 记录本题结果
      this.questionResults.push({
        questionId: this.currentQuestion.id,
        isCorrect: this.isCorrect,
        userAnswer: answer
      })

      // 更新统计
      this.stats.total++
      if (this.isCorrect) {
        this.stats.correct++
      } else {
        this.stats.wrong++
      }
      this.stats.accuracy = this.stats.total > 0
        ? Math.round((this.stats.correct / this.stats.total) * 100)
        : 0

      // 同步数据到各个系统
      try {
        // 1. 记录练习历史（统一API）
        await axios.post(`${API_BASE}/practice/history`, {
          user_id: this.userId,
          question_id: this.currentQuestion.id,
          user_answer: answer,
          is_correct: this.isCorrect,
          time_spent: timeSpent,
          practice_mode: 'custom'
        })

        // 2. 调用智能复习API（更新SuperMemo数据、调整错题本）
        // 计算质量评分(0-5)
        let quality
        if (this.isCorrect) {
          // 答对了：根据答题速度和质量评分
          if (timeSpent < 10) {
            quality = 5 // 快速且正确
          } else if (timeSpent < 30) {
            quality = 4 // 正常速度且正确
          } else {
            quality = 3 // 慢但正确
          }
        } else {
          // 答错了：根据情况评分
          if (timeSpent < 30) {
            quality = 2 // 快速但错误（可能是猜测）
          } else {
            quality = 1 // 花时间但仍错误
          }
        }

        // 调用智能复习API
        try {
          const reviewResponse = await axios.post(`${API_BASE}/review/submit`, {
            user_id: this.userId,
            question_id: this.currentQuestion.id,
            quality: quality
          })

          if (reviewResponse.data.mastered) {
            console.log('✅ 题目已掌握，已从错题本移除')
          }
        } catch (reviewError) {
          console.error('智能复习API调用失败:', reviewError)
          // 智能复习失败不影响继续练习
        }

      } catch (error) {
        console.error('记录练习失败:', error)
        // 只记录错误，不中断练习流程
      }
    },

    // 下一题
    nextQuestion() {
      if (this.currentIndex >= this.practiceQuestions.length - 1) {
        // 最后一题，显示完成总结
        this.practiceComplete = true
        this.currentQuestion = null
        this.showResult = false
      } else {
        this.currentIndex++
        this.loadQuestion(this.currentIndex)
      }
    },

    // 保存笔记
    async saveNote() {
      if (!this.currentNote.trim()) {
        alert('请输入笔记内容')
        return
      }

      this.savingNote = true
      try {
        await axios.post(`${API_BASE}/notes`, {
          user_id: this.userId,
          question_id: this.currentQuestion.id,
          note: this.currentNote
        })
        this.showNoteInput = false
        // 笔记保存成功，无需弹窗提示
      } catch (error) {
        console.error('保存笔记失败:', error)
        alert('保存笔记失败，请重试')
      } finally {
        this.savingNote = false
      }
    },

    // 重练错题
    retryWrong() {
      // 从questionResults中找出答错的题目ID
      const wrongQuestionIds = this.questionResults
        .filter(result => !result.isCorrect)
        .map(result => result.questionId)

      if (wrongQuestionIds.length === 0) {
        alert('没有错题需要重练')
        return
      }

      // 过滤出答错的题目
      const wrongQuestions = this.practiceQuestions.filter(q =>
        wrongQuestionIds.includes(q.id)
      )

      if (wrongQuestions.length === 0) {
        alert('无法找到错题')
        return
      }

      // 重新开始练习，只使用错题
      this.practiceQuestions = wrongQuestions
      this.practiceComplete = false
      this.currentIndex = 0
      this.questionResults = []
      this.stats = { total: 0, correct: 0, wrong: 0, accuracy: 0 }
      this.loadQuestion(0)
    },

    // 退出练习
    exitPractice() {
      // 触发事件通知父组件刷新数据
      this.$emit('back')
      this.$emit('practice-completed', {
        total: this.stats.total,
        correct: this.stats.correct,
        wrong: this.stats.wrong,
        accuracy: this.stats.accuracy
      })

      // 重置状态
      this.practiceStarted = false
      this.practiceComplete = false
      this.currentIndex = 0
      this.currentQuestion = null
      this.practiceQuestions = []
      this.questionResults = []
      this.stats = { total: 0, correct: 0, wrong: 0, accuracy: 0 }
    },

    // 辅助方法
    getOptions(question) {
      const options = {}
      if (question.option_a) options.A = question.option_a
      if (question.option_b) options.B = question.option_b
      if (question.option_c) options.C = question.option_c
      if (question.option_d) options.D = question.option_d
      return options
    }
  }
}
</script>

<style scoped>
.custom-practice-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* 选择阶段 */
.selector-container {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.selector-container h2 {
  margin: 0 0 0.5rem 0;
  color: #1a1a2e;
  font-size: 1.8rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.quick-select-section {
  margin-bottom: 2rem;
}

.quick-select-section h3 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.1rem;
}

.quick-select-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.quick-btn {
  padding: 0.8rem 1.5rem;
  border: 2px solid;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s;
}

.wrong-btn {
  border-color: #e74c3c;
  color: #e74c3c;
}

.wrong-btn:hover {
  background: #fee;
}

.favorite-btn {
  border-color: #f39c12;
  color: #f39c12;
}

.favorite-btn:hover {
  background: #fef5e7;
}

.note-btn {
  border-color: #3498db;
  color: #3498db;
}

.note-btn:hover {
  background: #eaf2f8;
}

.manual-input-section {
  margin-bottom: 2rem;
}

.manual-input-section h3 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.1rem;
}

.filename-search-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  border: 2px solid #e9ecef;
}

.filename-search-section h3 {
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 1.1rem;
}

.section-desc {
  margin-bottom: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.search-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-input-wrapper {
  display: flex;
  gap: 0.5rem;
}

.filename-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
}

.filename-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-search {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-search:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-search:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-results-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  font-weight: 600;
  color: #333;
}

.btn-add-results {
  padding: 0.5rem 1rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
}

.btn-add-results:hover {
  background: #45a049;
}

.btn-clear-search {
  padding: 0.5rem 1rem;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-clear-search:hover {
  background: #da190b;
}

.search-results-preview {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.results-header {
  font-weight: 600;
  color: #667eea;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e9ecef;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.result-item:hover {
  background: #f8f9fa;
}

.result-number {
  font-weight: 600;
  color: #667eea;
  min-width: 60px;
  font-size: 0.9rem;
}

.result-text {
  flex: 1;
  color: #333;
  font-size: 0.9rem;
  line-height: 1.4;
}

.more-results {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 0.5rem;
}

.question-ids-textarea {
  width: 100%;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.95rem;
  resize: vertical;
}

.question-ids-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.count-hint {
  color: #666;
  font-size: 0.9rem;
}

.btn-clear {
  padding: 0.4rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  color: #666;
}

.btn-clear:hover {
  background: #f5f5f5;
}

.preview-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.preview-section h3 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.1rem;
}

.question-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.question-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: #667eea;
  color: white;
  border-radius: 20px;
  font-size: 0.85rem;
}

.chip-remove {
  border: none;
  background: rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.chip-remove:hover {
  background: rgba(255, 255, 255, 0.5);
}

.more-chip {
  color: #666;
  font-style: italic;
}

.start-section {
  text-align: center;
}

.btn-start-practice {
  padding: 1rem 3rem;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.btn-start-practice:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-start-practice:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 练习阶段 */
.practice-phase {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.practice-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.btn-exit {
  padding: 0.5rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  color: #666;
}

.btn-exit:hover {
  background: #f5f5f5;
}

.progress-info {
  margin-left: auto;
  font-weight: 600;
  color: #667eea;
  font-size: 1.1rem;
}

.question-area {
  margin-bottom: 2rem;
}

.question-meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.meta-tag {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.number-meta {
  background: #e8f5e9;
  color: #2e7d32;
}

.practiced-meta {
  background: #fff3e0;
  color: #f57c00;
}

.favorite-btn {
  padding: 0.35rem 0.75rem;
  border: 1px solid #FFC107;
  border-radius: 6px;
  background: white;
  color: #FFC107;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.3s;
  margin-left: auto;
}

.favorite-btn:hover {
  background: #FFF8E1;
  transform: scale(1.05);
}

.favorite-btn.active {
  background: #FFC107;
  color: white;
  border-color: #FFC107;
}

.question-area h3 {
  font-size: 1.2rem;
  line-height: 1.8;
  margin-bottom: 2rem;
  color: #1a1a2e;
}

.options {
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

.option-btn {
  padding: 1.25rem 1.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
  font-size: 1rem;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.option-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateX(4px);
}

.option-btn.selected {
  border-color: #667eea;
  background: #f0f4ff;
  font-weight: 500;
}

.multi-select .option-btn {
  padding: 1rem 1.5rem;
}

.multi-select .checkbox {
  font-size: 1.5rem;
  line-height: 1;
  min-width: 24px;
}

.multi-select .option-text {
  flex: 1;
}

.submit-section {
  margin-top: 1.5rem;
  text-align: center;
}

.btn-submit-multi {
  padding: 1rem 3rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.btn-submit-multi:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-submit-multi:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-section {
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: 10px;
  text-align: center;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-message {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.result-message.correct {
  color: #4CAF50;
}

.result-message.wrong {
  color: #f44336;
}

.correct-answer {
  color: #f44336;
  font-weight: bold;
  font-size: 1.1rem;
  margin: 0.5rem 0;
}

.explanation-box {
  margin: 1.5rem 0;
  padding: 1rem 1.5rem;
  background: #E3F2FD;
  border-left: 4px solid #2196F3;
  border-radius: 8px;
  text-align: left;
}

.explanation-box h4 {
  margin: 0 0 0.75rem 0;
  color: #1976D2;
  font-size: 1rem;
}

.explanation-content {
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}

.note-section {
  margin: 1.5rem 0;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.btn-note {
  padding: 0.5rem 1rem;
  border: 1px solid #2196F3;
  border-radius: 6px;
  background: white;
  color: #2196F3;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-note:hover,
.btn-note.active {
  background: #2196F3;
  color: white;
}

.note-input-area {
  margin-top: 1rem;
}

.note-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
}

.note-textarea:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.note-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-save-note {
  padding: 0.5rem 1rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-save-note:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-cancel-note {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}


/* Markdown预览和语法提示 */
.markdown-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f0f7ff;
  border-left: 3px solid #1976d2;
  border-radius: 4px;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}

.hint-title {
  font-weight: 600;
  color: #1976d2;
}

.hint-examples {
  color: #666;
.note-display {
  margin-top: 1rem;
  padding: 1rem;
  background: #FFF9E8;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #333;
  text-align: left;
}


.note-display .btn-edit-note {
  padding: 0.4rem 0.8rem;
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.note-display .btn-edit-note:hover {
  background: #e0e0e0;
  color: #333;
}
.note-display :deep(.markdown-renderer) {
  margin-bottom: 0.5rem;
}
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-toggle-preview:hover {
  background: #1976d2;
  color: white;
}

.note-preview {
  min-height: 120px;
  padding: 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow-y: auto;
}

.note-display {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #FFF9E8;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #333;
  text-align: left;
}

.btn-edit-note {
  padding: 0.25rem 0.75rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.result-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: center;
}

.btn-next {
  padding: 1rem 3rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  background: #2196F3;
  color: white;
  font-weight: 600;
}

.btn-next:hover {
  background: #1976D2;
}

/* 完成总结 */
.completion-summary {
  padding: 2rem 0;
}

.summary-card {
  text-align: center;
}

.summary-card h2 {
  margin-bottom: 2rem;
  color: #1a1a2e;
  font-size: 1.8rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-item {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.stat-value.correct {
  color: #4CAF50;
}

.stat-value.wrong {
  color: #f44336;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
}

.summary-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-back {
  padding: 1rem 2rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  color: #666;
  font-size: 1rem;
}

.btn-back:hover {
  background: #f5f5f5;
}

.btn-retry {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  background: #e74c3c;
  color: white;
  cursor: pointer;
  font-size: 1rem;
}

.btn-retry:hover {
  background: #c0392b;
}
</style>
