<template>
  <div class="document-scope-config">
    <h3>文档范围配置</h3>
    <p class="description">配置各种模式可用的文档范围</p>

    <div class="scope-list">
      <div
        v-for="(config, type) in scopes"
        :key="type"
        class="scope-item"
      >
        <div class="scope-header">
          <h4>{{ getScopeDisplayName(type) }}</h4>
          <span class="scope-mode-badge" :class="'mode-' + config.mode">
            {{ getModeDisplayName(config.mode) }}
          </span>
        </div>

        <div class="scope-content">
          <!-- 模式选择 -->
          <div class="form-group">
            <label>范围模式:</label>
            <select v-model="editingScopes[type].mode" @change="onModeChange(type)">
              <option value="all">全部文档</option>
              <option value="category">按分类</option>
              <option value="custom">自定义文档</option>
            </select>
          </div>

          <!-- 分类选择 -->
          <div v-if="editingScopes[type].mode === 'category'" class="form-group">
            <label>选择文档分类:</label>
            <div class="checkbox-group">
              <label v-for="cat in categories" :key="cat" class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="editingScopes[type].filters.categories"
                  :value="cat"
                >
                {{ cat }}
              </label>
            </div>
          </div>

          <!-- 自定义文档ID -->
          <div v-if="editingScopes[type].mode === 'custom'" class="form-group">
            <label>文档ID列表 (用逗号分隔):</label>
            <textarea
              v-model="customIdsText[type]"
              @input="updateCustomIds(type)"
              placeholder="例如: 1, 2, 3, 5, 8"
              rows="3"
            ></textarea>
            <small>当前选中 {{ getCustomIdsCount(type) }} 个文档</small>
          </div>

          <!-- 排除ID -->
          <div class="form-group">
            <label>排除文档ID (用逗号分隔):</label>
            <textarea
              v-model="excludeIdsText[type]"
              @input="updateExcludeIds(type)"
              placeholder="例如: 1, 2, 3"
              rows="2"
            ></textarea>
            <small>当前排除 {{ getExcludeIdsCount(type) }} 个文档</small>
          </div>

          <!-- 操作按钮 -->
          <div class="scope-actions">
            <button
              @click="resetScope(type)"
              class="btn btn-secondary"
            >
              重置
            </button>
            <button
              @click="saveScope(type)"
              class="btn btn-primary"
              :disabled="saving"
            >
              {{ saving ? '保存中...' : '保存配置' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';

export default {
  name: 'DocumentScopeConfig',
  props: {
    scopes: {
      type: Object,
      required: true
    },
    categories: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update'],
  setup(props, { emit }) {
    const editingScopes = ref({});
    const customIdsText = ref({});
    const excludeIdsText = ref({});
    const saving = ref(false);

    // 初始化编辑状态
    const initializeEditingScopes = () => {
      Object.keys(props.scopes).forEach(type => {
        const config = props.scopes[type] || { mode: 'all', filters: {} };
        editingScopes.value[type] = {
          mode: config.mode || 'all',
          filters: {
            categories: config.filters?.categories || [],
            document_ids: config.filters?.document_ids || [],
            exclude_ids: config.filters?.exclude_ids || []
          }
        };

        // 初始化文本字段
        customIdsText.value[type] = (config.filters?.document_ids || []).join(', ');
        excludeIdsText.value[type] = (config.filters?.exclude_ids || []).join(', ');
      });
    };

    // 监听scopes变化
    watch(() => props.scopes, () => {
      initializeEditingScopes();
    }, { immediate: true, deep: true });

    const getScopeDisplayName = (type) => {
      const names = {
        practice: '练习文档范围',
        review: '复习文档范围'
      };
      return names[type] || type;
    };

    const getModeDisplayName = (mode) => {
      const names = {
        all: '全部文档',
        category: '按分类',
        custom: '自定义文档'
      };
      return names[mode] || mode;
    };

    const onModeChange = (type) => {
      // 模式切换时重置过滤器（保留exclude）
      const exclude = editingScopes.value[type].filters.exclude_ids || [];
      editingScopes.value[type].filters = {
        categories: [],
        document_ids: [],
        exclude_ids: exclude
      };
      customIdsText.value[type] = '';
    };

    const updateCustomIds = (type) => {
      const ids = customIdsText.value[type]
        .split(',')
        .map(id => id.trim())
        .filter(id => id)
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));
      editingScopes.value[type].filters.document_ids = ids;
    };

    const updateExcludeIds = (type) => {
      const ids = excludeIdsText.value[type]
        .split(',')
        .map(id => id.trim())
        .filter(id => id)
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));
      editingScopes.value[type].filters.exclude_ids = ids;
    };

    const getCustomIdsCount = (type) => {
      return editingScopes.value[type]?.filters?.document_ids?.length || 0;
    };

    const getExcludeIdsCount = (type) => {
      return editingScopes.value[type]?.filters?.exclude_ids?.length || 0;
    };

    const resetScope = (type) => {
      const original = props.scopes[type] || { mode: 'all', filters: {} };
      editingScopes.value[type] = {
        mode: original.mode || 'all',
        filters: {
          categories: original.filters?.categories || [],
          document_ids: original.filters?.document_ids || [],
          exclude_ids: original.filters?.exclude_ids || []
        }
      };
      customIdsText.value[type] = (original.filters?.document_ids || []).join(', ');
      excludeIdsText.value[type] = (original.filters?.exclude_ids || []).join(', ');
    };

    const saveScope = async (type) => {
      saving.value = true;
      try {
        emit('update', type, editingScopes.value[type]);
      } finally {
        saving.value = false;
      }
    };

    return {
      editingScopes,
      customIdsText,
      excludeIdsText,
      saving,
      getScopeDisplayName,
      getModeDisplayName,
      onModeChange,
      updateCustomIds,
      updateExcludeIds,
      getCustomIdsCount,
      getExcludeIdsCount,
      resetScope,
      saveScope
    };
  }
};
</script>

<style scoped>
.document-scope-config h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #333;
}

.description {
  color: #666;
  margin-bottom: 20px;
}

.scope-list {
  display: grid;
  gap: 20px;
}

.scope-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background: #fafafa;
}

.scope-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.scope-header h4 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.scope-mode-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.mode-all { background: #e3f2fd; color: #1976d2; }
.mode-category { background: #f3e5f5; color: #7b1fa2; }
.mode-custom { background: #e8f5e9; color: #388e3c; }

.scope-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #555;
}

.form-group select,
.form-group textarea {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  font-family: monospace;
  resize: vertical;
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  padding: 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.scope-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #1976d2;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #1565c0;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}
</style>
