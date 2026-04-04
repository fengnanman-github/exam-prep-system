<template>
  <div class="admin-config">
    <!-- 页面头部 -->
    <div class="config-header">
      <h2>⚙️ 系统配置管理</h2>
      <div class="config-tabs">
        <button
          @click="currentTab = 'question-scopes'"
          :class="{ active: currentTab === 'question-scopes' }"
          class="tab-button"
        >
          📝 题目范围配置
        </button>
        <button
          @click="currentTab = 'document-scopes'"
          :class="{ active: currentTab === 'document-scopes' }"
          class="tab-button"
        >
          📚 文档范围配置
        </button>
        <button
          @click="currentTab = 'auto-rules'"
          :class="{ active: currentTab === 'auto-rules' }"
          class="tab-button"
        >
          🤖 自动规则
        </button>
        <button
          @click="currentTab = 'history'"
          :class="{ active: currentTab === 'history' }"
          class="tab-button"
        >
          📜 配置历史
        </button>
      </div>
    </div>

    <!-- 题目范围配置 -->
    <div v-if="currentTab === 'question-scopes'" class="config-section">
      <QuestionScopeConfig
        :scopes="questionScopes"
        :categories="categories"
        :exam-categories="examCategories"
        @update="updateQuestionScope"
      />
    </div>

    <!-- 文档范围配置 -->
    <div v-if="currentTab === 'document-scopes'" class="config-section">
      <DocumentScopeConfig
        :scopes="documentScopes"
        :categories="documentCategories"
        @update="updateDocumentScope"
      />
    </div>

    <!-- 自动规则配置 -->
    <div v-if="currentTab === 'auto-rules'" class="config-section">
      <AutoRulesConfig
        :rules="autoRules"
        @update="updateAutoRule"
      />
    </div>

    <!-- 配置历史 -->
    <div v-if="currentTab === 'history'" class="config-section">
      <ConfigHistory :history="configHistory" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import QuestionScopeConfig from './admin-config/QuestionScopeConfig.vue';
import DocumentScopeConfig from './admin-config/DocumentScopeConfig.vue';
import AutoRulesConfig from './admin-config/AutoRulesConfig.vue';
import ConfigHistory from './admin-config/ConfigHistory.vue';

export default {
  name: 'AdminConfig',
  components: {
    QuestionScopeConfig,
    DocumentScopeConfig,
    AutoRulesConfig,
    ConfigHistory
  },
  setup() {
    const currentTab = ref('question-scopes');
    const questionScopes = ref({});
    const documentScopes = ref({});
    const autoRules = ref({});
    const configHistory = ref([]);
    const categories = ref([]);
    const examCategories = ref([]);
    const documentCategories = ref([]);

    // 加载配置数据
    const loadConfigs = async () => {
      try {
        const token = localStorage.getItem('exam_auth_token');
        console.log('Token exists:', !!token);
        console.log('Token length:', token?.length);

        if (!token) {
          console.error('未找到认证token');
          alert('请先登录');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 加载题目范围配置
        console.log('正在加载题目范围配置...');
        const scopesRes = await fetch('/api/v2/admin/question-scopes', { headers });
        console.log('题目范围API响应状态:', scopesRes.status);

        if (scopesRes.ok) {
          const data = await scopesRes.json();
          console.log('题目范围数据:', data);
          questionScopes.value = data.scopes || {};
        } else {
          const errorData = await scopesRes.json();
          console.error('题目范围API错误:', errorData);
          alert('加载题目范围配置失败: ' + (errorData.error || '未知错误'));
        }

        // 加载文档范围配置
        const docRes = await fetch('/api/v2/admin/document-scopes', { headers });
        if (docRes.ok) {
          const data = await docRes.json();
          documentScopes.value = data.scopes || {};
        }

        // 加载自动规则
        const rulesRes = await fetch('/api/v2/admin/system-config', { headers });
        if (rulesRes.ok) {
          const data = await rulesRes.json();
          autoRules.value = data.configs || {};
        }

        // 加载分类数据
        loadMetadata();
      } catch (error) {
        console.error('加载配置失败:', error);
        alert('加载配置失败: ' + error.message);
      }
    };

    // 加载元数据
    const loadMetadata = async () => {
      try {
        const token = localStorage.getItem('exam_auth_token');
        const headers = { Authorization: `Bearer ${token}` };

        // 加载知识点分类
        const catRes = await fetch('/api/v2/admin/categories', { headers });
        if (catRes.ok) {
          categories.value = await catRes.json();
        }

        // 加载考试类别
        const examRes = await fetch('/api/v2/questions/exam-categories', { headers });
        if (examRes.ok) {
          const data = await examRes.json();
          examCategories.value = data.categories || [];
        }

        // 加载文档分类
        const docCatRes = await fetch('/api/v2/documents/categories', { headers });
        if (docCatRes.ok) {
          documentCategories.value = await docCatRes.json();
        }
      } catch (error) {
        console.error('加载元数据失败:', error);
      }
    };

    // 更新题目范围配置
    const updateQuestionScope = async (type, config) => {
      try {
        const token = localStorage.getItem('exam_auth_token');
        const response = await fetch(`/api/v2/admin/question-scope/${type}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(config)
        });

        const data = await response.json();
        if (data.success) {
          questionScopes.value[type] = data.config;
          alert('配置已更新');
        } else {
          alert('更新失败: ' + (data.error || '未知错误'));
        }
      } catch (error) {
        console.error('更新配置失败:', error);
        alert('更新失败: ' + error.message);
      }
    };

    // 更新文档范围配置
    const updateDocumentScope = async (type, config) => {
      try {
        const token = localStorage.getItem('exam_auth_token');
        const response = await fetch(`/api/v2/admin/document-scope/${type}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(config)
        });

        const data = await response.json();
        if (data.success) {
          documentScopes.value[type] = data.config;
          alert('配置已更新');
        } else {
          alert('更新失败: ' + (data.error || '未知错误'));
        }
      } catch (error) {
        console.error('更新配置失败:', error);
        alert('更新失败: ' + error.message);
      }
    };

    // 更新自动规则
    const updateAutoRule = async (rule, enabled) => {
      try {
        const token = localStorage.getItem('exam_auth_token');
        const response = await fetch(`/api/v2/admin/system-config/${rule}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ value: enabled, reason: '手动更新' })
        });

        const data = await response.json();
        if (data.success) {
          autoRules.value[rule] = data.value;
          alert('规则已更新');
        } else {
          alert('更新失败: ' + (data.error || '未知错误'));
        }
      } catch (error) {
        console.error('更新规则失败:', error);
        alert('更新失败: ' + error.message);
      }
    };

    onMounted(() => {
      loadConfigs();
    });

    return {
      currentTab,
      questionScopes,
      documentScopes,
      autoRules,
      configHistory,
      categories,
      examCategories,
      documentCategories,
      updateQuestionScope,
      updateDocumentScope,
      updateAutoRule
    };
  }
};
</script>

<style scoped>
.admin-config {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.config-header {
  margin-bottom: 20px;
}

.config-header h2 {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #333;
}

.config-tabs {
  display: flex;
  gap: 10px;
  border-bottom: 2px solid #e0e0e0;
}

.tab-button {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 15px;
  color: #666;
  margin-bottom: -2px;
  transition: all 0.3s;
}

.tab-button:hover {
  color: #1976d2;
}

.tab-button.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
  font-weight: 500;
}

.config-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>
