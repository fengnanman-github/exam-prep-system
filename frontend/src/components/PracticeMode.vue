<template>
<div class="practice-view">
<div class="practice-header">
<h2>{{ practiceTitle }}</h2>
<div v-if="isDocumentPracticeMode || isCategoryPracticeMode" class="document-practice-info">
  <span v-if="isDocumentPracticeMode" class="document-name">{{ documentInfo?.documentName }}</span>
  <span v-if="isCategoryPracticeMode" class="document-name">{{ categoryInfo?.categoryName }}</span>
  <span class="question-progress">
    {{ (isDocumentPracticeMode ? currentDocumentIndex : currentCategoryIndex) + 1 }} /
    {{ (isDocumentPracticeMode ? documentPracticeQuestions : categoryPracticeQuestions)?.length }}
  </span>
</div>

<!-- 两级分类筛选 -->
<div class="filter-section">
<!-- 法律法规大类选择 -->
<div class="filter-group">
<label class="filter-label">📚 法律法规大类：</label>
<div class="category-selector law-categories">
<button
@click="selectLawCategory(null)"
:class="{ active: selectedLawCategory === null }"
class="category-btn all"
>
全部法律法规
</button>
<button
v-for="cat in lawCategories"
:key="cat.law_category"
@click="selectLawCategory(cat.law_category)"
:class="{ active: selectedLawCategory === cat.law_category }"
class="category-btn"
:style="{ borderColor: getLawCategoryColor(cat.law_category) }"
>
<span class="cat-icon">{{ getLawCategoryIcon(cat.law_category) }}</span>
{{ cat.law_category }}
<span class="cat-count">({{ cat.total_count }})</span>
</button>
</div>
</div>

<!-- 技术专业类别选择 -->
<div class="filter-group">
<label class="filter-label">🔧 技术专业类别：</label>
<div class="category-selector tech-categories">
<button
@click="selectTechCategory(null)"
:class="{ active: selectedTechCategory === null }"
class="category-btn all"
>
全部技术
</button>
<button
v-for="cat in techCategories"
:key="cat.tech_category"
@click="selectTechCategory(cat.tech_category)"
:class="{ active: selectedTechCategory === cat.tech_category }"
class="category-btn"
:style="{ borderColor: getTechCategoryColor(cat.tech_category) }"
>
<span class="cat-icon">{{ getTechCategoryIcon(cat.tech_category) }}</span>
{{ cat.tech_category }}
<span class="cat-count">({{ cat.total_count }})</span>
</button>
</div>
</div>

<!-- 难度筛选 -->
<div class="filter-group">
<label class="filter-label">📊 难度筛选：</label>
<div class="difficulty-selector">
<button
@click="selectDifficulty(null)"
:class="{ active: selectedDifficulty === null }"
class="difficulty-btn all"
>
全部
</button>
<button
@click="selectDifficulty('easy')"
:class="{ active: selectedDifficulty === 'easy' }"
class="difficulty-btn easy"
>
简单
</button>
<button
@click="selectDifficulty('medium')"
:class="{ active: selectedDifficulty === 'medium' }"
class="difficulty-btn medium"
>
中等
</button>
<button
@click="selectDifficulty('hard')"
:class="{ active: selectedDifficulty === 'hard' }"
class="difficulty-btn hard"
>
困难
</button>
</div>
</div>

<!-- 题型筛选 -->
<div class="filter-group">
<label class="filter-label">📝 题型筛选：</label>
<div class="type-selector">
<button
v-for="mode in practiceModes"
:key="mode.id"
@click="startPractice(mode.id)"
:class="{ active: practiceType === mode.id }"
class="mode-btn"
>
{{ mode.icon }} {{ mode.name }}
</button>
</div>
</div>

<!-- 练习选项 -->
<div class="filter-group">
<label class="filter-label">⚙️ 练习选项：</label>
<div class="option-selector">
<label class="checkbox-label">
<input type="checkbox" v-model="onlyUnpracticed" @change="loadQuestion" />
<span>仅显示未练习题目</span>
</label>
</div>
</div>

<!-- 当前筛选条件 -->
<div v-if="hasActiveFilters" class="filter-summary">
<div class="summary-info">
<div class="summary-label">当前筛选</div>
<div class="summary-tags">
<span v-if="selectedLawCategory" class="tag law-tag">
📚 {{ selectedLawCategory }}
<button @click="selectLawCategory(null)" class="tag-close">×</button>
</span>
<span v-if="selectedTechCategory" class="tag tech-tag">
🔧 {{ selectedTechCategory }}
<button @click="selectTechCategory(null)" class="tag-close">×</button>
</span>
<span v-if="selectedDifficulty" class="tag difficulty-tag">
📊 {{ getDifficultyLabel(selectedDifficulty) }}
<button @click="selectDifficulty(null)" class="tag-close">×</button>
</span>
<span v-if="practiceType !== 'random'" class="tag type-tag">
📝 {{ getTypeLabel(practiceType) }}
<button @click="startPractice('random')" class="tag-close">×</button>
</span>
<span v-if="onlyUnpracticed" class="tag option-tag">
🔖 仅未练习
<button @click="onlyUnpracticed = false; loadQuestion()" class="tag-close">×</button>
</span>
</div>
</div>
<!-- 分类统计 -->
<div v-if="categoryStats" class="summary-stats">
<span class="stat-item">📊 {{ categoryStats.total_count }}题</span>
<span class="stat-item">✅ {{ categoryStats.practiced_count }}已做</span>
<span class="stat-item">🆕 {{ categoryStats.remaining_count }}剩余</span>
<span class="stat-item" :class="getAccuracyClass(categoryStats.accuracy_rate)">
准确率 {{ (categoryStats.accuracy_rate * 100).toFixed(0) }}%
</span>
</div>
<button @click="resetAllFilters" class="btn-reset-all">重置全部</button>
</div>
</div>
</div>

