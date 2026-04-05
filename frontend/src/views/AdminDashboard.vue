<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1>🔧 管理员控制台</h1>
      <p>系统管理 · 用户监控 · 数据分析</p>
    </div>

    <div class="dashboard-tabs">
      <button v-for="tab in tabs" :key="tab.id" :class="['tab-button', { active: activeTab === tab.id }]" @click="activeTab = tab.id">
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="dashboard-content">
      <div v-if="activeTab === 'users'" class="tab-content">
        <h2>用户管理</h2>
        <p class="tab-desc">管理用户注册、审批和权限</p>
        <div class="placeholder">🚧 正在开发中...</div>
      </div>

      <div v-if="activeTab === 'monitoring'" class="tab-content">
        <h2>学习监控</h2>
        <p class="tab-desc">查看全员学习进度和活跃度</p>
        <div class="placeholder">🚧 正在开发中...</div>
      </div>

      <div v-if="activeTab === 'config'" class="tab-content">
        <h2>系统配置</h2>
        <p class="tab-desc">配置系统参数和规则</p>
        <div class="placeholder">🚧 正在开发中...</div>
      </div>

      <div v-if="activeTab === 'analytics'" class="tab-content">
        <h2>数据分析</h2>
        <p class="tab-desc">系统概览、用户行为、题目分析</p>
        <div class="placeholder">🚧 正在开发中...</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminDashboard',
  data() {
    return {
      activeTab: 'users',
      tabs: [
        { id: 'users', label: '用户管理', icon: '👥' },
        { id: 'monitoring', label: '学习监控', icon: '📊' },
        { id: 'config', label: '系统配置', icon: '⚙️' },
        { id: 'analytics', label: '数据分析', icon: '📈' }
      ]
    };
  }
};
</script>

<style scoped>
.admin-dashboard { min-height: 100vh; background: #f9fafb; }
.dashboard-header { background: white; padding: 2rem; border-bottom: 1px solid #e5e7eb; }
.dashboard-header h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #1f2937; }
.dashboard-header p { color: #6b7280; font-size: 1.1rem; }

.dashboard-tabs { display: flex; gap: 1rem; padding: 1rem 2rem 0; background: white; }
.tab-button { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: transparent; border: none; border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.3s; font-size: 1rem; color: #6b7280; border-bottom: 2px solid transparent; }
.tab-button:hover { background: #f3f4f6; color: #374151; }
.tab-button.active { background: #f9fafb; color: #667eea; border-bottom-color: #667eea; }

.dashboard-content { padding: 2rem; }
.tab-content { background: white; padding: 2rem; border-radius: 12px; min-height: 400px; }
.tab-content h2 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #1f2937; }
.tab-desc { color: #6b7280; margin-bottom: 2rem; }

.placeholder { text-align: center; padding: 4rem 2rem; color: #9ca3af; font-size: 1.2rem; }
</style>
