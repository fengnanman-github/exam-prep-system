<template>
  <div class="document-review-page">
    <div class="page-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">📖 按文档复习</h1>
        <p class="page-subtitle">围绕原始法律法规和标准进行系统学习</p>
      </div>

      <!-- 统计概览 -->
      <div v-if="stats" class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.over?.total_documents || 0 }}</div>
            <div class="stat-label">文档总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.over?.total_questions || 0 }}</div>
            <div class="stat-label">题目总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.over?.practiced_questions || 0 }}</div>
            <div class="stat-label">已练习</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.over?.accuracy || '0.0' }}%</div>
            <div class="stat-label">正确率</div>
          </div>
        </div>
      </div>

      <!-- 筛选和排序 -->
      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label">📚 文档类别：</label>
          <select v-model="selectedCategory" @change="filterDocuments" class="filter-select category-select">
            <option value="all">全部类别</option>
            <option v-for="cat in uniqueCategories" :key="cat" :value="cat">
              {{ getCategoryLabel(cat) }} ({{ getCategoryCount(cat) }}个文档)
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">优先级筛选：</label>
          <select v-model="selectedPriority" @change="filterDocuments" class="filter-select">
            <option value="all">全部</option>
            <option value="5">⭐⭐⭐⭐⭐ 核心必考</option>
            <option value="4">⭐⭐⭐⭐ 重要考点</option>
            <option value="3">⭐⭐⭐ 一般考点</option>
            <option value="2">⭐⭐ 补充考点</option>
            <option value="1">⭐ 其他</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">排序方式：</label>
          <select v-model="sortBy" @change="filterDocuments" class="filter-select">
            <option value="priority">按优先级</option>
            <option value="accuracy">按正确率</option>
            <option value="questions">按题目数</option>
          </select>
        </div>
      </div>

      <!-- 类别批量练习 -->
      <div v-if="selectedCategory !== 'all'" class="category-practice-bar">
        <div class="category-info">
          <span class="category-icon">{{ getCategoryIcon(selectedCategory) }}</span>
          <span class="category-name">{{ getCategoryLabel(selectedCategory) }}</span>
          <span class="category-stats">
            共{{ getCategoryDocumentCount() }}个文档，
            {{ getCategoryTotalQuestions() }}道题目，
            已练{{ getCategoryPracticedQuestions() }}题
          </span>
        </div>
        <div class="category-actions">
          <button @click="startCategoryPractice" class="btn-category-practice">
            🎯 练习该类别全部题目
          </button>
          <button @click="startCategoryNewPractice" class="btn-category-new">
            🆕 只练未练题目
          </button>
        </div>
      </div>

      <!-- 文档列表 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载文档列表...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
        <button @click="loadData" class="btn-retry">重试</button>
      </div>

      <div v-else-if="filteredDocuments.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>暂无文档数据</p>
        <small>请先在数据库中添加题目并标注文档来源</small>
      </div>

      <div v-else class="documents-list">
        <!-- 按优先级分组 -->
        <div v-for="priority in [5, 4, 3, 2, 1]" :key="priority" class="priority-group">
          <div v-if="getDocumentsByPriority(priority).length > 0" class="priority-section">
            <h3 class="priority-title">{{ getPriorityLabel(priority) }}</h3>
            <div class="documents-grid">
              <div
                v-for="doc in getDocumentsByPriority(priority)"
                :key="doc.document_name"
                class="document-card"
                @click="startDocumentPractice(doc)"
              >
                <div class="doc-header">
                  <span class="doc-icon" :style="{ color: doc.color }">{{ doc.icon }}</span>
                  <h4 class="doc-name">{{ doc.document_name }}</h4>
                  <span v-if="doc.document_priority >= 4" class="doc-badge">重点</span>
                </div>

                <p class="doc-description">{{ doc.description }}</p>

                <div class="doc-meta">
                  <span class="doc-category">{{ doc.category_label }}</span>
                </div>

                <div class="doc-stats">
                  <div class="stat-item">
                    <span class="stat-label">题目数</span>
                    <span class="stat-value">{{ doc.total_questions }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">已练</span>
                    <span class="stat-value">{{ doc.practiced_questions }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">正确率</span>
                    <span
                      class="stat-value"
                      :class="getAccuracyClass(doc.accuracy)"
                    >
                      {{ doc.accuracy }}%
                    </span>
                  </div>
                </div>

                <div class="doc-progress">
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{
                        width: getProgressPercent(doc) + '%',
                        backgroundColor: doc.color
                      }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ getProgressPercent(doc) }}%</span>
                </div>

                <div class="doc-action">
                  <button class="btn-practice">
                    <span>{{ doc.practiced_questions > 0 ? '继续练习' : '开始练习' }}</span>
                    <span class="arrow">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 练习模式弹窗 -->
      <div v-if="showPracticeModal" class="modal-overlay" @click="closePracticeModal">
        <div class="practice-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ selectedDocument?.document_name }}</h3>
            <button @click="closePracticeModal" class="btn-close">✕</button>
          </div>
          <div class="modal-body">
            <p class="modal-info">
              该文档共有 <strong>{{ selectedDocument?.total_questions }}</strong> 道题目
            </p>
            <div class="practice-options">
              <label class="option-item">
                <input type="checkbox" v-model="practiceOptions.excludePracticed" />
                <span>排除已练习题目</span>
              </label>
              <label class="option-item">
                <input type="checkbox" v-model="practiceOptions.randomOrder" />
                <span>随机顺序</span>
              </label>
            </div>
            <div class="practice-count">
              <label>每次练习题目数：</label>
              <input type="number" v-model="practiceOptions.limit" min="5" max="100" class="number-input" />
            </div>
          </div>
          <div class="modal-footer">
            <button @click="closePracticeModal" class="btn-cancel">取消</button>
            <button @click="confirmStartPractice" class="btn-confirm">开始练习</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { versionConfig } from '../config/version-config'