<!-- 答题区域 -->
<div v-if="currentQuestion" class="question-container">
<div class="question">
<div class="question-meta">
<span class="meta-tag number-meta">🔢 题号：{{ currentQuestion.question_no || currentQuestion.id }}</span>
<span class="meta-tag law-meta">{{ currentQuestion.law_category }}</span>
<span class="meta-tag tech-meta">{{ currentQuestion.tech_category }}</span>
<span class="meta-tag difficulty-meta">{{ getDifficultyLabel(currentQuestion.difficulty) }}</span>
</div>

<h3>{{ currentQuestion.question_text }}</h3>

<!-- 提示区域 -->
<div v-if="showHint && hintData" class="hint-box">
<div v-if="hintLevel >= 1" class="hint-item">
💡 <strong>知识点：</strong>{{ hintData.knowledge_point }}
</div>
<div v-if="hintLevel >= 2" class="hint-item">
📖 <strong>解题思路：</strong>{{ hintData.thinking_hint }}
</div>
<div v-if="hintLevel >= 3" class="hint-item">
🔍 <strong>部分提示：</strong>
<span v-if="hintData.partial_hint">{{ hintData.partial_hint.hint }}</span>
</div>
<div v-if="hintLevel >= 4" class="hint-item full-answer">
✅ <strong>正确答案：</strong>{{ hintData.full_answer }}
</div>
<button @click="hideHint" class="hint-close">×</button>
</div>

<!-- 提示按钮 -->
<div v-if="!showResult" class="hint-actions">
<button @click="showHint" class="btn-hint" :disabled="hintLevel >= 4">
💡 {{ hintLevel >= 4 ? '已显示完整答案' : hintLevel === 0 ? '查看提示' : `查看更多提示 (${hintLevel}/4)` }}
</button>
</div>

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
@click="toggleOption(key)"
class="option-btn"
:class="{ selected: selectedOptions.includes(key) }"
>
<span class="checkbox">{{ selectedOptions.includes(key) ? '☑' : '☐' }}</span>
<span class="option-text">{{ key }}. {{ option }}</span>
</button>
</div>

<!-- 多选题提交按钮 -->
<div v-if="currentQuestion.question_type === '多项选择题' && !showResult" class="submit-section">
<button
@click="submitMultiAnswer"
class="btn-submit-multi"
:disabled="selectedOptions.length === 0"
>
确认答案 (已选 {{ selectedOptions.length }} 项)
</button>
</div>
</div>

<div v-if="showResult" class="result">
<p :class="{ correct: isCorrect, wrong: !isCorrect }">
{{ isCorrect ? '✅ 回答正确！' : '❌ 回答错误！' }}
</p>
<p v-if="!isCorrect" class="correct-answer">
正确答案: <strong>{{ currentQuestion.correct_answer }}</strong>
</p>
<div v-if="currentQuestion.question_type === '多项选择题' && !isCorrect" class="answer-comparison">
<p class="your-answer">
你的答案: {{ selectedOptions.sort().join('') || '未作答' }}
</p>
</div>

<!-- 详细解析 -->
<div v-if="currentQuestion.explanation" class="explanation-box">
<h4>📖 详细解析</h4>
<div class="explanation-content">{{ currentQuestion.explanation }}</div>
</div>

<!-- 笔记功能 - 仅在答错时显示 -->
<div v-if="!isCorrect" class="note-section">
<button
@click="showNoteInput = !showNoteInput"
class="btn-note"
:class="{ active: showNoteInput || currentNote }"
>
{{ showNoteInput || currentNote ? '📝 编辑笔记' : '📝 添加笔记' }}
</button>
<div v-if="showNoteInput" class="note-input-area">
<textarea
v-model="currentNote"
placeholder="记录你的错题笔记、易错点、重要知识点..."
class="note-textarea"
rows="3"
></textarea>
<div class="note-actions">
<button
@click="saveNote"
:disabled="savingNote || !currentNote.trim()"
class="btn-save-note"
>
{{ savingNote ? '保存中...' : '保存笔记' }}
</button>
<button @click="showNoteInput = false; currentNote = ''" class="btn-cancel-note">取消</button>
</div>
</div>
<div v-else-if="currentNote && !showNoteInput" class="note-display">
{{ currentNote }}
<button @click="showNoteInput = true" class="btn-edit-note">修改</button>
</div>
</div>

<!-- 按钮组 -->
<div class="result-actions">
<button
v-if="canGoBack && !isDocumentPracticeMode && !isCategoryPracticeMode"
@click="goBackToPrevious"
class="btn btn-secondary"
>
← 上一题
</button>
<button @click="nextQuestion" class="btn btn-primary">
<template v-if="isDocumentPracticeMode || isCategoryPracticeMode">
  {{ ((isDocumentPracticeMode ? currentDocumentIndex : currentCategoryIndex) >= (isDocumentPracticeMode ? documentPracticeQuestions : categoryPracticeQuestions)?.length - 1) ? '完成 ✓' : '下一题 →' }}
</template>
<template v-else>
  {{ isLastQuestion ? '完成 ✓' : '下一题 →' }}
</template>
</button>
</div>
</div>
</div>

