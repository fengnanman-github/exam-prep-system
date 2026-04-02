<template>
  <div class="auto-rules-config">
    <h3>自动更新规则配置</h3>
    <p class="description">控制系统是否自动应用各种算法和同步功能</p>

    <div class="rules-list">
      <div
        v-for="(enabled, rule) in rules"
        :key="rule"
        class="rule-item"
      >
        <div class="rule-header">
          <div class="rule-info">
            <h4>{{ getRuleDisplayName(rule) }}</h4>
            <p class="rule-description">{{ getRuleDescription(rule) }}</p>
          </div>
          <div class="rule-toggle">
            <label class="switch">
              <input
                type="checkbox"
                v-model="editingRules[rule]"
                @change="toggleRule(rule)"
              >
              <span class="slider round"></span>
            </label>
            <span class="status-badge" :class="{ enabled: editingRules[rule] }">
              {{ editingRules[rule] ? '已启用' : '已禁用' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="info-box">
      <h4>ℹ️ 规则说明</h4>
      <ul>
        <li><strong>自动应用SuperMemo算法</strong>: 练习后自动计算下次复习时间</li>
        <li><strong>自动同步题目状态</strong>: 跨模式同步不确定标记和收藏状态</li>
        <li><strong>自动更新掌握度</strong>: 根据练习结果自动更新题目掌握等级</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';

export default {
  name: 'AutoRulesConfig',
  props: {
    rules: {
      type: Object,
      required: true
    }
  },
  emits: ['update'],
  setup(props, { emit }) {
    const editingRules = ref({});

    // 初始化编辑状态
    const initializeEditingRules = () => {
      Object.keys(props.rules).forEach(rule => {
        editingRules.value[rule] = props.rules[rule];
      });
    };

    // 监听rules变化
    watch(() => props.rules, () => {
      initializeEditingRules();
    }, { immediate: true, deep: true });

    const getRuleDisplayName = (rule) => {
      const names = {
        auto_apply_supermemo: '自动应用SuperMemo算法',
        auto_sync_question_state: '自动同步题目状态',
        auto_update_mastery: '自动更新掌握度'
      };
      return names[rule] || rule;
    };

    const getRuleDescription = (rule) => {
      const descriptions = {
        auto_apply_supermemo: '练习提交后自动应用SuperMemo间隔重复算法计算复习时间',
        auto_sync_question_state: '跨模式自动同步题目状态（不确定标记、收藏等）',
        auto_update_mastery: '根据练习结果自动更新题目的掌握等级'
      };
      return descriptions[rule] || '';
    };

    const toggleRule = (rule) => {
      emit('update', rule, editingRules.value[rule]);
    };

    return {
      editingRules,
      getRuleDisplayName,
      getRuleDescription,
      toggleRule
    };
  }
};
</script>

<style scoped>
.auto-rules-config h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #333;
}

.description {
  color: #666;
  margin-bottom: 20px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.rule-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background: #fff;
  transition: all 0.3s;
}

.rule-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.rule-info h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
  color: #333;
}

.rule-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.rule-toggle {
  display: flex;
  align-items: center;
  gap: 15px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #f5f5f5;
  color: #666;
}

.status-badge.enabled {
  background: #e8f5e9;
  color: #2e7d32;
}

.info-box {
  background: #e3f2fd;
  border-left: 4px solid #2196F3;
  padding: 15px 20px;
  border-radius: 4px;
}

.info-box h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #1976d2;
}

.info-box ul {
  margin: 0;
  padding-left: 20px;
}

.info-box li {
  margin-bottom: 8px;
  color: #555;
}

.info-box strong {
  color: #333;
}
</style>