const API_BASE = '/api/v2/documents'

export default {
  name: 'DocumentReview',
  data() {
    return {
      loading: true,
      error: null,
      documents: [],
      stats: null,
      selectedCategory: 'all',
      selectedPriority: 'all',
      sortBy: 'priority',
      filteredDocuments: [],
      showPracticeModal: false,
      selectedDocument: null,
      practiceOptions: {
        excludePracticed: false,
        randomOrder: true,
        limit: 20
      },
      // 统一API支持
      useUnifiedAPI: false
    }
  },
  async mounted() {
    // 检查版本配置
    try {
      await versionConfig.init()
      this.useUnifiedAPI = versionConfig.useUnifiedAPI()
      console.log('DocumentReview: 统一API状态', this.useUnifiedAPI)
    } catch (error) {
      console.error('检查版本配置失败:', error)
      this.useUnifiedAPI = false
    }
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      this.error = null
      try {
        // 优化：只调用一次API，避免重复请求
        await this.loadAllData()
        this.filterDocuments()
      } catch (err) {
        console.error('加载数据失败:', err)
        this.error = '加载失败，请重试'
      } finally {
        this.loading = false
      }
    },
    // 优化：合并所有数据加载为一次API调用
    async loadAllData() {
      const userId = this.getUserId()

      // 只调用一次统一统计API
      const response = await axios.get(`/api/v2/stats/user/${userId}`, {
        timeout: 10000 // 10秒超时
      })
      const stats = response.data

      // 从统一统计API中提取文档数据（优化：直接使用数据，不重复请求）
      this.documents = stats.by_document.map(doc => ({
        document_name: doc.document_name,
        document_category: doc.category,
        document_priority: doc.priority,
        total_questions: parseInt(doc.total) || 0,
        practiced_questions: parseInt(doc.practiced) || 0,
        correct_questions: parseInt(doc.correct) || 0,
        icon: this.getDocumentIcon(doc.category),
        color: this.getCategoryColor(doc.category),
        description: this.getCategoryDescription(doc.category),
        category_label: doc.category || '其他',
        accuracy: doc.total > 0
          ? Math.round((doc.correct / doc.total) * 100 * 10) / 10
          : '0.0'
      }))

      // 构建统计数据
      this.stats = {
        over: {
          total_documents: stats.by_document.length,
          total_questions: stats.overall.total_questions || 0,
          practiced_questions: stats.overall.practiced_questions || 0,
          accuracy: Math.round((stats.overall.accuracy_rate || 0) * 100)
        }
      }
    },
    filterDocuments() {
      let filtered = [...this.documents]

      // 按类别筛选
      if (this.selectedCategory !== 'all') {
        filtered = filtered.filter(doc => doc.document_category === this.selectedCategory)
      }

      // 按优先级筛选
      if (this.selectedPriority !== 'all') {
        filtered = filtered.filter(doc => doc.document_priority === parseInt(this.selectedPriority))
      }

      // 排序
      filtered.sort((a, b) => {
        if (this.sortBy === 'priority') {
          if (b.document_priority !== a.document_priority) {
            return b.document_priority - a.document_priority
          }
          return b.total_questions - a.total_questions
        } else if (this.sortBy === 'accuracy') {
          const accA = parseFloat(a.accuracy) || 0
          const accB = parseFloat(b.accuracy) || 0
          return accA - accB
        } else if (this.sortBy === 'questions') {
          return b.total_questions - a.total_questions
        }
        return 0
      })

      this.filteredDocuments = filtered
    },
    getDocumentsByPriority(priority) {
      return this.filteredDocuments.filter(doc => doc.document_priority === priority)
    },
    getPriorityLabel(priority) {
      const labels = {
        5: '⭐⭐⭐⭐⭐ 核心必考',
        4: '⭐⭐⭐⭐ 重要考点',
        3: '⭐⭐⭐ 一般考点',
        2: '⭐⭐ 补充考点',
        1: '⭐ 其他'
      }
      return labels[priority] || ''
    },
    getAccuracyClass(accuracy) {
      const acc = parseFloat(accuracy) || 0
      if (acc >= 80) return 'accuracy-high'
      if (acc >= 60) return 'accuracy-medium'
      return 'accuracy-low'
    },
    getProgressPercent(doc) {
      if (doc.total_questions === 0) return 0
      return Math.round((doc.practiced_questions / doc.total_questions) * 100)
    },
    startDocumentPractice(doc) {
      this.selectedDocument = doc
      this.showPracticeModal = true
    },
    closePracticeModal() {
      this.showPracticeModal = false
      this.selectedDocument = null
    },
    async confirmStartPractice() {
      if (!this.selectedDocument) return

      try {
        const params = {
          user_id: this.getUserId(),
          limit: this.practiceOptions.limit,
          exclude_practiced: this.practiceOptions.excludePracticed
        }

        const response = await axios.get(
          `${API_BASE}/${encodeURIComponent(this.selectedDocument.document_name)}/questions`,
          { params }
        )

        // 检查是否获取到题目
        if (!response.data || response.data.length === 0) {
          alert(this.practiceOptions.excludePracticed
            ? '该文档下所有题目都已练习过了，请选择不排除已练习题目或选择其他文档'
            : '该文档暂无题目')
          this.closePracticeModal()
          return
        }

        // 存储题目到 sessionStorage
        sessionStorage.setItem('documentPracticeQuestions', JSON.stringify({
          document: this.selectedDocument,
          questions: response.data,
          options: this.practiceOptions
        }))

        // 存储题目到全局变量，供 PracticeMode 组件使用
        window.documentPracticeQuestions = response.data
        window.documentPracticeInfo = {
          documentName: this.selectedDocument.document_name,
          options: this.practiceOptions
        }

        // 跳转到练习页面
        this.$parent.currentView = 'practice'

        this.closePracticeModal()
      } catch (err) {
        console.error('获取题目失败:', err)
        alert('获取题目失败: ' + (err.response?.data?.error || err.message))
      }
    },
    getUserId() {
      // 从 authStore 获取用户ID
      return this.$root.authStore?.user?.id || 'exam_user_001'
    },
    // 文档图标
    getDocumentIcon(category) {
      const icons = {
        '基础': '📖',
        '技术标准': '📋',
        '产品规范': '🔧',
        '应用指南': '💡',
        '检测认证': '✅',
        '法律法规': '⚖️',
        '行政法规': '📜'
      }
      return icons[category] || '📄'
    },
    // 类别颜色
    getCategoryColor(category) {
      const colors = {
        '基础': '#3b82f6',
        '技术标准': '#8b5cf6',
        '产品规范': '#f59e0b',
        '应用指南': '#10b981',
        '检测认证': '#ef4444',
        '法律法规': '#ec4899',
        '行政法规': '#06b6d4'
      }
      return colors[category] || '#6b7280'
    },
    // 类别描述
    getCategoryDescription(category) {
      const descriptions = {
        '基础': '基础知识和概念',
        '技术标准': '技术标准和规范',
        '产品规范': '产品相关规范',
        '应用指南': '应用指导说明',
        '检测认证': '检测认证相关',
        '法律法规': '法律法规文件',
        '行政法规': '行政法规文件'
      }
      return descriptions[category] || ''
    },
    // 类别相关方法
    getCategoryLabel(category) {
      const labels = {
        '法律法规': '⚖️ 法律法规',
        '技术标准': '📋 技术标准',
        '密码算法': '🔐 密码算法',
        '密码协议': '🤝 密码协议',
        '密钥管理': '🔑 密钥管理',
        '密码产品': '🛡️ 密码产品',
        '密码应用': '💼 密码应用',
        '密码检测与评估': '🔍 密码检测与评估'
      }
      return labels[category] || category
    },
    getCategoryIcon(category) {
      const icons = {
        '法律法规': '⚖️',
        '技术标准': '📋',
        '密码算法': '🔐',
        '密码协议': '🤝',
        '密钥管理': '🔑',
        '密码产品': '🛡️',
        '密码应用': '💼',
        '密码检测与评估': '🔍'
      }
      return icons[category] || '📄'
    },
    getCategoryCount(category) {
      return this.documents.filter(doc => doc.document_category === category).length
    },
    getCategoryDocumentCount() {
      if (this.selectedCategory === 'all') return 0
      return this.documents.filter(doc => doc.document_category === this.selectedCategory).length
    },
    getCategoryTotalQuestions() {
      if (this.selectedCategory === 'all') return 0
      return this.documents
        .filter(doc => doc.document_category === this.selectedCategory)
        .reduce((sum, doc) => sum + doc.total_questions, 0)
    },
    getCategoryPracticedQuestions() {
      if (this.selectedCategory === 'all') return 0
      return this.documents
        .filter(doc => doc.document_category === this.selectedCategory)
        .reduce((sum, doc) => sum + doc.practiced_questions, 0)
    },
    // 类别批量练习
    async startCategoryPractice() {
      if (this.selectedCategory === 'all') {
        alert('请先选择一个文档类别')
        return
      }

      try {
        const categoryDocs = this.documents.filter(doc => doc.document_category === this.selectedCategory)
        const allQuestions = []

        // 从所有文档中获取题目
        for (const doc of categoryDocs) {
          const response = await axios.get(
            `${API_BASE}/${encodeURIComponent(doc.document_name)}/questions`,
            {
              params: {
                user_id: this.getUserId(),
                limit: 1000,
                exclude_practiced: false
              }
            }
          )
          allQuestions.push(...response.data)
        }

        if (allQuestions.length === 0) {
          alert('该类别下没有可用题目')
          return
        }

        // 随机打乱题目顺序
        const shuffled = allQuestions.sort(() => Math.random() - 0.5)

        // 存储题目
        window.documentPracticeQuestions = shuffled
        window.documentPracticeInfo = {
          categoryName: this.getCategoryLabel(this.selectedCategory),
          categoryType: this.selectedCategory,
          totalQuestions: shuffled.length,
          isCategoryPractice: true
        }

        // 跳转到练习页面
        this.$parent.currentView = 'practice'
      } catch (err) {
        console.error('获取类别题目失败:', err)
        alert('获取题目失败: ' + (err.response?.data?.error || err.message))
      }
    },
    async startCategoryNewPractice() {
      if (this.selectedCategory === 'all') {
        alert('请先选择一个文档类别')
        return
      }

      try {
        const categoryDocs = this.documents.filter(doc => doc.document_category === this.selectedCategory)
        const allQuestions = []

        // 从所有文档中获取未练习的题目
        for (const doc of categoryDocs) {
          const response = await axios.get(
            `${API_BASE}/${encodeURIComponent(doc.document_name)}/questions`,
            {
              params: {
                user_id: this.getUserId(),
                limit: 1000,
                exclude_practiced: true
              }
            }
          )
          allQuestions.push(...response.data)
        }

        if (allQuestions.length === 0) {
          alert('该类别下所有题目都已练习过了')
          return
        }

        // 随机打乱题目顺序
        const shuffled = allQuestions.sort(() => Math.random() - 0.5)

        // 存储题目
        window.documentPracticeQuestions = shuffled
        window.documentPracticeInfo = {
          categoryName: this.getCategoryLabel(this.selectedCategory),
          categoryType: this.selectedCategory,
          totalQuestions: shuffled.length,
          isCategoryPractice: true,
          excludePracticed: true
        }

        // 跳转到练习页面
        this.$parent.currentView = 'practice'
      } catch (err) {
        console.error('获取类别题目失败:', err)
        alert('获取题目失败: ' + (err.response?.data?.error || err.message))
      }
    }
  },
  computed: {
    uniqueCategories() {
      const categories = new Set()
      this.documents.forEach(doc => {
        if (doc.document_category) {
          categories.add(doc.document_category)
        }
      })
      return Array.from(categories).sort()
    }
  }
}
</script>