<!-- 空状态 -->
<div v-if="!currentQuestion && !loading" class="empty-state">
<div class="empty-icon">🎯</div>
<h3>开始练习</h3>
<p>选择筛选条件后，系统将为您推送合适的题目</p>
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
name: 'PracticeMode',
emits: ['wrong-answer-recorded', 'back', 'back-to-document'],
data() {
return {
// 分类数据
lawCategories: [],
techCategories: [],

// 选中的筛选条件
selectedLawCategory: null,
selectedTechCategory: null,
selectedDifficulty: null,
practiceType: 'random',
onlyUnpracticed: false,  // 仅显示未练习

// 当前题目
currentQuestion: null,
showResult: false,
isCorrect: false,
questionStartTime: null,
loading: false,
userAnswer: null,
selectedOptions: [],  // 多选题选中的选项

// 提示功能
hintLevel: 0,
hintData: null,
showHint: false,

// 文档练习模式
isDocumentPracticeMode: false,
documentPracticeQuestions: [],
documentInfo: null,
currentDocumentIndex: 0,
documentPracticeStats: null,
practiceTitle: '🎯 快速练习',

// 类别练习模式
isCategoryPracticeMode: false,
categoryPracticeQuestions: [],
categoryInfo: null,
currentCategoryIndex: 0,
categoryPracticeStats: null,

// 新题检测
noNewQuestions: false,
newQuestionCheck: null,

// 题目历史记录（用于返回上一题）
questionHistory: [],
currentHistoryIndex: 0,
canGoBack: false,

// 分类统计
categoryStats: null,

// 笔记功能
showNoteInput: false,
currentNote: '',
savingNote: false,

// 练习模式
practiceModes: [
{ id: 'random', name: '随机练习', icon: '🎲' },
{ id: '判断题', name: '判断题', icon: '✅' },
{ id: '单选题', name: '单选题', icon: '🔘' },
{ id: '多选题', name: '多选题', icon: '☑️' }
],

// 统一API支持
useUnifiedAPI: false
}
},

computed: {
	userId() {
		return this.authStore.getCurrentUserId()
	},
hasActiveFilters() {
  return this.selectedLawCategory || this.selectedTechCategory ||
        this.selectedDifficulty || this.practiceType !== 'random'
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
  console.log('PracticeMode: 统一API状态', this.useUnifiedAPI)
} catch (error) {
  console.error('检查版本配置失败:', error)
  this.useUnifiedAPI = false
}

await this.loadCategories()

// 检查是否有文档练习题目
if (window.documentPracticeQuestions && window.documentPracticeQuestions.length > 0) {
  // 检查是文档练习还是类别练习
  if (window.documentPracticeInfo?.isCategoryPractice) {
    this.useCategoryPractice()
  } else {
    this.useDocumentPractice()
  }
} else {
  // 默认开始随机练习
  await this.loadQuestion()
}
},
async activated() {
  console.log('PracticeMode: 组件被激活，刷新分类数据')
  await this.loadCategories()
},

