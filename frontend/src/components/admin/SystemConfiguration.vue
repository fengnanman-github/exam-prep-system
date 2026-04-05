<template>
  <div class="system-configuration">
    <div class="config-section">
      <h3>📝 注册配置</h3>
      <div class="config-item">
        <label>开放注册</label>
        <div class="toggle-switch">
          <input type="checkbox" v-model="config.registration.enabled" @change="saveConfig('registration.enabled')" />
          <span class="slider"></span>
        </div>
      </div>
      <div class="config-item">
        <label>需要邮箱验证</label>
        <div class="toggle-switch">
          <input type="checkbox" v-model="config.registration.requireEmailVerification" @change="saveConfig('registration.require_email_verification')" />
          <span class="slider"></span>
        </div>
      </div>
      <div class="config-item">
        <label>需要管理员审批</label>
        <div class="toggle-switch">
          <input type="checkbox" v-model="config.registration.requireAdminApproval" @change="saveConfig('registration.require_admin_approval')" />
          <span class="slider"></span>
        </div>
      </div>
    </div>

    <div class="config-section">
      <h3>📧 邮件服务配置</h3>
      <div class="config-item">
        <label>邮件服务提供商</label>
        <select v-model="config.email.provider" @change="saveConfig('email.service_provider')" class="config-select">
          <option value="smtp">SMTP</option>
          <option value="sendgrid">SendGrid</option>
          <option value="alicloud">阿里云</option>
          <option value="mock">Mock（测试模式）</option>
        </select>
      </div>
      <div class="config-item">
        <label>发件人邮箱</label>
        <input v-model="config.email.fromAddress" type="email" @blur="saveConfig('email.from_address')" class="config-input" placeholder="noreply@example.com" />
      </div>
      <div class="config-item">
        <label>发件人名称</label>
        <input v-model="config.email.fromName" @blur="saveConfig('email.from_name')" class="config-input" placeholder="密评备考系统" />
      </div>
    </div>

    <div class="config-section">
      <h3>📚 学习配置</h3>
      <div class="config-item">
        <label>默认每日目标（题数）</label>
        <input v-model.number="config.learning.dailyTarget" type="number" @blur="saveConfig('learning.default_daily_target')" class="config-input" min="1" max="100" />
      </div>
      <div class="config-item">
        <label>显示提示</label>
        <div class="toggle-switch">
          <input type="checkbox" v-model="config.learning.showHints" @change="saveConfig('learning.show_hints')" />
          <span class="slider"></span>
        </div>
      </div>
      <div class="config-item">
        <label>允许跳题</label>
        <div class="toggle-switch">
          <input type="checkbox" v-model="config.learning.allowSkip" @change="saveConfig('learning.allow_skip')" />
          <span class="slider"></span>
        </div>
      </div>
    </div>

    <div class="config-section">
      <h3>🔒 审批配置</h3>
      <div class="config-item">
        <label>邮箱验证后自动批准</label>
        <div class="toggle-switch">
          <input type="checkbox" v-model="config.approval.autoApprove" @change="saveConfig('approval.auto_approve_verified')" />
          <span class="slider"></span>
        </div>
      </div>
      <div class="config-item">
        <label>待审批用户上限</label>
        <input v-model.number="config.approval.pendingLimit" type="number" @blur="saveConfig('approval.pending_user_limit')" class="config-input" min="1" max="1000" />
      </div>
    </div>

    <div v-if="message" class="message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'SystemConfiguration',
  inject: ['authStore'],

  data() {
    return {
      config: {
        registration: {
          enabled: true,
          requireEmailVerification: true,
          requireAdminApproval: true
        },
        email: {
          provider: 'mock',
          fromAddress: 'noreply@example.com',
          fromName: '密评备考系统'
        },
        learning: {
          dailyTarget: 50,
          showHints: true,
          allowSkip: true
        },
        approval: {
          autoApprove: false,
          pendingLimit: 100
        }
      },
      loading: false,
      message: null
    };
  },

  mounted() {
    this.loadConfig();
  },

  methods: {
    async loadConfig() {
      this.loading = true;

      try {
        // 模拟配置加载（实际需要从API获取）
        const response = await fetch('/api/v2/admin/config', {
          headers: { 'Authorization': `Bearer ${this.authStore.token}` }
        });

        if (response.ok) {
          const data = await response.json();
          this.config = { ...this.config, ...data };
        }

      } catch (error) {
        console.error('加载配置失败:', error);
      } finally {
        this.loading = false;
      }
    },

    async saveConfig(key) {
      const value = this.getConfigValue(key);

      try {
        const response = await fetch(`/api/v2/admin/config/${key}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authStore.token}`
          },
          body: JSON.stringify({ value })
        });

        if (response.ok) {
          this.showMessage('配置已保存', 'success');
        } else {
          throw new Error('保存失败');
        }

      } catch (error) {
        this.showMessage('保存失败: ' + error.message, 'error');
      }
    },

    getConfigValue(key) {
      const keyMap = {
        'registration.enabled': this.config.registration.enabled,
        'registration.require_email_verification': this.config.registration.requireEmailVerification,
        'registration.require_admin_approval': this.config.registration.requireAdminApproval,
        'email.service_provider': this.config.email.provider,
        'email.from_address': this.config.email.fromAddress,
        'email.from_name': this.config.email.fromName,
        'learning.default_daily_target': this.config.learning.dailyTarget,
        'learning.show_hints': this.config.learning.showHints,
        'learning.allow_skip': this.config.learning.allowSkip,
        'approval.auto_approve_verified': this.config.approval.autoApprove,
        'approval.pending_user_limit': this.config.approval.pendingLimit
      };
      return keyMap[key];
    },

    showMessage(text, type) {
      this.message = { text, type };
      setTimeout(() => this.message = null, 3000);
    }
  }
};
</script>

<style scoped>
.system-configuration { padding: 1rem; }

.config-section { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
.config-section h3 { margin-bottom: 1.5rem; color: #1f2937; }

.config-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid #f3f4f6; }
.config-item:last-child { border-bottom: none; }
.config-item label { font-weight: 500; color: #374151; }

.config-input { padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 1rem; width: 300px; }
.config-input:focus { outline: none; border-color: #667eea; }
.config-select { padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 1rem; cursor: pointer; }

.toggle-switch { position: relative; width: 50px; height: 26px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: 0.4s; border-radius: 26px; }
.slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: 0.4s; border-radius: 50%; }
input:checked + .slider { background-color: #667eea; }
input:checked + .slider:before { transform: translateX(24px); }

.message { position: fixed; top: 20px; right: 20px; padding: 1rem 2rem; border-radius: 8px; font-weight: 500; z-index: 1000; }
.message.success { background: #d1fae5; color: #065f46; }
.message.error { background: #fecaca; color: #991b1b; }
</style>
