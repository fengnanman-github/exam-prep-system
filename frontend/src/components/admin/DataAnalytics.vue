<template>
  <div class="data-analytics">
    <div class="overview-cards">
      <div class="overview-card">
        <div class="card-icon">👥</div>
        <div class="card-content">
          <div class="card-value">{{ stats.users?.total_users || 0 }}</div>
          <div class="card-label">总用户数</div>
          <div class="card-sub">活跃：{{ stats.users?.active_users || 0 }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">📝</div>
        <div class="card-content">
          <div class="card-value">{{ stats.practices?.total_practices || 0 }}</div>
          <div class="card-label">总练习次数</div>
          <div class="card-sub">活跃学员：{{ stats.practices?.active_learners || 0 }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">📚</div>
        <div class="card-content">
          <div class="card-value">{{ stats.questions?.total_questions || 0 }}</div>
          <div class="card-label">题目总数</div>
          <div class="card-sub">单选{{ stats.questions?.single_choice || 0 }} · 多选{{ stats.questions?.multiple_choice || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-section">
        <h3>📊 考试分类正确率</h3>
        <div class="category-chart">
          <div v-for="cat in categoryDifficulty" :key="cat.exam_category" class="category-item">
            <div class="category-header">
              <span class="category-name">{{ cat.exam_category }}</span>
              <span class="category-accuracy">{{ cat.accuracy_rate }}%</span>
            </div>
            <div class="category-bar-container">
              <div class="category-bar" :class="getAccuracyClass(cat.accuracy_rate)" :style="{ width: cat.accuracy_rate + '%' }"></div>
            </div>
            <div class="category-stats">练习{{ cat.total_attempts }}次 · {{ cat.unique_users }}人</div>
          </div>
        </div>
      </div>

      <div class="chart-section">
        <h3>📈 每日活跃用户</h3>
        <div class="daily-chart">
          <div class="chart-container">
            <div v-for="day in dailyActiveUsers" :key="day.date" class="chart-bar-container">
              <div class="chart-bar" :style="{ height: (day.active_users / maxDailyUsers * 100) + '%' }"></div>
              <div class="chart-label">{{ formatDate(day.date) }}</div>
              <div class="chart-value">{{ day.active_users }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-section">
      <h3>⏰ 学习时段分布</h3>
      <div class="heatmap">
        <div v-for="hour in hourlyData" :key="hour.hour" class="heatmap-item" :style="{ background: getHeatmapColor(hour.practice_count) }">
          <div class="heatmap-hour">{{ String(hour.hour).padStart(2, '0') }}:00</div>
          <div class="heatmap-count">{{ hour.practice_count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DataAnalytics',
  inject: ['authStore'],

  data() {
    return {
      stats: {},
      categoryDifficulty: [],
      dailyActiveUsers: [],
      hourlyData: [],
      loading: false
    };
  },

  computed: {
    maxDailyUsers() {
      return Math.max(...this.dailyActiveUsers.map(d => d.active_users), 1);
    },
    maxHourlyCount() {
      return Math.max(...this.hourlyData.map(h => h.practice_count), 1);
    }
  },

  mounted() {
    this.loadData();
  },

  methods: {
    async loadData() {
      this.loading = true;

      try {
        const [overviewRes, difficultyRes, behaviorRes] = await Promise.all([
          fetch('/api/v2/admin/analytics/overview', {
            headers: { 'Authorization': `Bearer ${this.authStore.token}` }
          }),
          fetch('/api/v2/admin/analytics/question-difficulty', {
            headers: { 'Authorization': `Bearer ${this.authStore.token}` }
          }),
          fetch('/api/v2/admin/analytics/user-behavior', {
            headers: { 'Authorization': `Bearer ${this.authStore.token}` }
          })
        ]);

        const overview = await overviewRes.json();
        const difficulty = await difficultyRes.json();
        const behavior = await behaviorRes.json();

        this.stats = overview || {};
        this.categoryDifficulty = difficulty.category_difficulty || [];
        this.dailyActiveUsers = (behavior.daily_active_users || []).slice(-14);
        this.hourlyData = behavior.hourly_distribution || [];

      } catch (error) {
        console.error('加载分析数据失败:', error);
      } finally {
        this.loading = false;
      }
    },

    getAccuracyClass(rate) {
      if (rate >= 80) return 'excellent';
      if (rate >= 60) return 'good';
      if (rate >= 40) return 'fair';
      return 'poor';
    },

    getHeatmapColor(count) {
      const max = this.maxHourlyCount;
      const ratio = count / max;
      const colors = ['#f3f4f6', '#dbeafe', '#93c5fd', '#3b82f6', '#1e40af'];
      const index = Math.min(Math.floor(ratio * colors.length), colors.length - 1);
      return colors[index];
    },

    formatDate(dateStr) {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  }
};
</script>

<style scoped>
.data-analytics { padding: 1rem; }

.overview-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.overview-card { display: flex; align-items: center; gap: 1.5rem; padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.card-icon { font-size: 3rem; }
.card-value { font-size: 2.5rem; font-weight: bold; line-height: 1; }
.card-label { font-size: 1rem; opacity: 0.9; }
.card-sub { font-size: 0.85rem; opacity: 0.75; margin-top: 0.25rem; }

.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.chart-section { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.chart-section h3 { margin-bottom: 1.5rem; color: #1f2937; }

.category-chart { display: flex; flex-direction: column; gap: 1.5rem; }
.category-item { padding: 1rem; background: #f9fafb; border-radius: 8px; }
.category-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
.category-name { font-weight: 500; color: #1f2937; }
.category-accuracy { font-weight: bold; color: #667eea; }
.category-bar-container { height: 12px; background: #e5e7eb; border-radius: 6px; overflow: hidden; }
.category-bar { height: 100%; border-radius: 6px; transition: width 0.5s; }
.category-bar.excellent { background: linear-gradient(90deg, #22c55e, #16a34a); }
.category-bar.good { background: linear-gradient(90deg, #84cc16, #65a30d); }
.category-bar.fair { background: linear-gradient(90deg, #eab308, #ca8a04); }
.category-bar.poor { background: linear-gradient(90deg, #ef4444, #dc2626); }
.category-stats { font-size: 0.85rem; color: #6b7280; margin-top: 0.5rem; }

.daily-chart { height: 200px; }
.chart-container { display: flex; align-items: flex-end; justify-content: space-between; height: 160px; gap: 4px; }
.chart-bar-container { flex: 1; display: flex; flex-direction: column; align-items: center; }
.chart-bar { width: 100%; background: linear-gradient(180deg, #667eea, #764ba2); border-radius: 4px 4px 0 0; transition: height 0.3s; min-height: 4px; }
.chart-label { font-size: 0.7rem; color: #6b7280; margin-top: 0.5rem; transform: rotate(-45deg); }
.chart-value { font-size: 0.75rem; font-weight: 500; color: #667eea; margin-top: 0.25rem; }

.heatmap { display: grid; grid-template-columns: repeat(12, 1fr); gap: 0.5rem; }
.heatmap-item { position: relative; padding: 1rem 0.5rem; text-align: center; border-radius: 6px; color: white; }
.heatmap-hour { font-size: 0.75rem; opacity: 0.9; }
.heatmap-count { font-size: 1.25rem; font-weight: bold; }

.loading { text-align: center; padding: 3rem; color: #6b7280; }
</style>