methods: {
async loadCategories() {
try {
// 并行加载两级分类
const [lawRes, techRes] = await Promise.all([
api.get(`${API_BASE}/categories/law`),
api.get(`${API_BASE}/categories/tech`)
])

this.lawCategories = lawRes.data
this.techCategories = techRes.data
} catch (error) {
console.error('加载分类失败:', error)
}
},

selectLawCategory(category) {
this.selectedLawCategory = category
this.loadQuestion()
},

selectTechCategory(category) {
this.selectedTechCategory = category
this.loadQuestion()
},

selectDifficulty(difficulty) {
this.selectedDifficulty = difficulty
this.loadQuestion()
},

resetAllFilters() {
this.selectedLawCategory = null
this.selectedTechCategory = null
this.selectedDifficulty = null
this.practiceType = 'random'
this.loadQuestion()
},

async startPractice(type) {
this.practiceType = type
await this.loadQuestion()
},

async loadQuestion() {
this.loading = true
try {
const params = { user_id: this.userId }

// 添加两级分类筛选
if (this.selectedLawCategory) {
params.law_category = this.selectedLawCategory
}
if (this.selectedTechCategory) {
params.tech_category = this.selectedTechCategory
}
if (this.selectedDifficulty) {
params.difficulty = this.selectedDifficulty
}
if (this.practiceType !== 'random') {
params.type = this.practiceType
}

const response = await api.get(`${API_BASE}/questions`, { params })
this.currentQuestion = response.data
this.showResult = false
this.questionStartTime = Date.now()

// 重置答案和提示状态
this.userAnswer = null
this.selectedOptions = []
this.resetHint()
} catch (error) {
console.error('加载题目失败:', error)
if (error.response?.status === 404) {
// 没有找到题目，检查是否是新题用完了
await this.checkNewQuestions()
} else {
alert('加载题目失败，请重试')
}
} finally {
this.loading = false
}
},

// 多选题：切换选项
toggleOption(key) {
if (this.showResult) return // 已显示结果后不允许修改

const index = this.selectedOptions.indexOf(key)
if (index > -1) {
this.selectedOptions.splice(index, 1)
} else {
this.selectedOptions.push(key)
}
},

// 多选题：提交答案
async submitMultiAnswer() {
if (this.selectedOptions.length === 0) {
alert('请至少选择一个选项')
return
}

const answer = this.selectedOptions.sort().join('')
await this.submitAnswer(answer)
},

async submitAnswer(answer) {
// 文档练习模式或类别练习模式
if (this.isDocumentPracticeMode || this.isCategoryPracticeMode) {
  const timeSpent = Math.round((Date.now() - this.questionStartTime) / 1000)
  const isCategoryMode = this.isCategoryPracticeMode

  // 判断正确性
  if (this.currentQuestion.question_type === '多项选择题') {
    const userAnswerSorted = this.selectedOptions.sort().join('')
    const correctAnswerSorted = this.currentQuestion.correct_answer.split('').sort().join('')
    this.isCorrect = userAnswerSorted === correctAnswerSorted
  } else {
    this.isCorrect = answer === this.currentQuestion.correct_answer
  }

  this.showResult = true

  // 更新统计
  if (isCategoryMode) {
    // 类别练习模式统计
    if (!this.categoryPracticeStats) {
      this.categoryPracticeStats = {
        total: this.categoryPracticeQuestions.length,
        correct: 0,
        wrong: 0,
        answered: 0
      }
    }
    if (this.isCorrect) {
      this.categoryPracticeStats.correct++
    } else {
      this.categoryPracticeStats.wrong++
    }
    this.categoryPracticeStats.answered++
  } else {
    // 文档练习模式统计
    if (!this.documentPracticeStats) {
      this.documentPracticeStats = {
        total: this.documentPracticeQuestions.length,
        correct: 0,
        wrong: 0
      }
    }
    if (this.isCorrect) {
      this.documentPracticeStats.correct++
    } else {
      this.documentPracticeStats.wrong++
    }
  }

  // 记录错题
  if (!this.isCorrect) {
    try {
      await api.post('/api/wrong-answers', {
        question_id: this.currentQuestion.id,
        user_id: this.userId
      })
    } catch (error) {
      console.error('记录错题失败:', error)
    }
  }

  // 记录练习历史
  try {
    const practiceData = {
      user_id: this.userId,
      question_id: this.currentQuestion.id,
      user_answer: answer,
      is_correct: this.isCorrect,
      time_spent: timeSpent,
      practice_mode: isCategoryMode ? 'category' : 'document'
    }

    if (isCategoryMode) {
      practiceData.category_name = this.categoryInfo.categoryName
      practiceData.category_type = this.categoryInfo.categoryType
      console.log('📝 提交类别练习答案:', {
        document_name: this.categoryInfo.categoryName,
        category_type: this.categoryInfo.categoryType,
        is_correct: this.isCorrect,
        question_id: this.currentQuestion.id
      })
    } else {
      practiceData.document_name = this.documentInfo.documentName
      console.log('📝 提交文档练习答案:', {
        document_name: this.documentInfo.documentName,
        is_correct: this.isCorrect,
        question_id: this.currentQuestion.id
      })
    }

    const response = await api.post(`${API_BASE}/practice/history`, practiceData)
    console.log('✅ 练习历史记录成功:', response.data)
  } catch (error) {
    console.error('❌ 记录练习历史失败:', error)
    console.error('错误详情:', error.response?.data)
    alert(`记录答案失败: ${error.response?.data?.error || error.message}`)
  }

  return
}

// 正常练习模式
const timeSpent = Math.round((Date.now() - this.questionStartTime) / 1000)

// 判断正确性
if (this.currentQuestion.question_type === '多项选择题') {
  // 多选题：比较排序后的答案
  const userAnswerSorted = this.selectedOptions.sort().join('')
  const correctAnswerSorted = this.currentQuestion.correct_answer.split('').sort().join('')
  this.isCorrect = userAnswerSorted === correctAnswerSorted
} else {
  // 单选题和判断题：直接比较
  this.isCorrect = answer === this.currentQuestion.correct_answer
}

this.showResult = true

// 记录到题目历史（用于返回上一题）
this.questionHistory.push({
  question: this.currentQuestion,
  userAnswer: answer,
  isCorrect: this.isCorrect,
  selectedOptions: [...this.selectedOptions],
  timeSpent
})
this.currentHistoryIndex = this.questionHistory.length - 1
this.canGoBack = this.currentHistoryIndex > 0

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
      practice_mode: this.practiceType === 'random' ? 'quick' : this.practiceType
    })

    // 更新本地状态缓存
    if (response.data && response.data.state) {
      const state = new QuestionState(response.data.state)
      unifiedStateStore.questionStates.set(this.currentQuestion.id, state)
    }
  } else {
    // 使用旧API
    await api.post(`${API_BASE}/practice/history`, {
      user_id: this.userId,
      question_id: this.currentQuestion.id,
      user_answer: answer,
      is_correct: this.isCorrect,
      time_spent: timeSpent,
      practice_mode: 'quick'
    })
  }
} catch (error) {
  console.error('记录练习历史失败:', error)
}

// 如果答错，记录到错题本并加载笔记
if (!this.isCorrect) {
  try {
    if (this.isUnifiedEnabled) {
      // 统一API已经处理了错题记录，这里只需要加载笔记
      await this.loadNote()
    } else {
      // 旧API需要手动记录错题
      await api.post(`/api/wrong-answers`, {
        question_id: this.currentQuestion.id,
        user_id: this.userId
      })
      this.$emit('wrong-answer-recorded')
      // 只在答错时加载笔记
      await this.loadNote()
    }
  } catch (error) {
    console.error('记录错题失败:', error)
  }

  // 只在答错时加载笔记（旧API或统一API都需要）
  await this.loadNote()
}
},

async nextQuestion() {
// 检查是否是文档练习模式或类别练习模式
if (this.isDocumentPracticeMode || this.isCategoryPracticeMode) {
  await this.loadNextDocumentQuestion()
} else {
  await this.loadQuestion()
}
},

// 使用文档练习题目
useDocumentPractice() {
  const questions = window.documentPracticeQuestions
  const info = window.documentPracticeInfo

  if (!questions || questions.length === 0) {
    alert('没有可用的题目')
    this.$emit('back')
    return
  }

  // 设置为文档练习模式
  this.isDocumentPracticeMode = true
  this.documentPracticeQuestions = questions
  this.currentDocumentIndex = 0
  this.documentInfo = info

  // 更新标题
  this.practiceTitle = `📖 ${info.documentName} - 练习中`
  this.totalQuestions = questions.length
  this.currentQuestionIndex = 0

  // 加载第一题
  this.loadDocumentQuestion(0)

  // 清除全局变量
  window.documentPracticeQuestions = null
  window.documentPracticeInfo = null
},

