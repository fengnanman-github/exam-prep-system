<template>
  <div class="review-view">
    <h2>⏰ 复习提醒</h2>
    <div v-if="reviewQuestions.length > 0" class="review-list">
      <p>以下 {{ reviewQuestions.length }} 道题目需要复习：</p>
      <div v-for="item in reviewQuestions" :key="item.id" class="review-item">
        <div class="review-question">
          <h4>题目 {{ item.question_no }} ({{ item.question_type }})</h4>
          <p>{{ item.question_text }}</p>
          <div class="review-meta">
            <span>错误次数: {{ item.wrong_count }}</span>
            <span>应复习时间: {{ formatDate(item.next_review_time) }}</span>
          </div>
        </div>
        <button @click="$emit('start-practice', item)" class="btn primary small">开始复习</button>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>暂无需要复习的题目，继续保持！</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const API_BASE = '/api'

export default {
  name: 'ReviewReminder',
  data() {
    return {
      reviewQuestions: []
    }
  },
  methods: {
    async loadReviewQuestions() {
      try {
        const response = await axios.get(`${API_BASE}/wrong-answers/${this.userId}/review`)
        this.reviewQuestions = response.data
      } catch (error) {
        console.error('加载复习题目失败:', error)
      }
    },

    formatDate(dateString) {
      if (!dateString) return '未知'
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  props: {
    userId: {
      type: String,
      required: true
    }
  },
  mounted() {
    this.loadReviewQuestions()
  }
}
</script>

<style scoped>
.review-view {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
}

.review-question {
  flex: 1;
}

.review-question h4 {
  color: #333;
  margin-bottom: 0.5rem;
}

.review-meta {
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

.btn.primary {
  background: #4CAF50;
  color: white;
}

.btn.small {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .review-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>
