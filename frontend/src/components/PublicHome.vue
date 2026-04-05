<template>
  <div class="public-home">
    <!-- 英雄区 -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">🔐 密评备考系统</h1>
        <p class="hero-subtitle">商用密码应用安全性评估从业人员考核备考平台</p>

        <!-- 未登录时的CTA -->
        <div v-if="!authStore.isAuthenticated" class="hero-cta">
          <button @click="openLoginModal" class="btn-primary-large">
            <span class="btn-icon">🚀</span>
            <span>立即开始备考</span>
          </button>
          <button @click="showRegister" class="btn-secondary-large">
            <span class="btn-icon">📝</span>
            <span>注册账号</span>
          </button>
        </div>

        <!-- 已登录时的欢迎语 -->
        <div v-else class="hero-welcome">
          <p class="welcome-text">欢迎回来，{{ authStore.user?.display_name || authStore.user?.username }}！</p>
          <button @click="startPractice" class="btn-primary-large">
            <span class="btn-icon">📚</span>
            <span>继续学习</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 系统特性介绍 -->
    <section class="features">
      <div class="section-title">
        <h2>✨ 系统特性</h2>
        <p>专业的密评考试备考工具，助您高效备考</p>
      </div>

      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">🎯</div>
          <h3>智能练习</h3>
          <p>5,000+精选题库，智能推荐薄弱知识点</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🧠</div>
          <h3>科学复习</h3>
          <p>基于SuperMemo算法，科学安排复习计划</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>学习进度</h3>
          <p>实时追踪学习进度，科学评估掌握程度</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📖</div>
          <h3>错题管理</h3>
          <p>错题自动收集，针对性重点突破</p>
        </div>
      </div>
    </section>

    <!-- 脱敏的题库统计 -->
    <section class="stats">
      <div class="section-title">
        <h2>📚 题库资源</h2>
        <p>丰富的题库资源，覆盖考试全部知识点</p>
      </div>

      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-number">{{ publicStats.totalQuestions }}</div>
          <div class="stat-label">题目总数</div>
        </div>

        <div class="stat-card">
          <div class="stat-number">{{ publicStats.questionTypes.length }}</div>
          <div class="stat-label">题型种类</div>
        </div>

        <div class="stat-card">
          <div class="stat-number">{{ publicStats.practiceModes }}</div>
          <div class="stat-label">练习模式</div>
        </div>
      </div>
    </section>

    <!-- 练习模式预览（未登录只能看到介绍） -->
    <section class="practice-modes">
      <div class="section-title">
        <h2>🎮 练习模式</h2>
        <p>多样化练习模式，满足不同学习需求</p>
      </div>

      <div class="mode-grid">
        <div class="mode-card" v-for="mode in practiceModes" :key="mode.id">
          <div class="mode-icon">{{ mode.icon }}</div>
          <h3>{{ mode.name }}</h3>
          <p>{{ mode.description }}</p>
          <div class="mode-lock" v-if="!authStore.isAuthenticated">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">需要登录</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 安全提示 -->
    <section v-if="!authStore.isAuthenticated" class="security-notice">
      <div class="notice-card">
        <div class="notice-icon">🛡️</div>
        <div class="notice-content">
          <h3>安全提示</h3>
          <p>系统采用企业级安全标准，保障您的学习数据安全。</p>
          <ul class="security-features">
            <li>✅ 密码加密存储（bcrypt 12轮哈希）</li>
            <li>✅ HTTPS加密传输</li>
            <li>✅ 账户锁定保护</li>
            <li>✅ 会话安全管理</li>
            <li>✅ 审计日志追踪</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- CTA区域 -->
    <section v-if="!authStore.isAuthenticated" class="cta-section">
      <div class="cta-content">
        <h2>🚀 开始您的备考之旅</h2>
        <p>立即注册，体验专业的密评考试备考系统</p>
        <div class="cta-buttons">
          <button @click="openLoginModal" class="btn-primary">
            立即登录
          </button>
          <button @click="showRegister" class="btn-secondary">
            注册账号
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'PublicHome',
  inject: ['authStore'],

  data() {
    return {
      publicStats: {
        totalQuestions: 5000,
        questionTypes: ['单项选择题', '多项选择题', '判断题'],
        practiceModes: 5
      },

      practiceModes: [
        {
          id: 'random',
          icon: '🎲',
          name: '随机练习',
          description: '随机抽取题目练习，全面覆盖知识点'
        },
        {
          id: 'category',
          icon: '📂',
          name: '分类练习',
          description: '按法律分类和技术分类专项练习'
        },
        {
          id: 'exam',
          icon: '🎯',
          name: '考试类别',
          description: '按考试类别分类，针对性练习'
        },
        {
          id: 'smart',
          icon: '🧠',
          name: '智能复习',
          description: '基于遗忘曲线，智能安排复习计划'
        },
        {
          id: 'wrong',
          icon: '📚',
          name: '错题本',
          description: '错题重点突破，查漏补缺'
        }
      ]
    }
  },

  methods: {
    openLoginModal() {
      this.$emit('open-login-modal')
    },

    showRegister() {
      this.$emit('show-register')
    },

    startPractice() {
      this.$emit('start-practice')
    }
  }
}
</script>