// 使用类别练习题目
useCategoryPractice() {
  const questions = window.documentPracticeQuestions
  const info = window.documentPracticeInfo

  if (!questions || questions.length === 0) {
    alert('没有可用的题目')
    this.$emit('back')
    return
  }

  // 设置为类别练习模式
  this.isCategoryPracticeMode = true
  this.categoryPracticeQuestions = questions
  this.currentCategoryIndex = 0
  this.categoryInfo = info

  // 初始化类别练习统计
  this.categoryPracticeStats = {
    total: questions.length,
    correct: 0,
    incorrect: 0,
    answered: 0
  }

  // 更新标题
  this.practiceTitle = `📚 ${info.categoryName} - 练习中 (${questions.length}题)`
  this.totalQuestions = questions.length
  this.currentQuestionIndex = 0

  // 加载第一题（复用文档练习的加载逻辑）
  this.loadDocumentQuestion(0)

  // 清除全局变量
  window.documentPracticeQuestions = null
  window.documentPracticeInfo = null
},

// 加载文档练习的题目（也用于类别练习）
loadDocumentQuestion(index) {
  // 根据模式选择题目数组
  const questions = this.isCategoryPracticeMode
    ? this.categoryPracticeQuestions
    : this.documentPracticeQuestions

  if (index < 0 || index >= questions.length) {
    // 练习完成
    this.showCompletionSummary()
    return
  }

  const question = questions[index]
  this.currentQuestion = question
  this.currentQuestionIndex = index

  // 更新对应的索引
  if (this.isCategoryPracticeMode) {
    this.currentCategoryIndex = index
  } else {
    this.currentDocumentIndex = index
  }

  // 重置答题状态
  this.selectedAnswer = null
  this.showResult = false
  this.isCorrect = false
  this.explanation = ''
  this.hintLevel = 0
  this.hintData = null
  this.showHint = false
  this.loading = false
},

// 加载下一题（文档练习或类别练习）
loadNextDocumentQuestion() {
  const questions = this.isCategoryPracticeMode
    ? this.categoryPracticeQuestions
    : this.documentPracticeQuestions
  const currentIndex = this.isCategoryPracticeMode
    ? this.currentCategoryIndex
    : this.currentDocumentIndex

  if (currentIndex < questions.length - 1) {
    this.loadDocumentQuestion(currentIndex + 1)
  } else {
    // 练习完成
    this.showCompletionSummary()
  }
},

// 显示完成总结
showCompletionSummary() {
  if (this.isCategoryPracticeMode) {
    // 类别练习完成
    const correct = this.categoryPracticeStats.correct
    const total = this.categoryPracticeQuestions.length
    const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0

    alert(`📚 类别练习完成！\n\n${this.categoryInfo.categoryName}\n\n正确率：${accuracy}% (${correct}/${total})`)
  } else {
    // 文档练习完成
    const correct = this.documentPracticeStats.correct
    const total = this.documentPracticeQuestions.length
    const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0

    alert(`📖 文档练习完成！\n\n${this.documentInfo.documentName}\n\n正确率：${accuracy}% (${correct}/${total})`)
  }

  // 返回文档复习页面
  if (this.isDocumentPracticeMode || this.isCategoryPracticeMode) {
    this.$emit('back-to-document')
  } else {
    this.$emit('back')
  }
},

async loadQuestion() {
  this.loading = true
  try {
    const params = { user_id: this.userId }

    // 添加两级分类筛选
    if (this.selectedLawCategory) {
      params.law_category = this.selectedLawCategory
    }
    if (this.selectedTechCategory) {
      params.tech_category = this.selectedTechCategory
    }
    if (this.selectedDifficulty) {
      params.difficulty = this.selectedDifficulty
    }
    if (this.practiceType !== 'random') {
      params.question_type = this.practiceType
    }

    const response = await api.get(`${API_BASE}/questions`, { params })

    if (!response.data || response.data.length === 0) {
      this.currentQuestion = null
      this.noNewQuestions = true
      this.newQuestionCheck = await this.checkNewQuestionsAvailable()
      return
    }

    this.currentQuestion = response.data
    this.showResult = false
    this.selectedAnswer = null
    this.selectedOptions = []
    this.isCorrect = false
    this.questionStartTime = Date.now()
    this.hintLevel = 0
    this.hintData = null
    this.showHint = false
    this.noNewQuestions = false
    this.loading = false
  } catch (error) {
    console.error('加载题目失败:', error)
    this.loading = false
    if (error.response?.status === 404) {
      this.currentQuestion = null
      this.noNewQuestions = true
    }
  }
},

// 提示功能
async showHint() {
if (!this.currentQuestion) return

this.hintLevel++
if (this.hintLevel > 4) {
this.hintLevel = 4
}

try {
const response = await api.get(`${API_BASE}/practice/hint/${this.currentQuestion.id}`, {
params: { level: this.hintLevel }
})
this.hintData = response.data
this.showHint = true
} catch (error) {
console.error('获取提示失败:', error)
}
},

hideHint() {
this.showHint = false
},

resetHint() {
this.hintLevel = 0
this.hintData = null
this.showHint = false
},

// 检查是否有新题
async checkNewQuestions() {
try {
const params = {
law_category: this.selectedLawCategory,
tech_category: this.selectedTechCategory,
difficulty: this.selectedDifficulty
}
if (this.practiceType !== 'random') {
params.question_type = this.practiceType
}

const response = await api.get(`${API_BASE}/practice/check-new/${this.userId}`, { params })
this.newQuestionCheck = response.data
this.noNewQuestions = !response.data.has_new_questions

if (this.noNewQuestions) {
this.showNoNewQuestionsDialog()
}
} catch (error) {
console.error('检查新题失败:', error)
}
},

showNoNewQuestionsDialog() {
if (!this.newQuestionCheck) return

const completionRate = this.newQuestionCheck.completion_rate
let message = `📊 当前选择已练习 ${completionRate}%\n\n`
message += `已练习: ${this.newQuestionCheck.practiced_questions} 题\n`
message += `总题数: ${this.newQuestionCheck.total_questions} 题\n\n`

if (this.newQuestionCheck.recommendations && this.newQuestionCheck.recommendations.length > 0) {
message += '💡 建议尝试以下分类：\n'
this.newQuestionCheck.recommendations.slice(0, 3).forEach((rec, index) => {
message += `\n${index + 1}. ${rec.law_category} / ${rec.tech_category} (${rec.new_count}题新题)`
})
}

alert(message)
},