<style scoped>
.document-review-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 2rem 1rem;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-size: 1rem;
  color: #718096;
  margin: 0;
}

/* 统计概览 */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
}

.stat-label {
  font-size: 0.875rem;
  color: #718096;
}

/* 筛选栏 */
.filter-bar {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  gap: 2rem;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
}

.filter-select {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
  color: #2d3748;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234a5568' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
}

.filter-select:hover {
  border-color: #cbd5e0;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-select.category-select {
  background: white;
  color: #2d3748;
  border-color: #667eea;
  font-weight: 500;
  min-width: 200px;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-select.category-select:hover {
  border-color: #5568d3;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.filter-select.category-select:focus {
  border-color: #5568d3;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
  outline: none;
}

/* 确保下拉选项清晰可见 */
.filter-select.category-select option {
  background: white;
  color: #2d3748;
  padding: 0.5rem;
}

.filter-select.category-select option:hover {
  background: #f7fafc;
}

/* 类别练习栏 */
.category-practice-bar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.2);
  flex-wrap: wrap;
  gap: 1rem;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: white;
  flex: 1;
}

.category-icon {
  font-size: 2rem;
}

.category-name {
  font-size: 1.1rem;
  font-weight: 600;
}

.category-stats {
  font-size: 0.9rem;
  opacity: 0.95;
}

