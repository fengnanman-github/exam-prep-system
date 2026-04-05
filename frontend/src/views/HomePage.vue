<template>
  <div class="home-page">
    <header class="header">
      <div class="header-content">
        <div class="brand">🔐 密评备考系统</div>
        <div class="user-info">
          <span>{{ authStore.user?.display_name || authStore.user?.username }}</span>
          <button @click="handleLogout" class="logout-btn">🚪 登出</button>
        </div>
      </div>
    </header>

    <nav class="nav">
      <router-link to="/practice" class="nav-item">🎯 随机练习</router-link>
      <router-link to="/category-practice" class="nav-item">📂 分类练习</router-link>
      <router-link to="/exam-category-practice" class="nav-item">🎯 考试类别</router-link>
      <router-link to="/custom-practice" class="nav-item">🔧 专项练习</router-link>
      <router-link to="/document-review" class="nav-item">📖 文档复习</router-link>
      <router-link to="/smart-review" class="nav-item">🧠 智能复习</router-link>
      <router-link to="/intelligent-review" class="nav-item">⚡ 智能复习+</router-link>
      <router-link to="/wrong-answers" class="nav-item">📚 错题本</router-link>
      <router-link to="/progress" class="nav-item">📊 学习进度</router-link>
      <router-link v-if="authStore.isAdmin()" to="/admin" class="nav-item admin">🔧 管理员</router-link>
    </nav>

    <main class="content">
      <h1>欢迎，{{ authStore.user?.display_name || authStore.user?.username }}！</h1>

      <div class="quick-actions">
        <div class="action-card" @click="$router.push('/practice')">
          <div class="icon">🎯</div>
          <div class="title">继续练习</div>
          <div class="desc">随机抽题</div>
        </div>
        <div class="action-card" @click="$router.push('/exam-category-practice')">
          <div class="icon">📝</div>
          <div class="title">考试类别</div>
          <div class="desc">按考试大纲</div>
        </div>
        <div class="action-card" @click="$router.push('/custom-practice')">
          <div class="icon">🔧</div>
          <div class="title">专项练习</div>
          <div class="desc">自定义题目</div>
        </div>
        <div class="action-card" @click="$router.push('/smart-review')">
          <div class="icon">🧠</div>
          <div class="title">智能复习</div>
          <div class="desc">待复习题目</div>
        </div>
        <div class="action-card" @click="$router.push('/wrong-answers')">
          <div class="icon">📚</div>
          <div class="title">错题本</div>
          <div class="desc">{{ wrongCount }}道错题</div>
        </div>
        <div class="action-card" @click="$router.push('/progress')">
          <div class="icon">📊</div>
          <div class="title">学习进度</div>
          <div class="desc">查看统计</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  inject: ['authStore'],
  data() { return { wrongCount: 0 }; },

  methods: {
    handleLogout() {
      this.authStore.logout();
      this.$router.push('/login');
    }
  }
};
</script>

<style scoped>
.home-page { min-height: 100vh; background: #f9fafb; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1rem 2rem; color: white; }
.header-content { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; }
.brand { font-size: 1.5rem; font-weight: bold; }
.user-info { display: flex; align-items: center; gap: 1rem; }
.logout-btn { padding: 0.5rem 1rem; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: white; cursor: pointer; }
.logout-btn:hover { background: rgba(255,255,255,0.3); }

.nav { background: white; padding: 1rem 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto; white-space: nowrap; }
.nav-item { display: inline-block; padding: 1rem 1.5rem; text-decoration: none; color: #374151; border-bottom: 3px solid transparent; transition: all 0.3s; }
.nav-item:hover { background: #f9fafb; border-bottom-color: #667eea; }
.nav-item.router-link-active { border-bottom-color: #667eea; color: #667eea; }
.nav-item.admin { background: #fef3c7; color: #92400e; }

.content { max-width: 1200px; margin: 2rem auto; padding: 0 1rem; }
.content h1 { margin-bottom: 2rem; color: #1f2937; }

.quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; }
.action-card { background: white; padding: 2rem; border-radius: 12px; text-align: center; cursor: pointer; transition: all 0.3s; border: 2px solid #e5e7eb; }
.action-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-color: #667eea; }
.icon { font-size: 3rem; margin-bottom: 1rem; }
.title { font-size: 1.25rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem; }
.desc { color: #6b7280; font-size: 0.9rem; }

@media (max-width: 768px) {
  .nav { padding: 0.5rem 0; }
  .nav-item { padding: 0.75rem 1rem; font-size: 0.9rem; }
  .quick-actions { grid-template-columns: repeat(2, 1fr); }
}
</style>
