<template>
  <div class="progress-stats">
    <div class="header">
      <h2>📊 学习进度</h2>
      <button @click="goBack" class="btn-back">← 返回</button>
    </div>

    <!-- 新增：科学化指标体系 -->
    <div v-if="enhancedSummary" class="section enhanced-metrics">
      <h3>📊 学习概览</h3>

      <!-- 顶部关键指标卡片 -->
      <div class="metrics-grid">
        <!-- 连续学习 -->
        <div class="metric-card streak-metric">
          <div class="metric-icon">🔥</div>
          <div class="metric-content">
            <div class="metric-value">{{ enhancedSummary.current_streak || 0 }}</div>
            <div class="metric-label">连续学习天数</div>
          </div>
          <div v-if="enhancedSummary.current_streak >= 7" class="metric-badge">坚持中</div>
        </div>

        <!-- 今日目标 -->
        <div class="metric-card today-metric">
          <div class="metric-icon">📅</div>
          <div class="metric-content">
            <div class="metric-value">{{ enhancedSummary.today_questions || 0 }}</div>
            <div class="metric-label">今日练习</div>
          </div>
          <div class="metric-progress">
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" :style="{ width: Math.min((enhancedSummary.today_questions / 50) * 100, 100) + '%' }"></div>
            </div>
            <span class="progress-text">{{ Math.min(Math.round((enhancedSummary.today_questions / 50) * 100), 100) }}%</span>
          </div>
        </div>

        <!-- XP经验值 -->
        <div class="metric-card xp-metric">
          <div class="metric-icon">⭐</div>
          <div class="metric-content">
            <div class="metric-value">Lv.{{ enhancedSummary.current_level || 1 }}</div>
            <div class="metric-label">{{ enhancedSummary.total_xp || 0 }} XP</div>
          </div>
          <div class="metric-progress">
            <div class="mini-progress-bar">
              <div class="mini-progress-fill xp-fill" :style="{ width: getXPProgress() + '%' }"></div>
            </div>
            <span class="progress-text">{{ enhancedSummary.xp_in_current_level || 0 }}/1000</span>
          </div>
        </div>

        <!-- 正确率 -->
        <div class="metric-card accuracy-metric">
          <div class="metric-icon">🎯</div>
          <div class="metric-content">
            <div class="metric-value">{{ (enhancedSummary.accuracy_rate * 100).toFixed(1) }}%</div>
            <div class="metric-label">正确率</div>
          </div>
        </div>
      </div>

      <!-- 成就徽章展示 -->
      <div v-if="achievements.badges.length > 0" class="achievements-showcase">
        <h4>🏆 最近成就</h4>
        <div class="badges-row">
          <div
            v-for="badge in achievements.badges.slice(0, 5)"
            :key="badge.id"
            class="badge-showcase"
            :title="badge.name"
          >
            <div class="badge-icon">{{ badge.icon }}</div>
          </div>
        </div>
      </div>

      <!-- 智能推荐 -->
      <div v-if="recommendations.length > 0" class="recommendations-showcase">
        <h4>💡 智能推荐</h4>
        <div class="recommendations-row">
          <div
            v-for="rec in recommendations.slice(0, 3)"
            :key="rec.type"
            class="recommendation-card"
            @click="handleRecommendation(rec)"
          >
            <div class="rec-icon">{{ getRecIcon(rec.type) }}</div>
            <div class="rec-content">
              <div class="rec-title">{{ rec.title }}</div>
              <div class="rec-desc">{{ rec.description }}</div>
            </div>
            <button class="rec-action">{{ rec.action }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 总体进度 -->
    <div class="section">
      <h3>总体进度</h3>
      <div v-if="progress" class="progress-overview">
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-value">{{ progress.total_practiced || 0 }}</div>
            <div class="stat-label">练习次数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ progress.unique_practiced || 0 }}</div>
            <div class="stat-label">已练习题目</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ progress.total_correct || 0 }}</div>
            <div class="stat-label">答对次数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ progress.practice_days || 0 }}</div>
            <div class="stat-label">练习天数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ progress.current_streak || 0 }}</div>
            <div class="stat-label">连续答对</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ progress.best_streak || 0 }}</div>
            <div class="stat-label">最佳记录</div>
          </div>
        </div>

        <!-- 正确率进度条 -->
        <div class="accuracy-bar">
          <div class="bar-label">
            <span>正确率</span>
            <span>{{ accuracyRate }}%</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill" :style="{ width: accuracyRate + '%' }"></div>
          </div>
        </div>

        <!-- 题库完成度 -->
        <div class="progress-bar">
          <div class="bar-label">
            <span>题库完成度</span>
            <span>{{ completionRate }}%</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill completed" :style="{ width: completionRate + '%' }"></div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>暂无练习记录，开始练习吧！</p>
      </div>
    </div>

    <!-- 法律法规大类进度 -->
    <div class="section">
      <h3>📚 法律法规大类进度</h3>
      <div v-if="lawProgress.length > 0" class="category-progress">
        <div
          v-for="cat in lawProgress"
          :key="cat.law_category"
          class="category-item"
        >
          <div class="category-header">
            <span class="category-icon">{{ getLawIcon(cat.law_category) }}</span>
            <span class="category-name">{{ cat.law_category }}</span>
            <span class="category-stats">
              {{ cat.practiced_count }}/{{ cat.total_count }} 题
            </span>
          </div>
          <div class="category-metrics">
            <div class="metric">
              <span class="metric-label">正确率</span>
              <span :class="['metric-value', getAccuracyClass(cat.accuracy_rate)]">
                {{ cat.accuracy_rate || 0 }}%
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">完成度</span>
              <span class="metric-value">{{ getProgressPercent(cat) }}%</span>
            </div>
          </div>
          <div class="category-bar">
            <div
              class="category-bar-fill"
              :style="{ width: getProgressPercent(cat) + '%' }"
            ></div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>暂无分类进度数据</p>
      </div>
    </div>

    <!-- 技术专业类别进度 -->
    <div class="section">
      <h3>🔧 技术专业类别进度</h3>
      <div v-if="techProgress.length > 0" class="category-progress">
        <div
          v-for="cat in techProgress"
          :key="cat.tech_category"
          class="category-item tech-item"
        >
          <div class="category-header">
            <span class="category-icon">{{ getTechIcon(cat.tech_category) }}</span>
            <span class="category-name">{{ cat.tech_category }}</span>
            <span class="category-stats">
              {{ cat.practiced_count }}/{{ cat.total_count }} 题
            </span>
          </div>
          <div class="category-metrics">
            <div class="metric">
              <span class="metric-label">正确率</span>
              <span :class="['metric-value', getAccuracyClass(cat.accuracy_rate)]">
                {{ cat.accuracy_rate || 0 }}%
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">完成度</span>
              <span class="metric-value">{{ getProgressPercent(cat) }}%</span>
            </div>
          </div>
          <div class="category-bar">
            <div
              class="category-bar-fill tech-bar"
              :style="{ width: getProgressPercent(cat) + '%' }"
            ></div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>暂无分类进度数据</p>
      </div>
    </div>

    <!-- 两级分类详细进度（可展开） -->
    <div class="section">
      <h3>📊 两级分类详细进度</h3>
      <div v-if="twoLevelProgress.length > 0" class="two-level-progress">
        <div
          v-for="lawCat in twoLevelProgress"
          :key="lawCat.law_category"
          class="law-category-group"
        >
          <div class="law-category-header" @click="toggleExpand(lawCat.law_category)">
            <span class="law-icon">{{ getLawIcon(lawCat.law_category) }}</span>
            <span class="law-name">{{ lawCat.law_category }}</span>
            <div class="law-stats">
              <span class="law-stat">{{ lawCat.practiced_count }}/{{ lawCat.total_count }}</span>
              <span class="law-accuracy" :class="getAccuracyClass(lawCat.accuracy_rate)">
                {{ lawCat.accuracy_rate }}%
              </span>
            </div>
            <span class="expand-icon">{{ expanded[lawCat.law_category] ? '▼' : '▶' }}</span>
          </div>
          <div v-show="expanded[lawCat.law_category]" class="tech-categories-list">
            <div
              v-for="techCat in lawCat.tech_categories"
              :key="techCat.tech_category"
              class="tech-category-item"
            >
              <span class="tech-icon">{{ getTechIcon(techCat.tech_category) }}</span>
              <span class="tech-name">{{ techCat.tech_category }}</span>
              <div class="tech-stats">
                <span>{{ techCat.practiced_count }}/{{ techCat.total_count }}</span>
                <span :class="getAccuracyClass(techCat.accuracy_rate)">
                  {{ techCat.accuracy_rate }}%
                </span>
              </div>
              <div class="tech-progress-bar">
                <div class="tech-bar-fill" :style="{ width: getProgressPercent(techCat) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>暂无详细进度数据</p>
      </div>
    </div>

    <!-- 学习曲线 - 优化版 -->
    <div class="section">
      <h3>📈 最近7天学习曲线</h3>
      <div class="chart-wrapper">
        <LearningCurveChart :chart-data="chartData" />
        <div v-if="chartData.length === 0" class="empty-state-overlay">
          <p>暂无学习曲线数据</p>
        </div>
      </div>
    </div>

    <!-- 导出报告 -->
    <div class="section">
      <button @click="exportReport" class="btn export-btn">
        📥 导出学习报告
      </button>
    </div>
  </div>