// 辅助方法
getOptions(question) {
const options = {}
if (question.option_a) options.A = question.option_a
if (question.option_b) options.B = question.option_b
if (question.option_c) options.C = question.option_c
if (question.option_d) options.D = question.option_d
return options
},

getLawCategoryIcon(category) {
const icons = {
'密码法': '⚖️',
'商用密码管理条例': '📋',
'电子印章管理办法': '🏷️',
'电子政务电子认证服务管理办法': '💼',
'关键信息基础设施商用密码使用管理规定': '🏢',
'商用密码领域违法线索投诉举报处理办法': '📮',
'十五五规划建议': '📈',
'中共二十届四中全会': '🏛️',
'密码标准与规范': '📖',
'密码检测与评估': '🔍',
'密码应用': '💻',
'密码管理与监督': '👔',
'综合与基础': '📚'
}
return icons[category] || '📁'
},

getTechCategoryIcon(category) {
const icons = {
'密码算法': '🔐',
'密码协议': '🤝',
'PKI与证书': '🔑',
'密码产品': '📦',
'密钥管理': '🔑',
'密码应用': '💻',
'密码检测与评估': '🔍',
'密码标准与规范': '📖',
'密码管理与监督': '⚙️',
'综合与基础': '📊'
}
return icons[category] || '📄'
},

getLawCategoryColor(category) {
const colors = {
'密码法': '#e74c3c',
'商用密码管理条例': '#3498db',
'电子印章管理办法': '#9b59b6',
'电子政务电子认证服务管理办法': '#1abc9c',
'关键信息基础设施商用密码使用管理规定': '#e67e22',
'商用密码领域违法线索投诉举报处理办法': '#34495e',
'十五五规划建议': '#16a085',
'中共二十届四中全会': '#c0392b',
'密码标准与规范': '#7f8c8d',
'密码检测与评估': '#27ae60',
'密码应用': '#2980b9',
'密码管理与监督': '#8e44ad',
'综合与基础': '#95a5a6'
}
return colors[category] || '#95a5a6'
},

getTechCategoryColor(category) {
const colors = {
'密码算法': '#2196F3',
'密码协议': '#9C27B0',
'PKI与证书': '#FF9800',
'密码产品': '#4CAF50',
'密钥管理': '#F44336',
'密码应用': '#00BCD4',
'密码检测与评估': '#FF5722',
'密码标准与规范': '#607D8B',
'密码管理与监督': '#795548',
'综合与基础': '#9E9E9E'
}
return colors[category] || '#9E9E9E'
},

getDifficultyLabel(difficulty) {
const labels = {
easy: '简单',
medium: '中等',
hard: '困难'
}
return labels[difficulty] || difficulty
},

getTypeLabel(type) {
const mode = this.practiceModes.find(m => m.id === type)
return mode ? mode.name : '随机'
},

// ========================================
// 新增功能方法
// ========================================

// 返回上一题
async goBackToPrevious() {
if (this.currentHistoryIndex > 0) {
this.currentHistoryIndex--
const previousState = this.questionHistory[this.currentHistoryIndex]

// 恢复到上一题状态
this.currentQuestion = previousState.question
this.userAnswer = previousState.userAnswer
this.selectedOptions = [...(previousState.selectedOptions || [])]
this.isCorrect = previousState.isCorrect
this.showResult = true
this.canGoBack = this.currentHistoryIndex > 0

// 重置笔记状态
this.currentNote = ''
this.showNoteInput = false

// 如果该题答错了，加载笔记
if (!this.isCorrect) {
await this.loadNote()
}
}
},

// 加载笔记
async loadNote() {
if (!this.currentQuestion) return

try {
const response = await api.get(`${API_BASE}/notes/${this.userId}/${this.currentQuestion.id}`)
if (response.data.note) {
this.currentNote = response.data.note
}
} catch (error) {
console.error('加载笔记失败:', error)
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
await api.post(`${API_BASE}/notes`, {
user_id: this.userId,
question_id: this.currentQuestion.id,
note: this.currentNote
})
this.showNoteInput = false
} catch (error) {
console.error('保存笔记失败:', error)
alert('保存笔记失败，请重试')
} finally {
this.savingNote = false
}
},

// 加载分类统计
async loadCategoryStats() {
try {
const params = {}
if (this.selectedLawCategory) params.law_category = this.selectedLawCategory
if (this.selectedTechCategory) params.tech_category = this.selectedTechCategory

const response = await api.get(`${API_BASE}/practice/stats/${this.userId}`, { params })
this.categoryStats = response.data
} catch (error) {
console.error('加载统计失败:', error)
this.categoryStats = null
}
},

// 获取准确率样式类
getAccuracyClass(rate) {
if (rate >= 0.8) return 'accuracy-excellent'
if (rate >= 0.6) return 'accuracy-good'
if (rate >= 0.4) return 'accuracy-fair'
return 'accuracy-poor'
},

