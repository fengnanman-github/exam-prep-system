<template>
  <div id="app">
    <!-- 优化的 Header -->
    <header class="header">
      <div class="header-content">
        <!-- Logo 和标题 -->
        <div class="header-brand">
          <div class="logo">🔐</div>
          <div class="brand-text">
            <h1 class="brand-title">密评备考系统</h1>
            <p class="brand-subtitle">商用密码应用安全性评估考核</p>
          </div>
        </div>

        <!-- 右侧操作区 -->
        <div class="header-actions">
          <!-- 已登录用户信息 -->
          <div v-if="authStore.isAuthenticated" class="user-section">
            <!-- 用户下拉菜单 -->
            <div class="user-dropdown" @click="toggleUserMenu">
              <div class="user-avatar">
                <span class="avatar-icon">{{ (authStore.user?.display_name || authStore.user?.username || 'U').charAt(0).toUpperCase() }}</span>
              </div>
              <div class="user-info-text">
                <span class="user-display-name">{{ authStore.user?.display_name || authStore.user?.username }}</span>
                <span v-if="authStore.isAdmin()" class="user-role">管理员</span>
                <span v-else class="user-role">学员</span>
              </div>
              <span class="dropdown-arrow" :class="{ active: showUserMenu }">▼</span>
            </div>

            <!-- 用户菜单（展开状态） -->
            <div v-if="showUserMenu" class="user-menu-popup" @click.stop>
              <div class="menu-header">
                <div class="menu-avatar">
                  <span>{{ (authStore.user?.display_name || authStore.user?.username || 'U').charAt(0).toUpperCase() }}</span>
                </div>
                <div class="menu-user-info">
                  <div class="menu-user-name">{{ authStore.user?.display_name || authStore.user?.username }}</div>
                  <div class="menu-user-role">{{ authStore.isAdmin() ? '管理员' : '学员' }}</div>
                </div>
              </div>
              <div class="menu-divider"></div>
              <button @click="openChangePasswordModal" class="menu-item">
                <span class="menu-icon">🔑</span>
                <span>修改密码</span>
              </button>
              <button @click="handleLogout" class="menu-item danger">
                <span class="menu-icon">🚪</span>
                <span>退出登录</span>
              </button>
            </div>
          </div>

          <!-- 未登录显示登录按钮 -->
          <button v-else @click="openLoginModal" class="btn-login">
            <span class="btn-icon">🔓</span>
            <span>登录</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 导航栏 -->
    <nav class="nav">
      <div class="nav-container">
        <div class="nav-menu">
          <button @click="currentView = 'home'" :class="{ active: currentView === 'home' }" class="nav-btn">
            <span class="nav-icon">🏠</span>
            <span class="nav-text">首页</span>
          </button>
          <button @click="currentView = 'practice'" :class="{ active: currentView === 'practice' }" class="nav-btn">
            <span class="nav-icon">🎯</span>
            <span class="nav-text">练习</span>
          </button>
          <button @click="currentView = 'category-practice'" :class="{ active: currentView === 'category-practice' }" class="nav-btn">
            <span class="nav-icon">📂</span>
            <span class="nav-text">分类</span>
          </button>
          <button @click="currentView = 'exam-category-practice'" :class="{ active: currentView === 'exam-category-practice' }" class="nav-btn highlight-btn">
            <span class="nav-icon">🎯</span>
            <span class="nav-text">考试类别</span>
          </button>
          <button @click="currentView = 'document-review'" :class="{ active: currentView === 'document-review' }" class="nav-btn">
            <span class="nav-icon">📖</span>
            <span class="nav-text">文档</span>
          </button>
          <button @click="currentView = 'smart-review'" :class="{ active: currentView === 'smart-review' }" class="nav-btn">
            <span class="nav-icon">🧠</span>
            <span class="nav-text">复习</span>
          </button>
          <button @click="currentView = 'wrong-answers'" :class="{ active: currentView === 'wrong-answers' }" class="nav-btn">
            <span class="nav-icon">📚</span>
            <span class="nav-text">错题</span>
          </button>
          <button @click="currentView = 'progress'" :class="{ active: currentView === 'progress' }" class="nav-btn">
            <span class="nav-icon">📊</span>
            <span class="nav-text">进度</span>
          </button>
          <button @click="currentView = 'mock-exam'" :class="{ active: currentView === 'mock-exam' }" class="nav-btn">
            <span class="nav-icon">📝</span>
            <span class="nav-text">考试</span>
          </button>
          <button
            v-if="authStore.isAdmin()"
            @click="currentView = 'question-admin'"
            :class="{ active: currentView === 'question-admin' }"
            class="nav-btn admin-btn"
          >
            <span class="nav-icon">🔧</span>
            <span class="nav-text">题目管理</span>
          </button>
          <button
            v-if="authStore.isAdmin()"
            @click="currentView = 'admin-config'"
            :class="{ active: currentView === 'admin-config' }"
            class="nav-btn admin-btn"
          >
            <span class="nav-icon">⚙️</span>
            <span class="nav-text">系统配置</span>
          </button>
        </div>
      </div>
    </nav>

    <main class="main" id="main-content">
      <!-- 首页视图 -->
      <div v-if="currentView === 'home'" class="home-view">
        <!-- 欢迎区域 -->
        <div class="welcome-section">
          <div class="welcome-content">
            <h1 class="welcome-title">
              {{ authStore.isAuthenticated ? `欢迎回来，${authStore.user?.display_name || authStore.user?.username}！` : '欢迎使用密评备考系统' }}
            </h1>
            <p class="welcome-subtitle">
              {{ authStore.isAuthenticated ? '继续您的学习之旅，每天进步一点点' : '科学备考，高效学习，助您顺利通过密评考试' }}
            </p>
          </div>
          <div class="welcome-actions">
            <button v-if="!authStore.isAuthenticated" @click="openLoginModal" class="btn-primary-large">
              🔓 立即开始学习
            </button>
          </div>
        </div>

        <!-- 快捷操作区域 -->
        <div class="quick-actions">
          <div class="quick-action-card primary" @click="currentView = 'practice'">
            <div class="action-icon">🎯</div>
            <div class="action-content">
              <h3>开始练习</h3>
              <p>随机题目，即时反馈</p>
            </div>
            <div class="action-arrow">→</div>
          </div>

          <div class="quick-action-card accent" @click="currentView = 'smart-review'">
            <div class="action-icon">🧠</div>
            <div class="action-content">
              <h3>智能复习</h3>
              <p>艾宾浩斯遗忘曲线</p>
            </div>
            <div class="action-badge" v-if="wrongStats.need_review > 0">
              {{ wrongStats.need_review }}题待复习
            </div>
            <div class="action-arrow">→</div>
          </div>

			  <div class="quick-action-card primary" @click="currentView = 'custom-practice'">
			    <div class="action-icon">🎯</div>
			    <div class="action-content">
			      <h3>专项练习</h3>
			      <p>指定题号练习</p>
			    </div>
			    <div class="action-badge">新功能</div>
			    <div class="action-arrow">→</div>
			  </div>

          <div class="quick-action-card" @click="currentView = 'category-practice'">
            <div class="action-icon">📂</div>
            <div class="action-content">
              <h3>分类练习</h3>
              <p>按系统分类学习</p>
            </div>
            <div class="action-arrow">→</div>
          </div>

          <div class="quick-action-card success" @click="currentView = 'document-review'">
            <div class="action-icon">📖</div>
            <div class="action-content">
              <h3>按文档复习</h3>
              <p>围绕原始法规学习</p>
            </div>
            <div class="action-badge">推荐</div>
            <div class="action-arrow">→</div>
          </div>

          <div class="quick-action-card" @click="currentView = 'mock-exam'">
            <div class="action-icon">📝</div>
            <div class="action-content">
              <h3>模拟考试</h3>
              <p>真实考试环境</p>
            </div>
            <div class="action-arrow">→</div>
          </div>

          <div class="quick-action-card" @click="currentView = 'wrong-answers'">
            <div class="action-icon">📚</div>
            <div class="action-content">
              <h3>错题本</h3>
              <p>重点攻克错题</p>
            </div>
            <div class="action-badge" v-if="wrongStats.total_wrong > 0">
              {{ wrongStats.total_wrong }}题
            </div>
            <div class="action-arrow">→</div>
          </div>

          <div class="quick-action-card" @click="currentView = 'progress'">
            <div class="action-icon">📊</div>
            <div class="action-content">
              <h3>学习进度</h3>
              <p>查看学习统计</p>
            </div>
            <div class="action-arrow">→</div>
          </div>
        </div>

        <!-- 统计概览 -->
        <div class="stats-section">
          <h2 class="section-title">📊 学习统计</h2>
          <div class="stats-grid">
            <div class="stat-card-modern">
              <div class="stat-icon">📚</div>
              <div class="stat-info">
                <p class="stat-label">总题目数</p>
                <p class="stat-number">{{ stats.totalQuestions || 0 }}</p>
              </div>
            </div>

            <div class="stat-card-modern">
              <div class="stat-icon">✅</div>
              <div class="stat-info">
                <p class="stat-label">已练习</p>
                <p class="stat-number">{{ stats.practicedCount || 0 }}</p>
              </div>
            </div>

            <div class="stat-card-modern warning" v-if="wrongStats.total_wrong > 0">
              <div class="stat-icon">❌</div>
              <div class="stat-info">
                <p class="stat-label">错题数</p>
                <p class="stat-number">{{ wrongStats.total_wrong }}</p>
              </div>
            </div>

            <div class="stat-card-modern" v-if="wrongStats.need_review > 0">
              <div class="stat-icon">⏰</div>
              <div class="stat-info">
                <p class="stat-label">今日复习</p>
                <p class="stat-number">{{ wrongStats.need_review }}</p>
              </div>
            </div>

            <div class="stat-card-modern success" v-if="wrongStats.mastered_count > 0">
              <div class="stat-icon">🎉</div>
              <div class="stat-info">
                <p class="stat-label">已掌握</p>
                <p class="stat-number">{{ wrongStats.mastered_count }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 学习路径 -->
        <div class="categories-section">
          <div class="section-header">
            <h2 class="section-title">🎯 学习路径</h2>
            <p class="section-subtitle">选择您的学习方向，系统化掌握知识点</p>
          </div>

          <div class="category-grid-modern">
            <div
              v-for="cat in categories"
              :key="cat.category"
              @click="startCategoryPractice(cat.category)"
              class="category-card-modern"
            >
              <div class="category-header">
                <div class="category-icon">{{ cat.icon }}</div>
                <div class="category-progress" v-if="cat.practiced_count > 0">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: (cat.practiced_count / cat.total_count * 100) + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ Math.round(cat.practiced_count / cat.total_count * 100) }}%</span>
                </div>
              </div>

              <h3 class="category-title">{{ cat.category }}</h3>
              <p class="category-desc">{{ cat.description }}</p>

              <div class="category-footer">
                <div class="category-stats">
                  <span class="stat-item">
                    <span class="stat-label">总计</span>
                    <span class="stat-value">{{ cat.total_count }}题</span>
                  </span>
                  <span class="stat-item" v-if="cat.remaining_count > 0">
                    <span class="stat-label">未练</span>
                    <span class="stat-value accent">{{ cat.remaining_count }}</span>
                  </span>
                  <span class="stat-item" v-if="cat.practiced_count > 0">
                    <span class="stat-label">已练</span>
                    <span class="stat-value success">{{ cat.practiced_count }}</span>
                  </span>
                </div>
                <div class="category-action">开始学习 →</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 学习提示 -->
        <div class="tip-section">
          <div class="tip-card">
            <div class="tip-icon">💡</div>
            <div class="tip-content">
              <h4>学习建议</h4>
              <p v-if="wrongStats.need_review > 0">
                您有 {{ wrongStats.need_review }} 道题目需要复习，建议先完成复习再继续新题学习
              </p>
              <p v-else-if="wrongStats.total_wrong > 0">
                当前有 {{ wrongStats.total_wrong }} 道错题，建议使用智能复习功能巩固薄弱知识点
              </p>
              <p v-else>
                建议从《密码法》开始学习，建立系统的知识框架，再逐步深入其他领域
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 练习模式 -->
      <PracticeMode
        v-if="currentView === 'practice'"
        :user-id="currentUserId"
        @back="handleBackToHome"
        @back-to-document="currentView = 'document-review'"
      />

      <!-- 分类练习 -->
      <CategoryPractice
        v-if="currentView === 'category-practice'"
        :user-id="currentUserId"
        @back="handleBackToHome"
        :selected-category="selectedCategory"
      />

      <!-- 考试类别练习 -->
      <ExamCategoryPractice
        v-if="currentView === 'exam-category-practice'"
        @back="handleBackToHome"
      />

      <!-- 文档复习 -->
      <keep-alive>
        <DocumentReview
          v-if="currentView === 'document-review'"
          :user-id="currentUserId"
          @back="handleBackToHome"
          @start-practice="currentView = 'practice'"
          :key="currentUserId"
        />
      </keep-alive>

      <!-- 模拟考试 -->
      <MockExam
        v-if="currentView === 'mock-exam'"
        :user-id="currentUserId"
        @back="handleBackToHome"
      />

      <!-- 智能复习 -->
      <SmartReview
        v-if="currentView === 'smart-review'"
        :user-id="currentUserId"
        @back="handleBackToHome"
      />

      <!-- 专项练习 -->
      <CustomPractice
        v-if="currentView === 'custom-practice'"
        :user-id="currentUserId"
        :question-ids="customPracticeQuestionIds"
        @back="handleBackToHome"
        @practice-completed="handlePracticeCompleted"
      />

      <!-- 错题本 -->
      <WrongAnswersBook
        v-if="currentView === 'wrong-answers'"
        :user-id="currentUserId"
        @back="handleBackToHome"
        @start-practice="handleStartPractice"
      />

      <!-- 学习进度 -->
      <ProgressStats
        v-if="currentView === 'progress'"
        :user-id="currentUserId"
        @back="handleBackToHome"
      />

      <!-- 题目管理（管理员） -->
      <QuestionAdmin
        v-if="currentView === 'question-admin'"
        :user-id="currentUserId"
        @back="handleBackToHome"
      />

      <!-- 系统配置（管理员） -->
      <AdminConfig
        v-if="currentView === 'admin-config'"
        @back="handleBackToHome"
      />
    </main>

    <!-- 返回顶部按钮 -->
    <button
      v-if="showBackToTop"
      @click="scrollToTop"
      class="back-to-top"
      title="返回顶部"
    >
      ↑
    </button>

    <footer class="footer">
      <p>© 2026 密评备考系统 - 智能错题管理系统已启用</p>
    </footer>

    <!-- 登录/注册模态框 -->
    <LoginModal
      ref="loginModalRef"
      @logged-in="handleLoggedIn"
    />

    <!-- 修改密码模态框 -->
    <ChangePasswordModal
      ref="changePasswordModalRef"
      @password-changed="handlePasswordChanged"
    />
  </div>