<style scoped>
.public-home {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

/* ========== 英雄区 ========== */
.hero {
  padding: 4rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.hero-subtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  margin-bottom: 2rem;
}

.hero-cta {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.hero-welcome {
  margin-top: 2rem;
}

.welcome-text {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.btn-primary-large, .btn-secondary-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.btn-primary-large {
  background: white;
  color: #667eea;
  font-weight: bold;
}

.btn-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-secondary-large {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-secondary-large:hover {
  background: white;
  color: #667eea;
}

/* ========== 特性介绍 ========== */
.features {
  padding: 4rem 2rem;
  background: white;
}

.section-title {
  text-align: center;
  margin-bottom: 3rem;
}

.section-title h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.section-title p {
  color: #6b7280;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  padding: 2rem;
  background: #f9fafb;
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.feature-card p {
  color: #6b7280;
  line-height: 1.6;
}

/* ========== 统计数据 ========== */
.stats {
  padding: 4rem 2rem;
  background: #f9fafb;
}

.stats-cards {
  display: flex;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
}

.stat-card {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  min-width: 150px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stat-number {
  font-size: 3rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #6b7280;
  font-size: 1rem;
}

/* ========== 练习模式 ========== */
.practice-modes {
  padding: 4rem 2rem;
  background: white;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.mode-card {
  padding: 2rem;
  background: #f9fafb;
  border-radius: 12px;
  position: relative;
  border: 2px solid #e5e7eb;
}

.mode-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.mode-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.mode-card p {
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.mode-lock {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fef3c7;
  border-radius: 6px;
  color: #d97706;
  font-size: 0.875rem;
}

.lock-icon {
  font-size: 1rem;
}

/* ========== 安全提示 ========== */
.security-notice {
  padding: 4rem 2rem;
  background: #f0fdf4;
}

.notice-card {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 2rem;
}

.notice-icon {
  font-size: 3rem;
}

.notice-content h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #1f2937;
}

.security-features {
  list-style: none;
  padding: 0;
}

.security-features li {
  padding: 0.5rem 0;
  color: #6b7280;
}

/* ========== CTA区域 ========== */
.cta-section {
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
}

.cta-content h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* ========== 移动端优化 ========== */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-cta {
    flex-direction: column;
  }

  .btn-primary-large, .btn-secondary-large {
    width: 100%;
    justify-content: center;
  }

  .stats-cards {
    flex-direction: column;
    gap: 1rem;
  }

  .stat-card {
    min-width: auto;
  }

  .notice-card {
    flex-direction: column;
  }

  .cta-buttons {
    flex-direction: column;
  }
}
</style>