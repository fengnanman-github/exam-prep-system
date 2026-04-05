<template>
  <div class="learning-monitoring">
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <div class="stat-value">{{ overview.active_users || 0 }}</div>
          <div class="stat-label">活跃学员</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-info">
          <div class="stat-value">{{ overview.total_practices || 0 }}</div>
          <div class="stat-label">总练习次数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ overview.avg_accuracy || 0 }}%</div>
          <div class="stat-label">平均正确率</div>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <div class="section">
        <h3>🏆 TOP学员排行</h3>
        <div class="top-users-list">
          <div v-for="(user, index) in topUsers" :key="user.id" class="top-user-item">
            <div class="rank">{{ index + 1 }}</div>
            <div class="user-info">
              <div class="username">{{ user.username }}</div>
              <div class="stats">练习{{ user.questions_practiced }}题 · 正确率{{ user.accuracy_rate }}%</div>
            </div>
            <div class="accuracy-bar">
              <div class="bar-fill" :style="{ width: user.accuracy_rate + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>📈 活跃度趋势</h3>
        <div class="trend-chart">
          <div v-for="day in dailyActiveUsers" :key="day.date" class="trend-item">
            <div class="trend-date">{{ formatDate(day.date) }}</div>
            <div class="trend-bar-container">
              <div class="trend-bar" :style="{ width: (day.active_users / maxDailyUsers * 100) + '%' }"></div>
            </div>
            <div class="trend-value">{{ day.active_users }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>📊 学习时段分布</h3>
      <div class="hourly-distribution">
        <div v-for="hour in hourlyDistribution" :key="hour.hour" class="hour-item">
          <div class="hour-label">{{ String(hour.hour).padStart(2, '0') }}:00</div>
          <div class="hour-bar-container">
            <div class="hour-bar" :style="{ width: (hour.practice_count / maxHourlyCount * 100) + '%' }"></div>
          </div>
          <div class="hour-value">{{ hour.practice_count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LearningMonitoring',
  inject: ['authStore'],

  data() {
    return {
      overview: {},
      topUsers: [],
      dailyActiveUsers: [],
      hourlyDistribution: [],
      loading: false,
      error: ''
    };
  },

  computed: {
    maxDailyUsers() {
      return Math.max(...this.dailyActiveUsers.map(d => d.active_users), 1);
    },
    maxHourlyCount() {
      return Math.max(...this.hourlyDistribution.map(h => h.practice_count), 1);
    }
  },

  mounted() {
    this.loadData();
  },

  methods: {
    async loadData() {
      this.loading = true;
      this.error = '';

      try {
        const [overviewRes, topUsersRes, behaviorRes] = await Promise.all([
          fetch('/api/v2/admin/analytics/overview', {
            headers: { 'Authorization': `Bearer ${this.authStore.token}` }
          }),
          fetch('/api/v2/admin/analytics/top-users?limit=10', {
            headers: { 'Authorization': `Bearer ${this.authStore.token}` }
          }),
          fetch('/api/v2/admin/analytics/user-behavior', {
            headers: { 'Authorization': `Bearer ${this.authStore.token}` }
          })
        ]);

        const overview = await overviewRes.json();
        const topUsers = await topUsersRes.json();
        const behavior = await behaviorRes.json();

        if (!overviewRes.ok || !topUsersRes.ok || !behaviorRes.ok) {
          throw new Error('加载数据失败');
        }

        this.overview = overview.users || {};
        this.topUsers = topUsers.top_users || [];
        this.dailyActiveUsers = (behavior.daily_active_users || []).slice(-7);
        this.hourlyDistribution = behavior.hourly_distribution || [];

      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    formatDate(dateStr) {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  }
};
</script>

<style scoped>
.learning-monitoring { padding: 1rem; }

.stats-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.stat-card { display: flex; align-items: center; gap: 1rem; padding: 1.5rem; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.stat-icon { font-size: 2.5rem; }
.stat-value { font-size: 2rem; font-weight: bold; color: #667eea; }
.stat-label { color: #6b7280; font-size: 0.9rem; }

.content-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.section { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.section h3 { margin-bottom: 1.5rem; color: #1f2937; }

.top-users-list { display: flex; flex-direction: column; gap: 1rem; }
.top-user-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f9fafb; border-radius: 8px; }
.rank { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #667eea; color: white; border-radius: 50%; font-weight: bold; }
.user-info { flex: 1; }
.username { font-weight: 500; color: #1f2937; }
.stats { font-size: 0.85rem; color: #6b7280; }
.accuracy-bar { flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; transition: width 0.5s; }

.trend-chart { display: flex; flex-direction: column; gap: 0.75rem; }
.trend-item { display: flex; align-items: center; gap: 1rem; }
.trend-date { width: 60px; font-size: 0.85rem; color: #6b7280; }
.trend-bar-container { flex: 1; height: 24px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
.trend-bar { height: 100%; background: #667eea; border-radius: 4px; transition: width 0.5s; }
.trend-value { width: 40px; text-align: right; font-weight: 500; color: #667eea; }

.hourly-distribution { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 0.5rem; }
.hour-item { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.hour-label { font-size: 0.75rem; color: #6b7280; }
.hour-bar-container { width: 100%; height: 100px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
.hour-bar { width: 100%; background: linear-gradient(180deg, #667eea, #764ba2); border-radius: 4px; transition: height 0.3s; }
.hour-value { font-size: 0.85rem; font-weight: 500; color: #667eea; }

.loading, .error { text-align: center; padding: 3rem; }
.error { color: #dc2626; }
</style>