</template>

<script>
import axios from 'axios'
import { authStore } from './store/auth'
import PracticeMode from './components/PracticeMode.vue'
import CategoryPractice from './components/CategoryPractice.vue'
import ExamCategoryPractice from './components/ExamCategoryPractice.vue'
import MockExam from './components/MockExam.vue'
import SmartReview from './components/SmartReview.vue'
import WrongAnswersBook from './components/WrongAnswersBook.vue'
import ProgressStats from './components/ProgressStats.vue'
import LoginModal from './components/LoginModal.vue'
import ChangePasswordModal from './components/ChangePasswordModal.vue'
import QuestionAdmin from './components/QuestionAdmin.vue'
import AdminConfig from './components/AdminConfig.vue'
import DocumentReview from './components/DocumentReview.vue'
import CustomPractice from './components/CustomPractice.vue';

const API_BASE = '/api'
const API_V2 = '/api/v2'

export default {
  name: 'App',
  components: {
    PracticeMode,
    CategoryPractice,
    ExamCategoryPractice,
    MockExam,
    SmartReview,
    WrongAnswersBook,
    ProgressStats,
    LoginModal,
    ChangePasswordModal,
    QuestionAdmin,
    AdminConfig,
    DocumentReview,
    CustomPractice
  },
  data() {
    return {
      currentView: 'home',
      stats: {},
      wrongStats: {},
      categories: [],
      selectedCategory: null,
      authStore,
      showBackToTop: false,
      showUserMenu: false,
      customPracticeQuestionIds: null // 用于专项练习的题目ID
    }
  },
  computed: {
    // 动态获取当前用户ID
    currentUserId() {
      return this.authStore.getCurrentUserId()
    }
  },
  async mounted() {
    // 初始化认证状态
    this.authStore.init()

    // 加载数据
    await this.loadStats()
    await this.loadWrongStats()
    await this.loadCategories()

    // 添加滚动监听
    window.addEventListener('scroll', this.handleScroll)

    // 添加全局点击监听，用于关闭用户菜单
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    // 移除事件监听
    window.removeEventListener('scroll', this.handleScroll)
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    handleClickOutside(event) {
      // 如果点击的不是用户下拉菜单区域，关闭菜单
      const userSection = this.$el.querySelector('.user-section')
      if (userSection && !userSection.contains(event.target)) {
        this.showUserMenu = false
      }
    },

    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu
    },

    async loadStats() {
      try {
        // 获取用户的个人统计数据，而非全局统计
        const response = await axios.get(`${API_V2}/stats/user/${this.currentUserId}`)
        const userStats = response.data.overall

        // 转换为首页需要的格式
        this.stats = {
          totalQuestions: userStats.total_questions,
          practicedQuestions: userStats.practiced_questions,
          correctAnswers: userStats.correct_answers,
          wrongAnswers: userStats.wrong_answers,
          accuracyRate: userStats.accuracy_rate
        }

        console.log('✅ 首页用户统计已更新:', this.stats)
      } catch (error) {
        console.error('❌ 加载统计信息失败:', error)
      }
    },

    async loadWrongStats() {
      try {
        const response = await axios.get(`${API_BASE}/wrong-answers/${this.currentUserId}/stats`)
        this.wrongStats = response.data
      } catch (error) {
        console.error('加载错题统计失败:', error)
      }
    },

    async loadCategories() {
      try {
        // 加载新的学习路径分类
        const [categoriesRes, statsRes] = await Promise.all([
          axios.get(`${API_V2}/categories/learning-paths`),
          axios.get(`${API_V2}/practice/all-stats/${this.currentUserId}`)
        ])

        console.log('分类数据:', categoriesRes.data)
        console.log('统计数据:', statsRes.data)

        // 处理分类数据，添加错误处理
        this.categories = categoriesRes.data.map(cat => {
          // 查找匹配的统计数据（使用更宽松的匹配）
          const stats = statsRes.data.find(s => {
            // 尝试多种匹配方式
            return s.learning_path === cat.category ||
                   s.category === cat.category ||
                   s.learning_path === cat.category
          })

          // 转换total_count为数字
          const totalCount = parseInt(cat.total_count) || 0

          return {
            category: cat.category,
            total_count: totalCount,
            icon: cat.icon || '📚',
            description: cat.description || '',
            practiced_count: stats ? parseInt(stats.practiced_count) : 0,
            remaining_count: stats ? parseInt(stats.remaining_count) : totalCount
          }
        })

        console.log('处理后的分类:', this.categories)
      } catch (error) {
        console.error('加载分类失败:', error)
        // 如果加载失败，至少使用基础分类
        try {
          const fallbackRes = await axios.get(`${API_V2}/categories/learning-paths`)
          this.categories = fallbackRes.data.map(cat => ({
            category: cat.category,
            total_count: parseInt(cat.total_count) || 0,
            icon: cat.icon || '📚',
            description: cat.description || '',
            practiced_count: 0,
            remaining_count: parseInt(cat.total_count) || 0
          }))
        } catch (fallbackError) {
          console.error('加载分类（备用）也失败:', fallbackError)
        }
      }
    },

    startCategoryPractice(category) {
      this.selectedCategory = category
      this.currentView = 'category-practice'
    },

    // ========== 认证相关方法 ==========

    /**
     * 打开登录/注册模态框
     */
    openLoginModal() {
      this.$refs.loginModalRef.open()
    },

    /**
     * 打开修改密码模态框
     */
    openChangePasswordModal() {
      this.$refs.changePasswordModalRef.open()
    },

    /**
     * 登录成功后处理
     */
    handleLoggedIn() {
      // 刷新统计数据以显示新用户的数据
      this.loadStats()
      this.loadWrongStats()
      this.loadCategories()
    },

    /**
     * 返回首页时处理 - 刷新统计数据
     */
    async handleBackToHome() {
      this.currentView = 'home'
      // 清空专项练习题目ID
      this.customPracticeQuestionIds = null
      // 刷新统计数据以显示最新的练习进度
      await this.loadStats()
      await this.loadWrongStats()
      await this.loadCategories()
      console.log('✅ 返回首页，统计数据已刷新')
    },

    /**
     * 专项练习完成处理
     */
    async handlePracticeCompleted(stats) {
      console.log('📊 专项练习完成:', stats)
      // 刷新统计数据
      await this.loadStats()
      await this.loadWrongStats()
      console.log('✅ 统计数据已刷新')
    },

    /**
     * 从错题本启动专项练习
     */
    handleStartPractice(questionId) {
      // 设置要练习的题目ID（单个或多个）
      this.customPracticeQuestionIds = questionId.toString()
      // 切换到专项练习视图
      this.currentView = 'custom-practice'
    },

    /**
     * 密码修改成功后处理
     */
    handlePasswordChanged() {
      // 密码修改后需要重新登录
      this.authStore.logout()
      this.openLoginModal()
    },

    /**
     * 登出
     */
    handleLogout() {
      if (confirm('确定要登出吗？')) {
        this.authStore.logout()
        // 刷新统计数据以显示默认用户的数据
        this.loadStats()
        this.loadWrongStats()
        this.loadCategories()
      }
    },

    /**
     * 处理页面滚动
     */
    handleScroll() {
      this.showBackToTop = window.pageYOffset > 300
    },

    /**
     * 返回顶部
     */
    scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: #f5f7fa;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ==================== Header 样式 ==================== */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.875rem 2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  gap: 2rem;
  height: 64px;
}

