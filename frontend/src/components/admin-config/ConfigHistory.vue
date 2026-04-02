<template>
  <div class="config-history">
    <h3>配置变更历史</h3>
    <p class="description">查看所有配置的变更记录</p>

    <div class="history-list" v-if="historyList.length > 0">
      <div
        v-for="item in historyList"
        :key="item.id"
        class="history-item"
      >
        <div class="history-header">
          <span class="config-key">{{ item.display_name || item.config_key }}</span>
          <span class="change-time">{{ formatTime(item.changed_at) }}</span>
        </div>
        <div class="history-content">
          <div class="change-info">
            <span class="change-by">操作者: {{ item.changed_by || 'system' }}</span>
            <span v-if="item.change_reason" class="change-reason">
              原因: {{ item.change_reason }}
            </span>
          </div>
          <div class="value-change">
            <div class="value-section">
              <span class="value-label">变更前:</span>
              <code class="value-code">{{ formatValue(item.old_value) }}</code>
            </div>
            <div class="value-arrow">→</div>
            <div class="value-section">
              <span class="value-label">变更后:</span>
              <code class="value-code">{{ formatValue(item.new_value) }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>暂无配置变更记录</p>
    </div>

    <button @click="loadHistory" class="btn btn-secondary">
      🔄 刷新历史
    </button>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'ConfigHistory',
  props: {
    history: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const historyList = ref([]);

    const loadHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/v2/admin/system-config/history?limit=50', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
          historyList.value = data.history || [];
        }
      } catch (error) {
        console.error('加载配置历史失败:', error);
      }
    };

    const formatTime = (timeStr) => {
      const date = new Date(timeStr);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) {
        return '刚刚';
      } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前';
      } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前';
      } else {
        return date.toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    };

    const formatValue = (value) => {
      if (!value) return '-';
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    };

    onMounted(() => {
      if (props.history.length > 0) {
        historyList.value = props.history;
      } else {
        loadHistory();
      }
    });

    return {
      historyList,
      loadHistory,
      formatTime,
      formatValue
    };
  }
};
</script>

<style scoped>
.config-history h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #333;
}

.description {
  color: #666;
  margin-bottom: 20px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.history-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  background: #fff;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.config-key {
  font-weight: 500;
  color: #333;
}

.change-time {
  color: #999;
  font-size: 14px;
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.change-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
}

.change-by {
  color: #666;
}

.change-reason {
  color: #666;
}

.value-change {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.value-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.value-label {
  font-size: 12px;
  color: #666;
}

.value-code {
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value-arrow {
  color: #999;
  font-weight: bold;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}
</style>