// 更新 loadQuestion 方法，添加统计加载和重置历史
async loadQuestion() {
this.loading = true
this.questionHistory = [] // 重置历史
this.currentHistoryIndex = 0
this.canGoBack = false
this.categoryStats = null

try {
const params = { user_id: this.userId }

// 添加筛选条件
if (this.selectedLawCategory) params.law_category = this.selectedLawCategory
if (this.selectedTechCategory) params.tech_category = this.selectedTechCategory
if (this.selectedDifficulty) params.difficulty = this.selectedDifficulty
if (this.practiceType !== 'random') params.type = this.practiceType

// 根据是否仅显示未练习选择不同的 API
let url
if (this.onlyUnpracticed) {
url = `${API_BASE}/questions/unpracticed-single/${this.userId}`
} else {
url = `${API_BASE}/questions/practice`
}

const response = await api.get(url, { params })
this.currentQuestion = response.data
this.showResult = false
this.questionStartTime = Date.now()

// 重置答案状态
this.userAnswer = null
this.selectedOptions = []
this.resetHint()

// 重置笔记状态（不在加载时自动获取笔记）
this.currentNote = ''
this.showNoteInput = false

// 加载分类统计
await this.loadCategoryStats()
} catch (error) {
console.error('加载题目失败:', error)
if (error.response?.status === 404) {
if (this.onlyUnpracticed) {
alert('该分类下没有未练习的题目了，请取消"仅显示未练习"选项或尝试其他分类')
} else {
alert('没有找到符合条件的题目，请调整筛选条件')
}
} else {
alert('加载题目失败，请重试')
}
} finally {
this.loading = false
}
}
},

}
</script>

<style scoped>
.practice-view {
max-width: 1200px;
margin: 0 auto;
padding: 2rem;
}

.practice-header {
background: white;
padding: 2rem;
border-radius: 12px;
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
margin-bottom: 2rem;
}

.practice-header h2 {
margin: 0 0 2rem 0;
color: #1a1a2e;
font-size: 1.8rem;
}

.filter-section {
display: flex;
flex-direction: column;
gap: 1.5rem;
}

.filter-group {
display: flex;
flex-direction: column;
gap: 0.75rem;
}

.filter-label {
font-weight: 600;
color: #333;
font-size: 0.95rem;
}

.category-selector,
.difficulty-selector,
.type-selector {
display: flex;
gap: 0.5rem;
flex-wrap: wrap;
}

.category-btn,
.difficulty-btn,
.mode-btn {
padding: 0.6rem 1rem;
border: 2px solid #e0e0e0;
border-radius: 8px;
background: white;
cursor: pointer;
transition: all 0.3s;
font-size: 0.85rem;
display: flex;
align-items: center;
gap: 0.4rem;
}