</template>

<script>
import api from '../utils/api'
import { authStore } from '../store/auth'
import LearningCurveChart from './LearningCurveChart.vue'

const API_BASE = '/api/v2'

export default {
	inject: ['authStore'],
  name: 'ProgressStats',
  components: {
    LearningCurveChart
  },
  data() {
    return {
      progress: null,
      lawProgress: [],
      techProgress: [],
      twoLevelProgress: [],
      chartData: [],
      expanded: {},
      // 新增：科学化指标体系
      enhancedSummary: null,
      achievements: { badges: [] },
      recommendations: [],
      calendarData: [],
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth() + 1,
      loading: false
    }
  },
  computed: {
    userId() {
      return this.authStore.getCurrentUserId()
    },
    accuracyRate() {
      if (!this.progress || !this.progress.total_practiced) return 0
      return Math.round((this.progress.total_correct / this.progress.total_practiced) * 100)
    },
    completionRate() {
      if (!this.progress || !this.progress.total_questions) return 0
      return Math.round((this.progress.unique_practiced / parseInt(this.progress.total_questions)) * 100)
    }
  },
  async mounted() {
    await this.loadProgress()
    await this.loadEnhancedData()
  },
  async activated() {
    console.log('ProgressStats: 组件被激活，刷新数据')
    await this.loadProgress()
    await this.loadEnhancedData()
  },
  methods: {
    goBack() {
      this.$router.back()
    },
    async loadProgress() {
      try {
        console.log('[ProgressStats] 开始加载数据, userId:', this.userId)

        // 使用统一统计API加载所有数据
        const [statsRes, chartRes] = await Promise.all([
          api.get(`/api/v2/stats/user/${this.userId}`),
          api.get(`${API_BASE}/progress/${this.userId}/chart?days=7`)
        ])

        console.log('[ProgressStats] 统计数据:', statsRes.data)
        console.log('[ProgressStats] 图表响应:', chartRes.data)

        const stats = statsRes.data

        // 构建progress数据（保持兼容性）
        this.progress = {
          total_practiced: stats.overall.practiced_questions,
          unique_practiced: stats.overall.practiced_questions,
          total_correct: stats.overall.correct_answers,
          total_questions: stats.overall.total_questions,
          practice_days: 0, // 需要单独计算
          current_streak: 0, // 需要单独计算
          best_streak: 0 // 需要单独计算
        }

        // 使用统一API的分类数据
        this.lawProgress = stats.by_law_category.map(cat => ({
          law_category: cat.category,
          total_count: cat.total,
          practiced_count: cat.practiced,
          accuracy_rate: Math.round(cat.accuracy * 100)
        }))

        this.techProgress = stats.by_tech_category.map(cat => ({
          tech_category: cat.category,
          total_count: cat.total,
          practiced_count: cat.practiced,
          accuracy_rate: Math.round(cat.accuracy * 100)
        }))

        // 构建两级分类数据（法律-技术组合）
        const twoLevelMap = new Map()
        stats.by_law_category.forEach(lawCat => {
          twoLevelMap.set(lawCat.category, {
            law_category: lawCat.category,
            total_count: lawCat.total,
            practiced_count: lawCat.practiced,
            accuracy_rate: Math.round(lawCat.accuracy * 100),
            tech_categories: []
          })
        })

        // 暂时使用文档数据作为技术子分类
        stats.by_document.forEach(doc => {
          const lawCat = twoLevelMap.get(doc.category)
          if (lawCat) {
            // 从文档名称中提取技术分类（简化处理）
            lawCat.tech_categories.push({
              tech_category: doc.document_name,
              total_count: doc.total,
              practiced_count: doc.practiced,
              accuracy_rate: Math.round(doc.accuracy * 100)
            })
          }
        })

        this.twoLevelProgress = Array.from(twoLevelMap.values())

        this.chartData = chartRes.data
        console.log('[ProgressStats] 图表数据已加载:', this.chartData)
        console.log('[ProgressStats] 图表数据长度:', this.chartData.length)

        // 默认展开前两个法律大类
        if (this.twoLevelProgress.length > 0) {
          this.expanded[this.twoLevelProgress[0].law_category] = true
          if (this.twoLevelProgress.length > 1) {
            this.expanded[this.twoLevelProgress[1].law_category] = true
          }
        }
      } catch (error) {
        console.error('[ProgressStats] 加载进度失败:', error)
      }
    },

    toggleExpand(lawCategory) {
      this.expanded[lawCategory] = !this.expanded[lawCategory]
    },

    getAccuracyClass(rate) {
      if (rate >= 80) return 'high'
      if (rate >= 60) return 'medium'
      return 'low'
    },

    getProgressPercent(cat) {
      return Math.round((cat.practiced_count / cat.total_count) * 100)
    },

    getBarHeight(total, value) {
      if (!total) return 0
      const maxHeight = 100
      const maxVal = Math.max(...this.chartData.map(d => d.total_count))
      return maxVal ? (value / maxVal) * maxHeight : 0
    },

    formatDate(dateStr) {
      const date = new Date(dateStr)
      return `${date.getMonth() + 1}/${date.getDate()}`
    },

    getLawIcon(category) {
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

    getTechIcon(category) {
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

    async exportReport() {
      try {
        const response = await api.get(`${API_BASE}/export/${this.userId}`, {
          responseType: 'blob'
        })

        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `学习报告_${this.userId}_${Date.now()}.json`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('导出报告失败:', error)
        alert('导出失败，请重试')
      }
    },

    // ========== 新增：科学化指标体系 ==========

    async loadEnhancedData() {
      this.loading = true
      try {
        // 加载学习总览
        const summaryRes = await api.get(`/api/v2/progress/summary/${this.userId}`)
        if (summaryRes.data.success) {
          this.enhancedSummary = summaryRes.data.data
        }

        // 加载成就
        const achievementsRes = await api.get(`/api/v2/progress/achievements/${this.userId}`)
        if (achievementsRes.data.success) {
          this.achievements = achievementsRes.data.data
        }

        // 加载推荐
        const recommendationsRes = await api.get(`/api/v2/progress/recommendations/${this.userId}`)
        if (recommendationsRes.data.success) {
          this.recommendations = recommendationsRes.data.data
        }

        // 加载日历数据
        await this.loadCalendarData()
      } catch (error) {
        console.error('加载增强数据失败:', error)
      } finally {
        this.loading = false
      }
    },

    async loadCalendarData() {
      try {
        const res = await api.get(`/api/v2/progress/calendar/${this.userId}`, {
          params: {
            month: this.currentMonth,
            year: this.currentYear
          }
        })
        if (res.data.success) {
          this.calendarData = res.data.data
        }
      } catch (error) {
        console.error('加载日历数据失败:', error)
      }
    },

    getXPLevel() {
      if (!this.enhancedSummary) return 1
      return this.enhancedSummary.current_level || 1
    },

    getXPProgress() {
      if (!this.enhancedSummary) return 0
      const current = this.enhancedSummary.xp_in_current_level || 0
      return Math.round((current / 1000) * 100)
    },

    formatNumber(num) {
      if (!num) return 0
      return num.toLocaleString()
    },

    handleRecommendation(rec) {
      // 修复：使用路由跳转而不是修改父组件状态
      console.log('处理推荐:', rec)

      if (rec.action_type === 'practice' || rec.action_type === 'new_questions') {
        this.$router.push({ name: 'practice' })
      } else if (rec.action_type === 'smart_review') {
        this.$router.push({ name: 'intelligent-review' })
      } else if (rec.action_type === 'category_practice') {
        this.$router.push({ name: 'category-practice', query: { category: rec.category } })
      }
    },

    getRecIcon(type) {
      const icons = {
        'review': '🔄',
        'upcoming': '⏰',
        'weak': '🎯',
        'streak': '🔥',
        'explore': '🚀'
      }
      return icons[type] || '💡'
    }
  }
}
</script>

<style scoped>
.progress-stats {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.btn-back {
  background: #f0f0f0;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.section {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.section h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #2196F3;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.5rem;
}

.progress-bar, .accuracy-bar {
  margin: 1rem 0;
}

.bar-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.bar-container {
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196F3, #1976D2);
  transition: width 0.5s ease;
}

.bar-fill.completed {
  background: linear-gradient(90deg, #4CAF50, #45a049);
}

.category-progress {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-item {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #2196F3;
}

.tech-item {
  border-left-color: #9C27B0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.category-icon {
  font-size: 1.5rem;
}

.category-name {
  font-weight: bold;
  color: #333;
  flex: 1;
}

.category-stats {
  color: #666;
  font-size: 0.9rem;
}

.category-metrics {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
}

.metric {
  display: flex;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.metric-label {
  color: #666;
}

.metric-value {
  font-weight: bold;
  color: #333;
}

.metric-value.high {
  color: #4CAF50;
}

.metric-value.medium {
  color: #FF9800;
}

.metric-value.low {
  color: #f44336;
}

.category-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.category-bar-fill {
  height: 100%;
  background: #2196F3;
  transition: width 0.5s ease;
}

.tech-bar {
  background: #9C27B0;
}

.two-level-progress {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.law-category-group {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.law-category-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.law-category-header:hover {
  background: #e9ecef;
}

.law-icon {
  font-size: 1.3rem;
}

.law-name {
  flex: 1;
  font-weight: bold;
  color: #333;
}

.law-stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.law-stat {
  color: #666;
  font-size: 0.9rem;
}

.law-accuracy {
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.expand-icon {
  color: #666;
  font-size: 0.8rem;
}

.tech-categories-list {
  padding: 0 1rem 1rem 3.5rem;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

.tech-category-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.tech-category-item:last-child {
  border-bottom: none;
}

.tech-icon {
  font-size: 1.1rem;
}

.tech-name {
  flex: 1;
  font-size: 0.9rem;
  color: #555;
}

.tech-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #666;
}

.tech-progress-bar {
  width: 80px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.tech-bar-fill {
  height: 100%;
  background: #9C27B0;
  transition: width 0.3s ease;
}

.chart-container {
  padding: 1rem 0;
}

/* 新版学习曲线图表容器 */
.chart-wrapper {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  gap: 0.5rem;
}

.chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bar-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 180px;
  align-items: center;
  justify-content: flex-end;
}

.chart-bar .bar {
  width: 80%;
  transition: height 0.3s ease;
  border-radius: 4px 4px 0 0;
}

.chart-bar .bar.correct {
  background: #4CAF50;
}

.chart-bar .bar.wrong {
  background: #f44336;
}

.bar-label {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #666;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-color.correct {
  background: #4CAF50;
}

.legend-color.wrong {
  background: #f44336;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #999;
}

.export-btn {
  width: 100%;
  padding: 1rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.export-btn:hover {
  background: #1976D2;
}

@media (max-width: 768px) {
  .progress-stats {
    padding: 1rem;
  }

  .stat-cards {
    grid-template-columns: 1fr 1fr;
  }

  .chart-bars {
    height: 150px;
  }

  .bar-wrapper {
    height: 130px;
  }

  .category-metrics {
    flex-direction: column;
    gap: 0.5rem;
  }

  .tech-categories-list {
    padding-left: 1rem;
  }
}

/* ========== 科学化指标体系样式 ========== */
.enhanced-metrics {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.enhanced-metrics h3 {
  color: white;
  margin-bottom: 1.5rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.metric-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: bold;
  color: #333;
  line-height: 1.2;
}

.metric-label {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.25rem;
}

.metric-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 10px;
  font-weight: bold;
}

.metric-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.mini-progress-bar {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.5s ease;
}

.mini-progress-fill.xp-fill {
  background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
}

.progress-text {
  font-size: 0.75rem;
  color: #666;
  font-weight: bold;
  min-width: 60px;
  text-align: right;
}

/* 特殊卡片样式 */
.streak-metric {
  border-left: 4px solid #ff6b6b;
}

.today-metric {
  border-left: 4px solid #4ecdc4;
}

.xp-metric {
  border-left: 4px solid #f093fb;
}

.accuracy-metric {
  border-left: 4px solid #51cf66;
}

/* 成就徽章展示 */
.achievements-showcase {
  margin-bottom: 2rem;
}

.achievements-showcase h4 {
  color: white;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.badges-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.badge-showcase {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 0.75rem;
  text-align: center;
  min-width: 60px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  cursor: pointer;
}

.badge-showcase:hover {
  transform: scale(1.1);
}

.badge-icon {
  font-size: 2rem;
  line-height: 1;
}

/* 智能推荐 */
.recommendations-showcase {
  margin-bottom: 1rem;
}

.recommendations-showcase h4 {
  color: white;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.recommendations-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recommendation-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recommendation-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.rec-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.rec-content {
  flex: 1;
  min-width: 0;
}

.rec-title {
  font-weight: bold;
  color: #333;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.rec-desc {
  font-size: 0.85rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rec-action {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.rec-action:hover {
  opacity: 0.9;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .progress-stats {
    padding: 1rem 0.75rem;
  }

  .section {
    padding: 1.25rem;
    margin-bottom: 1rem;
  }

  .section h3 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  /* 科学化指标移动端优化 */
  .metrics-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.625rem;
    margin-bottom: 1.25rem;
  }

  .metric-card {
    padding: 0.875rem;
    min-height: 85px;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .metric-icon {
    font-size: 1.75rem;
    align-self: flex-start;
  }

  .metric-content {
    width: 100%;
  }

  .metric-value {
    font-size: 1.5rem;
  }

  .metric-label {
    font-size: 0.7rem;
  }

  .metric-badge {
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.625rem;
  }

  .metric-progress {
    width: 100%;
    margin-top: 0.375rem;
  }

  .mini-progress-bar {
    height: 4px;
  }

  .progress-text {
    font-size: 0.625rem;
    min-width: 50px;
  }

  /* 成就徽章移动端优化 */
  .achievements-showcase h4 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .badges-row {
    gap: 0.75rem;
    justify-content: flex-start;
  }

  .badge-showcase {
    min-width: 55px;
    padding: 0.625rem;
  }

  .badge-icon {
    font-size: 1.5rem;
  }

  /* 推荐卡片移动端优化 */
  .recommendations-showcase h4 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .recommendations-row {
    gap: 0.625rem;
  }

  .recommendation-card {
    padding: 0.875rem;
    gap: 0.75rem;
  }

  .rec-icon {
    font-size: 1.5rem;
  }

  .rec-title {
    font-size: 0.9rem;
  }

  .rec-desc {
    font-size: 0.8rem;
  }

  .rec-action {
    padding: 0.625rem 1rem;
    font-size: 0.8rem;
  }

  /* 优化总体进度卡片 */
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .stat-label {
    font-size: 0.8rem;
  }

  /* 优化分类进度 */
  .category-item {
    padding: 0.875rem;
  }

  .category-header {
    margin-bottom: 0.625rem;
  }

  .category-icon {
    font-size: 1.25rem;
  }

  .category-name {
    font-size: 0.95rem;
  }

  .category-metrics {
    flex-direction: column;
    gap: 0.375rem;
    margin-bottom: 0.375rem;
  }

  .metric {
    font-size: 0.8rem;
  }

  /* 优化两级分类 */
  .law-category-header {
    padding: 0.875rem;
  }

  .law-icon {
    font-size: 1.25rem;
  }

  .law-name {
    font-size: 0.95rem;
  }

  .law-stat {
    font-size: 0.8rem;
  }

  .law-accuracy {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
  }

  .tech-categories-list {
    padding: 0 0.875rem 0.875rem 2.5rem;
  }

  .tech-category-item {
    padding: 0.625rem;
  }

  .tech-icon {
    font-size: 1rem;
  }

  .tech-name {
    font-size: 0.85rem;
  }

  .tech-stats {
    font-size: 0.75rem;
    gap: 0.75rem;
  }

  /* 优化图表 */
  .chart-bars {
    height: 150px;
    gap: 0.25rem;
  }

  .bar-wrapper {
    height: 130px;
  }

  .chart-bar .bar {
    width: 90%;
  }

  .bar-label {
    font-size: 0.7rem;
  }

  .chart-legend {
    gap: 1rem;
    margin-top: 0.75rem;
  }

  .legend-item {
    font-size: 0.8rem;
  }

  /* 优化按钮 */
  .export-btn {
    padding: 0.875rem;
    font-size: 0.95rem;
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .progress-stats {
    padding: 0.75rem 0.5rem;
  }

  .section {
    padding: 1rem;
    border-radius: 8px;
  }

  .metrics-grid {
    gap: 0.5rem;
  }

  .metric-card {
    padding: 0.75rem;
    min-height: 75px;
  }

  .metric-icon {
    font-size: 1.5rem;
  }

  .metric-value {
    font-size: 1.25rem;
  }

  .metric-label {
    font-size: 0.65rem;
  }

  .badge-showcase {
    min-width: 48px;
    padding: 0.5rem;
  }

  .badge-icon {
    font-size: 1.25rem;
  }

  .recommendation-card {
    padding: 0.75rem;
  }

  .rec-icon {
    font-size: 1.25rem;
  }

  .stat-cards {
    gap: 0.625rem;
  }

  .stat-card {
    padding: 0.875rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .chart-bars {
    height: 120px;
  }

  .bar-wrapper {
    height: 100px;
  }
}

/* 安全区域适配 */
@supports (padding: env(safe-area-inset-bottom)) {
  .bottom-action-bar {
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
  }

  .mobile-sidebar .sidebar-content {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>
