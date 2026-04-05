<template>
  <div class="wrong-view">
    <h2>📚 我的错题本</h2>
    <div class="wrong-stats">
      <p>错题总数: <strong>{{ wrongStats.total_wrong || 0 }}</strong></p>
      <p>总错误次数: <strong>{{ wrongStats.total_errors || 0 }}</strong></p>
      <p>待复习题目: <strong>{{ wrongStats.need_review || 0 }}</strong></p>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="wrongAnswers.length > 0" class="bulk-actions">
      <div class="bulk-select">
        <input
          type="checkbox"
          :id="'select-all'"
          v-model="isAllSelected"
          @change="toggleSelectAll"
        >
        <label :for="'select-all'" class="select-all-label">
          全选 (已选 {{ selectedCount }}/{{ wrongAnswers.length }})
        </label>
      </div>
      <div class="bulk-buttons">
        <button
          @click="bulkPractice"
          :disabled="selectedCount === 0"
          class="btn bulk-practice-btn"
        >
          🚀 批量练习 ({{ selectedCount }})
        </button>
        <button
          @click="bulkRemove"
          :disabled="selectedCount === 0"
          class="btn bulk-remove-btn"
        >
          🗑️ 批量删除 ({{ selectedCount }})
        </button>
      </div>
    </div>

    <div v-if="wrongAnswers.length > 0" class="wrong-list">
      <div
        v-for="item in wrongAnswers"
        :key="item.id"
        class="wrong-item"
        :class="{ 'selected': selectedItems.has(item.question_id) }"
      >
        <div class="checkbox-column">
          <input
            type="checkbox"
            :id="'wrong-' + item.question_id"
            :value="item.question_id"
            v-model="selectedItemsSet"
            @change="updateSelectedCount"
          >
        </div>
        <div class="wrong-question" @click="practiceQuestion(item.question_id)">
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
      wrongStats: {},
      selectedItems: new Set(),
      isAllSelected: false,
      selectedCount: 0
    }
  },
  computed: {
    selectedItemsSet: {
      get() {
        return Array.from(this.selectedItems)
      },
      set(value) {
        this.selectedItems = new Set(value)
        this.updateSelectedCount()
      }
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

    toggleSelectAll() {
      if (this.isAllSelected) {
        // 全选
        this.wrongAnswers.forEach(item => {
          this.selectedItems.add(item.question_id)
        })
      } else {
        // 取消全选
        this.selectedItems.clear()
      }
      this.updateSelectedCount()
    },

    updateSelectedCount() {
      this.selectedCount = this.selectedItems.size
      this.isAllSelected = this.selectedCount > 0 && this.selectedCount === this.wrongAnswers.length
    },

    async bulkPractice() {
      if (this.selectedCount === 0) {
        alert('请先选择要练习的错题')
        return
      }

      // 获取选中题目的question_no
      const questionNos = this.wrongAnswers
        .filter(item => this.selectedItems.has(item.question_id))
        .map(item => item.question_no)

      // 触发批量练习
      this.$emit('start-practice', questionNos.join(','))
    },

    async bulkRemove() {
      if (this.selectedCount === 0) {
        alert('请先选择要删除的错题')
        return
      }

      if (!confirm(`确定要删除选中的 ${this.selectedCount} 道错题吗？`)) {
        return
      }

      try {
        // 批量删除
        const deletePromises = Array.from(this.selectedItems).map(questionId =>
          axios.delete(`${API_BASE}/wrong-answers/${this.userId}/${questionId}`)
        )

        await Promise.all(deletePromises)

        // 清空选择
        this.selectedItems.clear()
        this.updateSelectedCount()

        // 重新加载列表
        await this.loadWrongAnswers()
        this.$emit('wrong-answer-removed')
      } catch (error) {
        console.error('批量删除错题失败:', error)
        alert('删除失败，请重试')
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

.bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #e3f2fd;
  border-radius: 6px;
  margin-bottom: 1rem;
  border: 1px solid #bbdefb;
}

.bulk-select {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bulk-select input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.select-all-label {
  font-size: 0.95rem;
  color: #1976d2;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}

.bulk-buttons {
  display: flex;
  gap: 0.75rem;
}

.bulk-practice-btn,
.bulk-remove-btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.bulk-practice-btn {
  background: #1976d2;
  color: white;
}

.bulk-practice-btn:hover:not(:disabled) {
  background: #1565c0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}

.bulk-practice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bulk-remove-btn {
  background: #f44336;
  color: white;
}

.bulk-remove-btn:hover:not(:disabled) {
  background: #d32f2f;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.bulk-remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.3s;
}

.wrong-item.selected {
  border-color: #1976d2;
  background: #e3f2fd;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

.wrong-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.checkbox-column {
  display: flex;
  align-items: center;
  padding-right: 1rem;
}

.checkbox-column input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.wrong-question {
  flex: 1;
  cursor: pointer;
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

  .bulk-actions {
    flex-direction: column;
    gap: 1rem;
  }

  .bulk-buttons {
    width: 100%;
    justify-content: stretch;
  }

  .bulk-practice-btn,
  .bulk-remove-btn {
    flex: 1;
  }

  .wrong-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .checkbox-column {
    padding-right: 0;
    padding-bottom: 0.5rem;
  }
}
</style>
