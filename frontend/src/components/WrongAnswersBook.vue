<template>
  <div class="wrong-view">
    <h2>📚 我的错题本</h2>
    <div class="wrong-stats">
      <p>错题总数: <strong>{{ wrongStats.total_wrong || 0 }}</strong></p>
      <p>总错误次数: <strong>{{ wrongStats.total_errors || 0 }}</strong></p>
      <p>待复习题目: <strong>{{ wrongStats.need_review || 0 }}</strong></p>
    </div>

    <div v-if="wrongAnswers.length > 0" class="wrong-list">
      <div v-for="item in wrongAnswers" :key="item.id" class="wrong-item">
        <div class="wrong-question" @click="practiceQuestion(item.question_id)" style="cursor: pointer;">
          <h4>题目 {{ item.question_no }} ({{ item.question_type }}) <span class="click-hint">🖱️ 点击练习</span></h4>
          <p>{{ item.question_text }}</p>
          <div class="wrong-meta">
            <span>错误次数: {{ item.wrong_count }}</span>
            <span>下次复习: {{ formatDate(item.next_review_time) }}</span>
          </div>
        </div>
        <div class="wrong-actions">
          <button @click.stop="practiceQuestion(item.question_id)" class="btn small primary-btn">▶️ 练习</button>
          <button @click.stop="removeWrongAnswer(item.question_id)" class="btn small success-btn">✅ 已掌握</button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>暂无错题记录，继续练习吧！</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const API_BASE = '/api'

export default {
  name: 'WrongAnswersBook',
  emits: ['wrong-answer-removed', 'start-practice'],
  data() {
    return {
      wrongAnswers: [],
      wrongStats: {}
    }
  },
  methods: {
    async loadWrongAnswers() {
      try {
        const response = await axios.get(`${API_BASE}/wrong-answers/${this.userId}`)
        this.wrongAnswers = response.data
        await this.loadWrongStats()
      } catch (error) {
        console.error('加载错题列表失败:', error)
      }
    },

    async loadWrongStats() {
      try {
        const response = await axios.get(`${API_BASE}/wrong-answers/${this.userId}/stats`)
        this.wrongStats = response.data
      } catch (error) {
        console.error('加载错题统计失败:', error)
      }
    },

    practiceQuestion(questionId) {
      // 修复：传递question_no而不是question_id，因为CustomPractice需要题目编号
      // question_id是数据库内部ID，question_no是用户看到的题目编号
      const question = this.wrongAnswers.find(q => q.question_id === questionId)
      if (question) {
        this.$emit('start-practice', question.question_no)
      } else {
        // 如果找不到question对象，回退到使用questionId（可能已经是question_no）
        this.$emit('start-practice', questionId)
      }
    },

    async removeWrongAnswer(questionId) {
      try {
        await axios.delete(`${API_BASE}/wrong-answers/${this.userId}/${questionId}`)
        await this.loadWrongAnswers()
        this.$emit('wrong-answer-removed')
      } catch (error) {
        console.error('删除错题失败:', error)
      }
    },

    formatDate(dateString) {
      if (!dateString) return '未知'
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    // 暴露给外部的刷新方法
    refresh() {
      this.loadWrongAnswers()
    }
  },
  props: {
    userId: {
      type: String,
      required: true
    }
  },
  mounted() {
    this.loadWrongAnswers()
  }
}
</script>

<style scoped>
.wrong-view {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.wrong-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 6px;
}

.wrong-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.wrong-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.3s;
}

.wrong-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.wrong-question {
  flex: 1;
}

.wrong-question h4 {
  color: #333;
  margin-bottom: 0.5rem;
}

.click-hint {
  font-size: 0.8rem;
  color: #1976d2;
  font-weight: normal;
  margin-left: 0.5rem;
}

.wrong-actions {
  display: flex;
  gap: 0.5rem;
}

.wrong-meta {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
  color: #333;
}

.btn.small {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn.primary-btn {
  background: #1976d2;
  color: white;
}

.btn.success-btn {
  background: #4caf50;
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .wrong-stats {
    flex-direction: column;
    gap: 0.5rem;
  }

  .wrong-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>