/* Logo 和品牌 */
.header-brand {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex: 0 0 auto;
  min-width: 0;
}

.logo {
  font-size: 2rem;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.brand-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-subtitle {
  font-size: 0.75rem;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧操作区 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex: 0 0 auto;
}

/* 用户区域 */
.user-section {
  position: relative;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.875rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  height: 40px;
}

.user-dropdown:hover {
  background: rgba(255, 255, 255, 0.25);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF9800, #F57C00);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.avatar-icon {
  color: white;
}

.user-info-text {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  min-width: 0;
}

.user-display-name {
  font-size: 0.875rem;
  font-weight: 600;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.user-role {
  font-size: 0.7rem;
  opacity: 0.85;
  line-height: 1.2;
}

.dropdown-arrow {
  font-size: 0.625rem;
  transition: transform 0.2s ease;
  opacity: 0.7;
  flex-shrink: 0;
}

.dropdown-arrow.active {
  transform: rotate(180deg);
}

/* 用户菜单弹窗 */
.user-menu-popup {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 240px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: slideDown 0.3s ease;
  z-index: 1000;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.menu-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.menu-user-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.menu-user-name {
  font-size: 1rem;
  font-weight: 600;
}

.menu-user-role {
  font-size: 0.8rem;
  opacity: 0.9;
}

.menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1.25rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
  font-size: 0.95rem;
}

.menu-item:hover {
  background: #f3f4f6;
}

.menu-item.danger {
  color: #dc2626;
}

.menu-item.danger:hover {
  background: #fef2f2;
}

.menu-icon {
  font-size: 1.1rem;
}

/* 登录按钮 */
.btn-login {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-login:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* ==================== 导航栏样式 ==================== */
.nav {
  background: white;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 64px;
  z-index: 99;
  border-bottom: 1px solid #f0f0f0;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  height: 48px;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  width: 100%;
}

.nav-menu::-webkit-scrollbar {
  display: none;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  position: relative;
  height: 36px;
}

.nav-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: all 0.2s ease;
  transform: translateX(-50%);
  border-radius: 2px 2px 0 0;
}

.nav-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.nav-btn:hover::after {
  width: 60%;
}

.nav-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.25);
}

