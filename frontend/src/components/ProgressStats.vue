<template>
  <div class="progress-stats">
    <div class="header">
      <h2>📊 学习进度</h2>
      <button @click="$emit('back')" class="btn-back">← 返回</button>
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

    <!-- 学习曲线 -->
    <div class="section">
      <h3>最近7天学习曲线</h3>
      <div v-if="chartData.length > 0" class="chart-container">
        <div class="chart-bars">
          <div
            v-for="item in chartData"
            :key="item.date"
            class="chart-bar"
          >
            <div class="bar-wrapper">
              <div
                class="bar correct"
                :style="{ height: getBarHeight(item.total_count, item.correct_count) + '%' }"
                :title="`正确: ${item.correct_count}`"
              ></div>
              <div
                class="bar wrong"
                :style="{ height: getBarHeight(item.total_count, item.total_count - item.correct_count) + '%' }"
                :title="`错误: ${item.total_count - item.correct_count}`"
              ></div>
            </div>
            <div class="bar-label">{{ formatDate(item.date) }}</div>
          </div>
        </div>
        <div class="chart-legend">
          <span class="legend-item">
            <span class="legend-color correct"></span> 正确
          </span>
          <span class="legend-item">
            <span class="legend-color wrong"></span> 错误
          </span>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>暂无学习曲线数据</p>
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
import axios from 'axios'

const API_BASE = '/api/v2'

export default {
  name: 'ProgressStats',
  emits: ['back'],
  data() {
    return {
      progress: null,
      lawProgress: [],
      techProgress: [],
      twoLevelProgress: [],
      chartData: [],
      expanded: {}
    }
  },
  computed: {
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
  },
  methods: {
    async loadProgress() {
      try {
        // 并行加载所有数据
        const [progressRes, lawRes, techRes, twoLevelRes, chartRes] = await Promise.all([
          axios.get(`${API_BASE}/progress/${this.userId}`),
          axios.get(`${API_BASE}/progress/${this.userId}/law`),
          axios.get(`${API_BASE}/progress/${this.userId}/tech`),
          axios.get(`${API_BASE}/progress/${this.userId}/two-level`),
          axios.get(`${API_BASE}/progress/${this.userId}/chart?days=7`)
        ])

        this.progress = progressRes.data
        this.lawProgress = lawRes.data
        this.techProgress = techRes.data
        this.twoLevelProgress = twoLevelRes.data
        this.chartData = chartRes.data

        // 默认展开前两个法律大类
        if (this.twoLevelProgress.length > 0) {
          this.expanded[this.twoLevelProgress[0].law_category] = true
          if (this.twoLevelProgress.length > 1) {
            this.expanded[this.twoLevelProgress[1].law_category] = true
          }
        }
      } catch (error) {
        console.error('加载进度失败:', error)
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
        const response = await axios.get(`${API_BASE}/export/${this.userId}`, {
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
    }
  },
  props: {
    userId: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>
.progress-stats {
  max-width: 1000px;
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
</style>