.category-btn:hover,
.difficulty-btn:hover,
.mode-btn:hover {
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.category-btn.active,
.difficulty-btn.active,
.mode-btn.active {
background: #f0f4ff;
border-color: #667eea;
font-weight: 600;
}

.cat-icon {
font-size: 1.1rem;
}

.cat-count {
font-size: 0.75rem;
color: #999;
margin-left: 0.25rem;
}

.difficulty-btn.all {
border-color: #9e9e9e;
}

.difficulty-btn.easy {
border-color: #4CAF50;
}

.difficulty-btn.easy.active {
background: #e8f5e9;
border-color: #4CAF50;
color: #4CAF50;
}

.difficulty-btn.medium {
border-color: #FF9800;
}

.difficulty-btn.medium.active {
background: #fff3e0;
border-color: #FF9800;
color: #FF9800;
}

.difficulty-btn.hard {
border-color: #f44336;
}

.difficulty-btn.hard.active {
background: #ffebee;
border-color: #f44336;
color: #f44336;
}

.filter-summary {
display: flex;
align-items: center;
gap: 1rem;
padding: 1rem;
background: #f8f9fa;
border-radius: 8px;
flex-wrap: wrap;
}

.summary-label {
font-weight: 600;
color: #333;
font-size: 0.9rem;
}

.summary-tags {
display: flex;
gap: 0.5rem;
flex-wrap: wrap;
flex: 1;
}

.tag {
display: inline-flex;
align-items: center;
gap: 0.5rem;
padding: 0.4rem 0.8rem;
border-radius: 6px;
font-size: 0.85rem;
font-weight: 500;
}

.tag.law-tag {
background: #e3f2fd;
color: #1976d2;
}

.tag.tech-tag {
background: #f3e5f5;
color: #7b1fa2;
}

.tag.difficulty-tag {
background: #fff3e0;
color: #f57c00;
}

.tag.type-tag {
background: #e8f5e9;
color: #388e3c;
}

.tag-close {
border: none;
background: none;
cursor: pointer;
font-size: 1.2rem;
line-height: 1;
padding: 0;
width: 20px;
height: 20px;
display: flex;
align-items: center;
justify-content: center;
opacity: 0.6;
transition: opacity 0.2s;
}

.tag-close:hover {
opacity: 1;
}

.btn-reset-all {
padding: 0.5rem 1rem;
border: 1px solid #e0e0e0;
border-radius: 6px;
background: white;
cursor: pointer;
transition: all 0.3s;
color: #666;
font-size: 0.85rem;
}

.btn-reset-all:hover {
background: #f5f5f5;
border-color: #bbb;
}

.question-container {
background: white;
padding: 2.5rem;
border-radius: 12px;
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.question {
margin-bottom: 2rem;
}

.question-meta {
display: flex;
gap: 0.75rem;
margin-bottom: 1.5rem;
flex-wrap: wrap;
}

.meta-tag {
padding: 0.35rem 0.75rem;
border-radius: 6px;
font-size: 0.8rem;
font-weight: 500;
}

.meta-tag.law-meta {
background: #e3f2fd;
color: #1976d2;
}

.meta-tag.tech-meta {
background: #f3e5f5;
color: #7b1fa2;
}

.meta-tag.difficulty-meta {
background: #fff3e0;
color: #f57c00;
}

.meta-tag.number-meta {
background: #e8f5e9;
color: #2e7d32;
font-weight: 600;
font-size: 0.85rem;
}

.question h3 {
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

/* 多选题样式 */
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

.result {
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

.result .correct {
color: #4CAF50;
font-weight: bold;
font-size: 1.2rem;
}

.result .wrong {
color: #f44336;
font-weight: bold;
font-size: 1.2rem;
}

.correct-answer {
color: #f44336;
font-weight: bold;
font-size: 1.1rem;
margin: 0.5rem 0;
}

.answer-comparison {
margin-top: 1rem;
padding: 1rem;
background: #fff3e0;
border-radius: 8px;
}

.answer-comparison .your-answer {
color: #f57c00;
font-weight: 500;
margin: 0;
}

.btn {
padding: 1rem 2.5rem;
border: none;
border-radius: 8px;
font-size: 1rem;
cursor: pointer;
transition: all 0.3s;
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
color: white;
font-weight: 600;
margin-top: 1rem;
}

.btn:hover {
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.empty-state {
text-align: center;
padding: 4rem 2rem;
background: white;
border-radius: 12px;
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.empty-icon {
font-size: 4rem;
margin-bottom: 1rem;
}

.empty-state h3 {
margin: 0 0 0.5rem 0;
color: #333;
}

.empty-state p {
color: #666;
margin: 0;
}

@media (max-width: 768px) {
.practice-view {
padding: 1rem;
}

.practice-header {
padding: 1.5rem;
}

.category-selector,
.difficulty-selector,
.type-selector {
flex-direction: column;
}

.category-btn,
.difficulty-btn,
.mode-btn {
width: 100%;
justify-content: center;
}

.filter-summary {
flex-direction: column;
align-items: flex-start;
}

.summary-tags {
width: 100%;
}

.btn-reset-all {
width: 100%;
}

.question-container {
padding: 1.5rem;
}
}

/* 提示框样式 */
.hint-actions {
margin: 1rem 0;
text-align: center;
}

.btn-hint {
padding: 0.75rem 1.5rem;
border: 2px solid #FF9800;
border-radius: 8px;
background: white;
color: #FF9800;
font-size: 1rem;
cursor: pointer;
transition: all 0.3s;
font-weight: 600;
}

.btn-hint:hover:not(:disabled) {
background: #FFF3E0;
border-color: #F57C00;
}

.btn-hint:disabled {
opacity: 0.6;
cursor: not-allowed;
border-color: #ccc;
color: #999;
}

.hint-box {
position: relative;
margin: 1.5rem 0;
padding: 1.5rem;
background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%);
border-left: 4px solid #FF9800;
border-radius: 8px;
box-shadow: 0 2px 8px rgba(255, 152, 0, 0.1);
}

.hint-item {
margin: 0.75rem 0;
padding: 0.75rem;
background: rgba(255, 255, 255, 0.7);
border-radius: 6px;
line-height: 1.6;
}

.hint-item.full-answer {
background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
border-left: 3px solid #4CAF50;
font-weight: 600;
font-size: 1.05rem;
}

.hint-close {
position: absolute;
top: 0.5rem;
right: 0.75rem;
width: 28px;
height: 28px;
border: none;
background: rgba(255, 152, 0, 0.2);
border-radius: 50%;
font-size: 1.25rem;
line-height: 1;
cursor: pointer;
color: #E65100;
transition: all 0.2s;
}

.hint-close:hover {
background: rgba(255, 152, 0, 0.3);
transform: scale(1.1);
}

/* ========================================
* 新增功能样式
* ======================================== */

/* 练习选项 */
.option-selector {
display: flex;
gap: 1rem;
align-items: center;
}

.checkbox-label {
display: flex;
align-items: center;
gap: 0.5rem;
cursor: pointer;
user-select: none;
padding: 0.5rem 1rem;
border-radius: 6px;
transition: background 0.2s;
}

.checkbox-label:hover {
background: #f5f5f5;
}

.checkbox-label input[type="checkbox"] {
width: 18px;
height: 18px;
cursor: pointer;
}

/* 筛选统计区域 */
.filter-summary {
display: flex;
justify-content: space-between;
align-items: center;
padding: 1rem;
background: white;
border-radius: 8px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
margin-top: 1rem;
flex-wrap: wrap;
gap: 1rem;
}

.summary-info {
display: flex;
align-items: center;
gap: 1rem;
flex: 1;
min-width: 0;
}

.summary-label {
font-weight: 600;
color: #333;
white-space: nowrap;
}

.summary-tags {
display: flex;
flex-wrap: wrap;
gap: 0.5rem;
}

.summary-stats {
display: flex;
gap: 1rem;
flex-wrap: wrap;
}

.stat-item {
font-size: 0.9rem;
color: #666;
}

.stat-item.accuracy-excellent { color: #4CAF50; }
.stat-item.accuracy-good { color: #8BC34A; }
.stat-item.accuracy-fair { color: #FF9800; }
.stat-item.accuracy-poor { color: #f44336; }

/* 标签样式 */
.option-tag {
background: #9C27B0;
}

/* 详细解析 */
.explanation-box {
margin: 1.5rem 0;
padding: 1rem 1.5rem;
background: #E3F2FD;
border-left: 4px solid #2196F3;
border-radius: 8px;
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

/* 笔记功能 */
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

.note-display {
margin-top: 1rem;
padding: 0.75rem;
background: #FFF9E80;
border-radius: 4px;
font-size: 0.9rem;
color: #333;
display: flex;
justify-content: space-between;
align-items: center;
}

.btn-edit-note {
padding: 0.25rem 0.75rem;
background: white;
border: 1px solid #ddd;
border-radius: 4px;
cursor: pointer;
font-size: 0.8rem;
}

/* 答题结果按钮组 */
.result-actions {
display: flex;
gap: 1rem;
margin-top: 1.5rem;
justify-content: center;
}

.btn-secondary {
background: #f0f0f0;
color: #333;
}

.btn-secondary:hover:not(:disabled) {
background: #e0e0e0;
}

.btn-primary {
background: #2196F3;
color: white;
}

.btn-primary:hover:not(:disabled) {
background: #1976D2;
}
</style>


