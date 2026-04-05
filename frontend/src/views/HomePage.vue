<template>
  <div class="home-page">
    <div class="header">
      <h1>🔐 密评备考系统</h1>
      <p class="subtitle">欢迎回来，{{ authStore.user?.display_name || authStore.user?.username }}！</p>
    </div>

    <div class="content">
      <div class="welcome-section">
        <h2>开始学习</h2>
        <div class="action-cards">
          <router-link to="/practice" class="action-card">
            <div class="card-icon">🎯</div>
            <div class="card-title">随机练习</div>
            <div class="card-desc">随机抽取题目练习</div>
          </router-link>

          <router-link to="/smart-review" class="action-card">
            <div class="card-icon">🧠</div>
            <div class="card-title">智能复习</div>
            <div class="card-desc">基于遗忘曲线复习</div>
          </router-link>

          <router-link to="/wrong-answers" class="action-card">
            <div class="card-icon">📚</div>
            <div class="card-title">错题本</div>
            <div class="card-desc">错题重点突破</div>
          </router-link>

          <router-link to="/progress" class="action-card">
            <div class="card-icon">📊</div>
            <div class="card-title">学习进度</div>
            <div class="card-desc">查看学习统计</div>
          </router-link>
        </div>
      </div>

      <div v-if="authStore.isAdmin()" class="admin-section">
        <h2>管理员功能</h2>
        <router-link to="/admin" class="admin-link">进入管理控制台 →</router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  inject: ['authStore']
};
</script>

<style scoped>
.home-page { min-height: 100vh; background: #f9fafb; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem 2rem; text-align: center; }
.header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
.subtitle { font-size: 1.25rem; opacity: 0.9; }

.content { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.welcome-section, .admin-section { margin-bottom: 3rem; }
.welcome-section h2, .admin-section h2 { font-size: 1.5rem; margin-bottom: 1.5rem; color: #1f2937; }

.action-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
.action-card { background: white; padding: 2rem; border-radius: 12px; text-align: center; text-decoration: none; color: inherit; transition: all 0.3s; border: 2px solid #e5e7eb; }
.action-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-color: #667eea; }
.card-icon { font-size: 3rem; margin-bottom: 1rem; }
.card-title { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: #1f2937; }
.card-desc { color: #6b7280; font-size: 0.9rem; }

.admin-section { background: white; padding: 2rem; border-radius: 12px; border: 2px solid #667eea; }
.admin-link { color: #667eea; text-decoration: none; font-weight: 600; font-size: 1.1rem; }
.admin-link:hover { text-decoration: underline; }
</style>