.nav-btn.active::after {
  width: 80%;
  background: rgba(255, 255, 255, 0.5);
}

.nav-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.nav-text {
  line-height: 1;
}

.admin-btn {
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  color: white;
}

.admin-btn:hover {
  background: linear-gradient(135deg, #F57C00 0%, #E65100 100%);
  color: white;
}

.highlight-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
  font-weight: 600;
}

.highlight-btn:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* 响应式样式 */
@media (max-width: 1200px) {
  .header-content,
  .nav-container {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 0.75rem 1rem;
  }

  .header-content {
    gap: 1rem;
    height: 56px;
  }

  .logo {
    font-size: 1.75rem;
  }

  .brand-title {
    font-size: 1.125rem;
  }

  .brand-subtitle {
    display: none;
  }

  .user-dropdown {
    padding: 0.5rem 0.625rem;
    gap: 0.5rem;
  }

  .user-display-name {
    max-width: 80px;
  }

  .user-avatar {
    width: 30px;
    height: 30px;
    font-size: 0.875rem;
  }

  .nav-container {
    padding: 0 1rem;
  }

  .nav-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    height: 34px;
  }
}

@media (max-width: 640px) {
  .header {
    padding: 0.625rem 1rem;
  }

  .header-content {
    gap: 0.75rem;
    height: 52px;
  }

  .logo {
    font-size: 1.625rem;
  }

  .brand-title {
    font-size: 1rem;
  }

  .user-dropdown {
    padding: 0.5rem;
    gap: 0.375rem;
  }

  .user-info-text {
    display: none;
  }

  .dropdown-arrow {
    display: none;
  }

  .nav-container {
    padding: 0 0.75rem;
  }

  .nav-menu {
    gap: 0;
  }

  .nav-btn {
    padding: 0.5rem 0.625rem;
    height: 32px;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 0.5rem 1rem;
  }

  .header-content {
    gap: 0.5rem;
    height: 48px;
  }

  .logo {
    font-size: 1.5rem;
  }

  .brand-text {
    display: none;
  }

  .user-dropdown {
    padding: 0.5rem;
    background: transparent;
    border: none;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
  }

  .header-actions {
    gap: 0.5rem;
  }

  .btn-login {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .nav-container {
    padding: 0 0.5rem;
  }

  .nav-btn {
    padding: 0.5rem;
    height: 32px;
  }
}

/* 超小屏幕优化 */
@media (max-width: 360px) {
  .header-content {
    height: 44px;
  }

  .logo {
    font-size: 1.375rem;
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }

  .nav-btn {
    padding: 0.5rem 0.5rem;
    font-size: 0.8125rem;
  }
}

.main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.home-view {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  text-align: center;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.stat-card h3 {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-card .number {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.8rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.btn.primary {
  background: #667eea;
  color: white;
}

.btn.primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn:not(.primary) {
  background: white;
  color: #495057;
  border: 2px solid #e9ecef;
}

.btn:not(.primary):hover {
  background: #f8f9fa;
  border-color: #dee2e6;
}

.categories {
  margin-top: 3rem;
}

.categories h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #2c3e50;
  font-size: 1.8rem;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.category-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.category-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.category-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.category-card h3 {
  margin: 1rem 0 0.5rem 0;
  color: #2c3e50;
}

.category-card p {
  color: #7f8c8d;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.category-count {
  font-weight: 600;
  color: #667eea;
  margin-top: 1rem;
}

.remaining-count {
  color: #FF9800;
  font-weight: 600;
  font-size: 0.85rem;
}

/* ========== 新增：优化的首页样式 ========== */

/* 欢迎区域 */
.welcome-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem 2rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.welcome-content {
  flex: 1;
}

.welcome-title {
  font-size: 2.2rem;
  margin-bottom: 0.8rem;
  font-weight: 700;
}

.welcome-subtitle {
  font-size: 1.1rem;
  opacity: 0.95;
  margin: 0;
}

.welcome-actions {
  flex-shrink: 0;
}

.btn-primary-large {
  padding: 1rem 2.5rem;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

/* 快捷操作区域 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.quick-action-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
  position: relative;
}

.quick-action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}

.quick-action-card.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.quick-action-card.accent {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.quick-action-card:hover {
  background: white;
}

.quick-action-card.primary:hover,
.quick-action-card.accent:hover {
  background: white;
  color: #333;
}

.action-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
}

.action-content h3 {
  margin: 0 0 0.3rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.action-content p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

.action-badge {
  background: #FF9800;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  flex-shrink: 0;
}

.action-arrow {
  font-size: 1.5rem;
  opacity: 0.5;
  transition: all 0.3s;
}

.quick-action-card:hover .action-arrow {
  opacity: 1;
  transform: translateX(5px);
}

/* 统计区域 */
.stats-section {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 1.6rem;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  font-weight: 600;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-subtitle {
  color: #7f8c8d;
  margin: 0.5rem 0 0 0;
  font-size: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card-modern {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s;
}

.stat-card-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.stat-card-modern.warning {
  border-left: 4px solid #FF9800;
}

.stat-card-modern.success {
  border-left: 4px solid #4CAF50;
}

.stat-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-label {
  margin: 0;
  font-size: 0.9rem;
  color: #7f8c8d;
}

.stat-number {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
}

/* 学习路径区域 */
.categories-section {
  margin-bottom: 2.5rem;
}

.category-grid-modern {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.category-card-modern {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.category-card-modern:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.category-icon {
  font-size: 3rem;
}

.category-progress {
  flex: 1;
  margin-left: 1rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #667eea;
  font-weight: 600;
  margin-left: 0.5rem;
}

.category-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: #2c3e50;
}

.category-desc {
  margin: 0 0 1rem 0;
  color: #7f8c8d;
  font-size: 0.9rem;
  line-height: 1.5;
}

.category-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #ecf0f1;
}

.category-stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
}

.stat-label {
  color: #7f8c8d;
}

.stat-value {
  font-weight: 600;
  color: #2c3e50;
}

.stat-value.accent {
  color: #FF9800;
}

.stat-value.success {
  color: #4CAF50;
}

.category-action {
  color: #667eea;
  font-weight: 600;
  font-size: 0.9rem;
}

/* 学习提示区域 */
.tip-section {
  margin-bottom: 2rem;
}

.tip-card {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  gap: 1rem;
  border-left: 4px solid #FF9800;
}

.tip-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.tip-content h4 {
  margin: 0 0 0.5rem 0;
  color: #e65100;
  font-size: 1.1rem;
}

.tip-content p {
  margin: 0;
  color: #bf360c;
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .welcome-section {
    flex-direction: column;
    text-align: center;
    padding: 2rem 1.5rem;
  }

  .welcome-title {
    font-size: 1.6rem;
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .category-grid-modern {
    grid-template-columns: 1fr;
  }

  .nav {
    padding: 0.8rem 1rem;
  }

  .nav-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.85rem;
  }
}

/* 返回顶部按钮 */
.back-to-top {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #667eea;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.3s;
  z-index: 1000;
}

.back-to-top:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.back-to-top.hidden {
  opacity: 0;
  pointer-events: none;
}

/* 页面滚动动画 */
.home-view {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 加载动画 */
.loading-spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 页脚 */
.footer {
  background: #2c3e50;
  color: white;
  text-align: center;
  padding: 1.5rem;
  margin-top: auto;
}

.footer p {
  margin: 0;
  opacity: 0.9;
}
</style>
