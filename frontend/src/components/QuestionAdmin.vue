<template>
  <div class="question-admin">
    <!-- 页面头部 -->
    <div class="admin-header">
      <h2>🔧 题目管理系统</h2>
      <div class="admin-tabs">
        <button
          @click="currentTab = 'list'"
          :class="{ active: currentTab === 'list' }"
          class="tab-button"
        >
          📋 题目列表
        </button>
        <button
          @click="currentTab = 'doubtful'"
          :class="{ active: currentTab === 'doubtful' }"
          class="tab-button"
        >
          ⚠️ 存疑题目
          <span v-if="stats.doubtful_count > 0" class="badge">
            {{ stats.doubtful_count }}
          </span>
        </button>
        <button
          @click="currentTab = 'logs'"
          :class="{ active: currentTab === 'logs' }"
          class="tab-button"
        >
          📜 修改日志
        </button>
        <button
          @click="currentTab = 'stats'"
          :class="{ active: currentTab === 'stats' }"
          class="tab-button"
        >
          📊 统计分析
        </button>
      </div>
    </div>

    <!-- 题目列表视图 -->
    <div v-if="currentTab === 'list'" class="question-list">
      <!-- 搜索和筛选 -->
      <div class="filters">
        <div class="search-box">
          <input
            v-model="filters.search"
            @input="debounceSearch"
            placeholder="搜索题号或题目内容..."
            class="search-input"
          />
        </div>

        <select v-model="filters.question_type" @change="loadQuestions" class="filter-select">
          <option value="">全部题型</option>
          <option value="判断题">判断题</option>
          <option value="单项选择题">单项选择题</option>
          <option value="多项选择题">多项选择题</option>
        </select>

        <select v-model="filters.category" @change="loadQuestions" class="filter-select">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>

        <label class="checkbox-filter">
          <input type="checkbox" v-model="filters.is_doubtful" @change="loadQuestions" />
          仅显示存疑
        </label>
      </div>

      <!-- 题目表格 -->
      <div class="questions-table-container">
        <table class="questions-table">
          <thead>
            <tr>
              <th>题号</th>
              <th>题型</th>
              <th>题目内容</th>
              <th>当前答案</th>
              <th>存疑状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="q in questions"
              :key="q.id"
              :class="{ 'doubtful-row': q.is_doubtful && !q.doubt_resolved }"
            >
              <td><strong>{{ q.question_no }}</strong></td>
              <td>
                <span class="type-badge" :class="getTypeClass(q.question_type)">
                  {{ q.question_type }}
                </span>
              </td>
              <td class="question-text">{{ truncate(q.question_text, 80) }}</td>
              <td><strong class="answer-text">{{ q.correct_answer }}</strong></td>
              <td>
                <span v-if="q.is_doubtful && !q.doubt_resolved" class="doubt-badge">
                  ⚠️ 存疑
                </span>
                <span v-else-if="q.is_doubtful && q.doubt_resolved" class="resolved-badge">
                  ✅ 已解决
                </span>
                <span v-else class="normal-badge">正常</span>
              </td>
              <td>
                <button @click="openEditModal(q)" class="btn-edit">编辑</button>
                <button
                  v-if="!q.is_doubtful"
                  @click="markDoubtful(q)"
                  class="btn-doubt"
                >
                  标记存疑
                </button>
                <button v-else @click="resolveDoubt(q)" class="btn-resolve">
                  解决存疑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1" class="page-btn">
          上一页
        </button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button @click="nextPage" :disabled="currentPage >= totalPages" class="page-btn">
          下一页
        </button>
      </div>
    </div>

    <!-- 存疑题目视图 -->
    <div v-if="currentTab === 'doubtful'" class="doubtful-view">
      <div class="doubtful-stats">
        <div class="stat-card">
          <h3>待解决存疑</h3>
          <p class="stat-value">{{ stats.doubtful_count || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>今日修复</h3>
          <p class="stat-value">{{ stats.today_fixes || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>总修复数</h3>
          <p class="stat-value">{{ stats.total_fixes || 0 }}</p>
        </div>
      </div>

      <!-- 存疑题目列表 -->
      <div class="doubtful-list">
        <h3>存疑题目列表</h3>
        <div v-if="doubtfulQuestions.length === 0" class="empty-state">
          暂无存疑题目
        </div>
        <div v-else class="doubtful-items">
          <div
            v-for="q in doubtfulQuestions"
            :key="q.id"
            class="doubtful-item"
          >
            <div class="item-header">
              <span class="question-no">题目 {{ q.question_no }}</span>
              <span class="question-type">{{ q.question_type }}</span>
            </div>
            <p class="question-content">{{ q.question_text }}</p>
            <p v-if="q.doubt_reason" class="doubt-reason">
              <strong>存疑原因:</strong> {{ q.doubt_reason }}
            </p>
            <div class="item-actions">
              <button @click="openEditModal(q)" class="btn-edit">修改答案</button>
              <button @click="resolveDoubt(q)" class="btn-resolve">解决存疑</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 修改日志视图 -->
    <div v-if="currentTab === 'logs'" class="logs-view">
      <h3>修改日志</h3>
      <div v-if="logs.length === 0" class="empty-state">
        暂无修改记录
      </div>
      <div v-else class="logs-timeline">
        <div v-for="log in logs" :key="log.id" class="log-item">
          <div class="log-header">
            <span class="log-question-no">题目 {{ log.question_no }}</span>
            <span class="log-time">{{ formatTime(log.fixed_at) }}</span>
            <span class="log-user">{{ log.fixed_by || '未知' }}</span>
          </div>
          <div class="log-content">
            <span class="answer-change">
              {{ log.old_answer }} → {{ log.new_answer }}
            </span>
            <span v-if="log.fix_reason" class="log-reason">
              原因: {{ log.fix_reason }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计分析视图 -->
    <div v-if="currentTab === 'stats'" class="stats-view">
      <h3>统计分析</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <h4>总修复次数</h4>
          <p class="stat-number">{{ stats.total_fixes || 0 }}</p>
        </div>
        <div class="stat-item">
          <h4>今日修复</h4>
          <p class="stat-number">{{ stats.today_fixes || 0 }}</p>
        </div>
        <div class="stat-item">
          <h4>待解决存疑</h4>
          <p class="stat-number">{{ stats.doubtful_count || 0 }}</p>
        </div>
      </div>

      <div v-if="topModifiers.length > 0" class="top-modifiers">
        <h4>修改排行榜</h4>
        <table class="modifiers-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>操作人</th>
              <th>修改次数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(modifier, index) in topModifiers" :key="modifier.fixed_by">
              <td>{{ index + 1 }}</td>
              <td>{{ modifier.fixed_by || '未知' }}</td>
              <td>{{ modifier.fix_count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑答案弹窗 -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>编辑题目 - {{ editingQuestion?.question_no }}</h3>
          <button @click="closeEditModal" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <div class="question-preview">
            <h4>题目内容</h4>
            <p>{{ editingQuestion?.question_text }}</p>

            <div
              v-if="editingQuestion?.question_type !== '判断题'"
              class="options-preview"
            >
              <p v-if="editingQuestion?.option_a">A. {{ editingQuestion.option_a }}</p>
              <p v-if="editingQuestion?.option_b">B. {{ editingQuestion.option_b }}</p>
              <p v-if="editingQuestion?.option_c">C. {{ editingQuestion.option_c }}</p>
              <p v-if="editingQuestion?.option_d">D. {{ editingQuestion.option_d }}</p>
            </div>
          </div>

          <div class="edit-form">
            <div class="form-group">
              <label>当前答案</label>
              <input
                :value="editingQuestion?.correct_answer"
                disabled
                class="input-disabled"
              />
            </div>

            <div class="form-group">
              <label>新答案</label>
              <input
                v-model="editForm.new_answer"
                placeholder="输入新答案（如：A 或 ABD）"
                class="input-field"
                maxlength="10"
              />
              <small class="help-text">
                单选输入A/B/C/D，多选输入AB/ACD等，判断题A=正确 B=错误
              </small>
            </div>

            <div class="form-group">
              <label>修改原因</label>
              <textarea
                v-model="editForm.fix_reason"
                placeholder="说明修改原因..."
                class="textarea-field"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label>操作人</label>
              <input
                v-model="editForm.fixed_by"
                placeholder="您的姓名或工号"
                class="input-field"
              />
            </div>

            <div v-if="editingQuestion?.is_doubtful" class="doubt-info">
              <label class="checkbox-label">
                <input type="checkbox" v-model="editForm.resolve_doubt" />
                同时解决存疑标记
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeEditModal" class="btn btn-secondary">取消</button>
          <button
            @click="saveEdit"
            class="btn btn-primary"
            :disabled="!editForm.new_answer || !editForm.fixed_by"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>

    <!-- 标记存疑弹窗 -->
    <div v-if="showDoubtModal" class="modal-overlay" @click="closeDoubtModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>标记存疑 - {{ doubtingQuestion?.question_no }}</h3>
          <button @click="closeDoubtModal" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <div class="question-preview">
            <p>{{ doubtingQuestion?.question_text }}</p>
            <p><strong>当前答案:</strong> {{ doubtingQuestion?.correct_answer }}</p>
          </div>

          <div class="edit-form">
            <div class="form-group">
              <label>存疑原因</label>
              <textarea
                v-model="doubtForm.reason"
                placeholder="描述存疑原因..."
                class="textarea-field"
                rows="3"
                required
              ></textarea>
            </div>

            <div class="form-group">
              <label>建议答案（可选）</label>
              <input
                v-model="doubtForm.suggested_answer"
                placeholder="如果知道正确答案，可以填写"
                class="input-field"
              />
            </div>

            <div class="form-group">
              <label>报告人</label>
              <input
                v-model="doubtForm.reported_by"
                placeholder="您的姓名或工号"
                class="input-field"
                required
              />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDoubtModal" class="btn btn-secondary">取消</button>
          <button
            @click="submitDoubt"
            class="btn btn-warning"
            :disabled="!doubtForm.reason || !doubtForm.reported_by"
          >
            确认标记
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const API_BASE = '/api/v2/admin'
const ADMIN_KEY = 'exam-admin-2026'

export default {
  name: 'QuestionAdmin',

  data() {
    return {
      currentTab: 'list',
      questions: [],
      doubtfulQuestions: [],
      logs: [],
      stats: {},
      topModifiers: [],
      categories: [],

      // 筛选条件
      filters: {
        search: '',
        question_type: '',
        category: '',
        is_doubtful: false
      },

      // 分页
      currentPage: 1,
      totalPages: 1,
      pageSize: 50,

      // 编辑
      showEditModal: false,
      editingQuestion: null,
      editForm: {
        new_answer: '',
        fix_reason: '',
        fixed_by: '',
        resolve_doubt: false
      },

      // 存疑
      showDoubtModal: false,
      doubtingQuestion: null,
      doubtForm: {
        reason: '',
        suggested_answer: '',
        reported_by: ''
      },

      // 防抖定时器
      searchTimer: null
    }
  },

  methods: {
    async loadQuestions() {
      try {
        const params = {
          page: this.currentPage,
          limit: this.pageSize,
          ...this.filters
        }

        const response = await axios.get(`${API_BASE}/questions`, {
          params,
          headers: { 'X-Admin-Key': ADMIN_KEY }
        })

        this.questions = response.data.questions
        this.totalPages = Math.ceil(response.data.total / this.pageSize)
      } catch (error) {
        console.error('加载题目失败:', error)
        this.$toast?.error('加载题目失败')
      }
    },

    async loadDoubtfulQuestions() {
      try {
        const response = await axios.get(`${API_BASE}/questions`, {
          params: { is_doubtful: 'true', doubt_resolved: 'false', limit: 100 },
          headers: { 'X-Admin-Key': ADMIN_KEY }
        })

        this.doubtfulQuestions = response.data.questions
      } catch (error) {
        console.error('加载存疑题目失败:', error)
      }
    },

    async loadStats() {
      try {
        const response = await axios.get(`${API_BASE}/fix-log/stats`, {
          headers: { 'X-Admin-Key': ADMIN_KEY }
        })

        this.stats = response.data.statistics
        this.topModifiers = response.data.top_modifiers || []
      } catch (error) {
        console.error('加载统计失败:', error)
      }
    },

    async loadLogs() {
      try {
        const response = await axios.get(`${API_BASE}/fix-log`, {
          params: { limit: 50 },
          headers: { 'X-Admin-Key': ADMIN_KEY }
        })

        this.logs = response.data.logs
      } catch (error) {
        console.error('加载日志失败:', error)
      }
    },

    async loadCategories() {
      try {
        const response = await axios.get(`${API_BASE}/categories`, {
          headers: { 'X-Admin-Key': ADMIN_KEY }
        })

        this.categories = response.data
      } catch (error) {
        console.error('加载分类失败:', error)
      }
    },

    openEditModal(question) {
      this.editingQuestion = { ...question }
      this.editForm = {
        new_answer: '',
        fix_reason: '',
        fixed_by: localStorage.getItem('admin_user') || '',
        resolve_doubt: question.is_doubtful
      }
      this.showEditModal = true
    },

    closeEditModal() {
      this.showEditModal = false
      this.editingQuestion = null
    },

    async saveEdit() {
      try {
        // 验证答案格式
        if (!this.validateAnswer(this.editForm.new_answer)) {
          alert('答案格式无效！请检查输入')
          return
        }

        // 二次确认
        const confirmMsg = `确认将题目 ${this.editingQuestion.question_no} 的答案从 ${this.editingQuestion.correct_answer} 修改为 ${this.editForm.new_answer}？`
        if (!confirm(confirmMsg)) {
          return
        }

        await axios.put(
          `${API_BASE}/questions/${this.editingQuestion.id}/answer`,
          this.editForm,
          { headers: { 'X-Admin-Key': ADMIN_KEY } }
        )

        alert('修改成功')
        this.closeEditModal()
        this.loadQuestions()
        this.loadStats()

        // 保存操作人
        localStorage.setItem('admin_user', this.editForm.fixed_by)

      } catch (error) {
        console.error('保存失败:', error)
        alert(error.response?.data?.error || '保存失败')
      }
    },

    markDoubtful(question) {
      this.doubtingQuestion = question
      this.doubtForm = {
        reason: '',
        suggested_answer: '',
        reported_by: localStorage.getItem('admin_user') || ''
      }
      this.showDoubtModal = true
    },

    closeDoubtModal() {
      this.showDoubtModal = false
      this.doubtingQuestion = null
    },

    async submitDoubt() {
      try {
        await axios.post(
          `${API_BASE}/questions/${this.doubtingQuestion.id}/doubt`,
          this.doubtForm,
          { headers: { 'X-Admin-Key': ADMIN_KEY } }
        )

        alert('已标记为存疑')
        this.closeDoubtModal()
        this.loadQuestions()
        this.loadStats()

        localStorage.setItem('admin_user', this.doubtForm.reported_by)

      } catch (error) {
        console.error('标记存疑失败:', error)
        alert('标记存疑失败')
      }
    },

    async resolveDoubt(question) {
      const resolved_by = prompt('请输入您的姓名或工号：', localStorage.getItem('admin_user') || '')
      if (!resolved_by) return

      try {
        await axios.delete(
          `${API_BASE}/questions/${question.id}/doubt`,
          {
            data: { resolved_by, resolve_notes: '管理员手动解决' },
            headers: { 'X-Admin-Key': ADMIN_KEY }
          }
        )

        alert('存疑已解决')
        this.loadQuestions()
        this.loadStats()
        this.loadDoubtfulQuestions()

        localStorage.setItem('admin_user', resolved_by)

      } catch (error) {
        console.error('解决存疑失败:', error)
        alert('解决存疑失败')
      }
    },

    validateAnswer(answer) {
      if (!answer) return false
      const normalized = answer.toUpperCase().replace(/[^ABCD]/g, '')
      return normalized.length >= 1 &&
             normalized.length <= 4 &&
             /^[ABCD]+$/.test(normalized) &&
             new Set(normalized).size === normalized.length
    },

    debounceSearch() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.currentPage = 1
        this.loadQuestions()
      }, 500)
    },

    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
        this.loadQuestions()
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
        this.loadQuestions()
      }
    },

    truncate(text, length) {
      return text && text.length > length ? text.substring(0, length) + '...' : text
    },

    formatTime(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    },

    getTypeClass(type) {
      const typeMap = {
        '判断题': 'judge',
        '单项选择题': 'single',
        '多项选择题': 'multi'
      }
      return typeMap[type] || ''
    }
  },

  watch: {
    currentTab(newTab) {
      if (newTab === 'doubtful') {
        this.loadDoubtfulQuestions()
      } else if (newTab === 'logs') {
        this.loadLogs()
      } else if (newTab === 'stats') {
        this.loadStats()
      }
    }
  },

  mounted() {
    this.loadQuestions()
    this.loadStats()
    this.loadCategories()
  }
}
</script>

<style scoped>
.question-admin {
  padding: 2rem;
  background: #f5f5f5;
  min-height: 100vh;
}

.admin-header {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.admin-header h2 {
  margin: 0 0 1rem 0;
  color: #333;
}

.admin-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 1rem;
  position: relative;
}

.tab-button:hover {
  border-color: #4CAF50;
  background: #f9f9f9;
}

.tab-button.active {
  border-color: #4CAF50;
  background: #4CAF50;
  color: white;
}

.tab-button .badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #f44336;
  color: white;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 10px;
}

/* 筛选器样式 */
.filters {
  background: white;
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-box {
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
}

.filter-select {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  min-width: 150px;
}

.checkbox-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

/* 表格样式 */
.questions-table-container {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.questions-table {
  width: 100%;
  border-collapse: collapse;
}

.questions-table th {
  background: #f5f5f5;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
}

.questions-table td {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.questions-table tr:hover {
  background: #fafafa;
}

.doubtful-row {
  background: #fff3cd !important;
}

.question-text {
  max-width: 400px;
  color: #666;
}

.answer-text {
  color: #4CAF50;
  font-size: 1.1rem;
}

.type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.type-badge.judge { background: #E3F2FD; color: #1976D2; }
.type-badge.single { background: #E8F5E9; color: #388E3C; }
.type-badge.multi { background: #FFF3E0; color: #F57C00; }

.doubt-badge { color: #f44336; font-weight: 600; }
.resolved-badge { color: #4CAF50; font-weight: 600; }
.normal-badge { color: #999; }

/* 按钮样式 */
.btn-edit, .btn-doubt, .btn-resolve {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-edit { background: #2196F3; color: white; }
.btn-doubt { background: #FF9800; color: white; }
.btn-resolve { background: #4CAF50; color: white; }

/* 分页样式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: white;
  margin-top: 1rem;
  border-radius: 10px;
}

.page-btn {
  padding: 0.5rem 1.5rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  border-color: #4CAF50;
  background: #f9f9f9;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-primary { background: #4CAF50; color: white; }
.btn-secondary { background: #f5f5f5; color: #333; }
.btn-warning { background: #FF9800; color: white; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 表单样式 */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.input-field, .textarea-field {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
}

.input-field:focus, .textarea-field:focus {
  outline: none;
  border-color: #4CAF50;
}

.input-disabled {
  background: #f5f5f5;
  color: #999;
}

.help-text {
  display: block;
  margin-top: 0.25rem;
  color: #666;
  font-size: 0.85rem;
}

.question-preview {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.doubt-info {
  background: #fff3cd;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

/* 存疑视图样式 */
.doubtful-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card h3 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #4CAF50;
  margin: 0;
}

.doubtful-list {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
}

.doubtful-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.doubtful-item {
  background: #fff3cd;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #FF9800;
}

.item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.question-no {
  font-weight: bold;
  color: #333;
}

.question-type {
  color: #666;
  font-size: 0.9rem;
}

.question-content {
  margin: 0.5rem 0;
  color: #333;
}

.doubt-reason {
  color: #f44336;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

/* 日志视图样式 */
.logs-timeline {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
}

.log-item {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.log-item:last-child {
  border-bottom: none;
}

.log-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.log-content {
  display: flex;
  gap: 1rem;
  color: #666;
}

.answer-change {
  font-weight: 600;
  color: #2196F3;
}

/* 统计视图样式 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-item {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-item h4 {
  margin: 0 0 0.5rem 0;
  color: #666;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #4CAF50;
  margin: 0;
}

.top-modifiers {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
}

.modifiers-table {
  width: 100%;
  margin-top: 1rem;
}

.modifiers-table th,
.modifiers-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 100%;
  }

  .filter-select {
    min-width: 100%;
  }

  .questions-table {
    font-size: 0.85rem;
  }

  .questions-table th,
  .questions-table td {
    padding: 0.5rem;
  }

  .question-text {
    max-width: 200px;
  }
}
</style>
