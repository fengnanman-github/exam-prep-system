<template>
  <div class="learning-curve-chart">
    <canvas ref="chartCanvas"></canvas>
    <div v-if="!chartData || chartData.length === 0" class="empty-state">
      <p>📊 暂无学习数据</p>
      <small>开始练习后将显示学习曲线</small>
    </div>
  </div>
</template>

<script>
import { Chart } from 'chart.js/auto'

export default {
  name: 'LearningCurveChart',
  props: {
    chartData: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  data() {
    return {
      chart: null
    }
  },
  mounted() {
    console.log('[LearningCurveChart] 组件已挂载')
    // 组件挂载后立即初始化
    this.$nextTick(() => {
      console.log('[LearningCurveChart] nextTick 后尝试初始化')
      this.initChart()
    })
  },
  watch: {
    chartData: {
      handler(newData, oldData) {
        console.log('[LearningCurveChart] chartData 变化:', {
          oldLength: oldData?.length || 0,
          newLength: newData?.length || 0,
          newData: newData
        })

        // 如果从无数据变为有数据，初始化图表
        if ((!oldData || oldData.length === 0) && newData && newData.length > 0) {
          console.log('[LearningCurveChart] 数据从无到有，初始化图表')
          this.initChart()
        } else if (newData && newData.length > 0) {
          console.log('[LearningCurveChart] 数据已更新，更新图表')
          this.updateChart()
        }
      },
      deep: true,
      immediate: false
    }
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
  },
  methods: {
    getCanvasElement() {
      // 优先使用 Vue ref，如果不可用则直接查找 DOM
      if (this.chartCanvas) {
        return this.chartCanvas
      }

      // 后备方案：直接查找 DOM 元素
      const canvas = this.$el?.querySelector('canvas')
      if (canvas) {
        console.log('[LearningCurveChart] 通过 DOM 查找找到 canvas 元素')
        return canvas
      }

      console.error('[LearningCurveChart] 无法找到 canvas 元素')
      return null
    },

    formatDate(dateStr) {
      const date = new Date(dateStr)
      return `${date.getMonth() + 1}/${date.getDate()}`
    },

    calculateTrend(correctData) {
      // 简单的线性回归计算趋势线
      const n = correctData.length
      if (n < 2) return correctData

      const xValues = correctData.map((_, i) => i)
      const yValues = correctData

      const sumX = xValues.reduce((a, b) => a + b, 0)
      const sumY = yValues.reduce((a, b) => a + b, 0)
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n

      return xValues.map(x => slope * x + intercept)
    },

    initChart() {
      console.log('[LearningCurveChart] initChart 被调用', {
        hasCanvasRef: !!this.chartCanvas,
        dataLength: this.chartData?.length || 0
      })

      // 检查数据是否存在
      if (!this.chartData || this.chartData.length === 0) {
        console.log('[LearningCurveChart] 数据为空，等待数据加载')
        return
      }

      // 获取 canvas 元素（使用多种方法）
      const canvas = this.getCanvasElement()
      if (!canvas) {
        console.error('[LearningCurveChart] canvas 元素不存在，延迟重试')
        // 延迟重试一次
        setTimeout(() => {
          console.log('[LearningCurveChart] 延迟重试初始化')
          this.initChart()
        }, 100)
        return
      }

      console.log('[LearningCurveChart] 开始初始化图表')

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('[LearningCurveChart] 无法获取 canvas context')
        return
      }

      // 准备数据 - 确保转换为数字类型
      const labels = this.chartData.map(item => this.formatDate(item.date))
      const correctData = this.chartData.map(item => parseInt(item.correct_count) || 0)
      const totalCounts = this.chartData.map(item => parseInt(item.total_count) || 0)
      const wrongData = totalCounts.map((total, i) => total - correctData[i])

      // 计算平均线和目标线
      const avgCorrect = correctData.reduce((a, b) => a + b, 0) / correctData.length
      const targetCorrect = Math.max(...totalCounts) * 0.8 // 目标：80%正确率

      // 计算趋势线
      const trendLine = this.calculateTrend(correctData)

      // 创建渐变
      const correctGradient = ctx.createLinearGradient(0, 0, 0, 400)
      correctGradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)')
      correctGradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)')

      const wrongGradient = ctx.createLinearGradient(0, 0, 0, 400)
      wrongGradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)')
      wrongGradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)')

      const config = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: '正确',
              data: correctData,
              borderColor: '#10b981',
              backgroundColor: correctGradient,
              borderWidth: 3,
              fill: true,
              tension: 0.4, // 平滑曲线
              pointRadius: 6,
              pointHoverRadius: 8,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: '#10b981',
              pointHoverBorderWidth: 3
            },
            {
              label: '错误',
              data: wrongData,
              borderColor: '#ef4444',
              backgroundColor: wrongGradient,
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 6,
              pointHoverRadius: 8,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: '#ef4444',
              pointHoverBorderWidth: 3
            },
            {
              label: '趋势',
              data: trendLine,
              borderColor: '#8b5cf6',
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 0
            },
            {
              label: '平均',
              data: Array(correctData.length).fill(avgCorrect),
              borderColor: '#f59e0b',
              borderWidth: 2,
              borderDash: [10, 5],
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 0
            },
            {
              label: '目标',
              data: Array(correctData.length).fill(targetCorrect),
              borderColor: '#6366f1',
              borderWidth: 2,
              borderDash: [2, 2],
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 13
              },
              padding: 12,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                title: function(context) {
                  return '📅 ' + context[0].label
                },
                label: function(context) {
                  let label = context.dataset.label || ''
                  if (label) {
                    label += ': '
                  }
                  label += context.parsed.y + ' 题'
                  return label
                },
                afterBody: function(context) {
                  const index = context[0].dataIndex
                  const total = totalCounts[index]
                  const correct = correctData[index]
                  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0
                  return [
                    '',
                    `📊 总题数: ${total}`,
                    `🎯 正确率: ${accuracy}%`
                  ]
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                font: {
                  size: 11
                },
                callback: function(value) {
                  return value + ' 题'
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                }
              }
            }
          },
          animation: {
            duration: 1000,
            easing: 'easeInOutQuart'
          }
        }
      }

      this.chart = new Chart(ctx, config)
    },

    updateChart() {
      console.log('[LearningCurveChart] updateChart 被调用', {
        hasChart: !!this.chart,
        dataLength: this.chartData?.length || 0
      })

      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }

      // 使用相同的方法获取 canvas 元素
      const canvas = this.getCanvasElement()
      if (!canvas) {
        console.error('[LearningCurveChart] updateChart: canvas 元素不存在')
        return
      }

      this.initChart()
    }
  }
}
</script>

<style scoped>
.learning-curve-chart {
  width: 100%;
  padding: 1rem 0;
  min-height: 400px;
  position: relative;
}

.empty-state {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  text-align: center;
}

.empty-state p {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.empty-state small {
  font-size: 0.9rem;
  color: #6b7280;
}

canvas {
  width: 100% !important;
  height: 400px !important;
  display: block;
}
</style>