.category-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-category-practice,
.btn-category-new {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-category-practice {
  background: white;
  color: #f5576c;
}

.btn-category-practice:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

.btn-category-new {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.btn-category-new:hover {
  background: white;
  color: #f5576c;
}

/* 加载和错误状态 */
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
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

.error-icon,
.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.btn-retry {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-retry:hover {
  background: #5a67d8;
}

/* 文档列表 */
.documents-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.priority-section {
  margin-bottom: 1rem;
}

.priority-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 1rem 0;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.document-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.document-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #667eea;
}

.doc-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.doc-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.doc-name {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  line-height: 1.4;
}

.doc-badge {
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  flex-shrink: 0;
}

.doc-description {
  font-size: 0.875rem;
  color: #718096;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.doc-meta {
  margin-bottom: 1rem;
}

.doc-category {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #edf2f7;
  color: #4a5568;
  font-size: 0.75rem;
  border-radius: 4px;
  font-weight: 500;
}

.doc-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem 0;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #a0aec0;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: #2d3748;
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

.doc-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
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
  transition: width 0.3s ease;
  border-radius: 3px;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
  min-width: 40px;
  text-align: right;
}

.doc-action {
  display: flex;
  justify-content: center;
}

.btn-practice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-practice:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.arrow {
  font-size: 1.125rem;
  transition: transform 0.2s;
}

.btn-practice:hover .arrow {
  transform: translateX(4px);
}

/* 练习弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.practice-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #2d3748;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #edf2f7;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.25rem;
  color: #718096;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #e2e8f0;
  color: #2d3748;
}

.modal-body {
  padding: 1.5rem;
}

.modal-info {
  font-size: 1rem;
  color: #4a5568;
  margin: 0 0 1.5rem 0;
}

.modal-info strong {
  color: #667eea;
  font-weight: 700;
}

.practice-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #4a5568;
}

.option-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.practice-count {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #4a5568;
}

.number-input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  text-align: center;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #edf2f7;
  color: #4a5568;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 响应式 */
@media (max-width: 768px) {
  .documents-grid {
    grid-template-columns: 1fr;
  }

  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .filter-group {
    justify-content: space-between;
  }

  .filter-select {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.5rem;
  }

  .stats-overview {
    grid-template-columns: 1fr;
  }

  .category-practice-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .category-actions {
    flex-direction: column;
    width: 100%;
  }

  .btn-category-practice,
  .btn-category-new {
    width: 100%;
  }
}
</style>
