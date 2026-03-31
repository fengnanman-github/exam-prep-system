<template>
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <button @click="closeModal" class="btn-close">✕</button>

      <!-- 欢迎标题 -->
      <div class="welcome-header">
        <h1>🔐 密评备考系统</h1>
        <p class="subtitle">商用密码应用安全性评估从业人员考核备考平台</p>
      </div>

      <div class="tabs">
        <button
          @click="currentTab = 'login'"
          :class="{ active: currentTab === 'login' }"
          class="tab-btn"
        >
          🚀 登录
        </button>
        <button
          @click="currentTab = 'register'"
          :class="{ active: currentTab === 'register' }"
          class="tab-btn"
        >
          ✨ 注册
        </button>
      </div>

      <!-- 登录表单 -->
      <div v-if="currentTab === 'login'" class="form-container">
        <h2>👋 欢迎回来</h2>
        <p class="form-description">输入您的账号信息，继续学习之旅</p>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>👤 用户名</label>
            <input
              v-model="loginForm.username"
              type="text"
              placeholder="例如: testuser"
              required
              autocomplete="username"
            />
            <small class="input-hint">输入您注册时使用的用户名</small>
          </div>
          <div class="form-group">
            <label>🔑 密码</label>
            <input
              v-model="loginForm.password"
              type="password"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
            <small class="input-hint">输入您的登录密码</small>
          </div>
          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
      </div>

      <!-- 登录提示信息 -->
      <div v-if="currentTab === 'login'" class="info-box">
        <p>💡 <strong>测试提示：</strong>如果您还没有账号，请点击上方"注册"标签创建新账号</p>
        <p class="hint-text">已有账号？直接输入用户名和密码登录即可</p>
      </div>

      <!-- 注册表单 -->
      <div v-if="currentTab === 'register'" class="form-container">
        <h2>✨ 创建新账户</h2>
        <p class="form-description">加入我们，开启高效备考之旅</p>
        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label>👤 用户名 <span class="required">*</span></label>
            <input
              v-model="registerForm.username"
              type="text"
              placeholder="例如: myuser001"
              required
              minlength="3"
              maxlength="20"
              autocomplete="username"
            />
            <small class="input-hint">3-20个字符，建议使用字母+数字组合</small>
          </div>
          <div class="form-group">
            <label>🔑 密码 <span class="required">*</span></label>
            <input
              v-model="registerForm.password"
              type="password"
              placeholder="例如: MyPass123"
              required
              minlength="8"
              autocomplete="new-password"
            />
            <!-- 密码规则提示 -->
            <div class="password-rules">
              <div class="rule-item" :class="{ valid: registerForm.password.length >= 8 }">
                <span class="rule-icon">{{ registerForm.password.length >= 8 ? '✓' : '○' }}</span>
                至少8个字符
              </div>
              <div class="rule-item" :class="{ valid: /[a-z]/.test(registerForm.password) }">
                <span class="rule-icon">{{ /[a-z]/.test(registerForm.password) ? '✓' : '○' }}</span>
                包含小写字母
              </div>
              <div class="rule-item" :class="{ valid: /[A-Z]/.test(registerForm.password) }">
                <span class="rule-icon">{{ /[A-Z]/.test(registerForm.password) ? '✓' : '○' }}</span>
                包含大写字母
              </div>
              <div class="rule-item" :class="{ valid: /\d/.test(registerForm.password) }">
                <span class="rule-icon">{{ /\d/.test(registerForm.password) ? '✓' : '○' }}</span>
                包含数字
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>📧 邮箱 <span class="optional">(可选)</span></label>
            <input
              v-model="registerForm.email"
              type="email"
              placeholder="例如: user@example.com"
              autocomplete="email"
            />
            <small class="input-hint">可用于找回密码（暂未启用）</small>
          </div>
          <div class="form-group">
            <label>😊 显示名称 <span class="optional">(可选)</span></label>
            <input
              v-model="registerForm.display_name"
              type="text"
              placeholder="例如: 张三"
            />
            <small class="input-hint">在系统中显示的友好名称，不填则使用用户名</small>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="registerForm.migrate_data" />
              <span>📚 继承现有学习数据（错题、进度等）</span>
            </label>
            <small class="input-hint">首次注册时可以导入默认用户的学习记录</small>
          </div>

          <button type="submit" class="btn-submit" :disabled="loading || !isPasswordValid">
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </form>
      </div>

      <!-- 提示信息 -->
      <div v-if="message" class="message" :class="messageType">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script>
import api from '../utils/api';
import { authStore } from '../store/auth';

const API_BASE = '/api/auth';

// 密码复杂度验证
function isPasswordValid(password) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

export default {
  name: 'LoginModal',
  data() {
    return {
      showModal: false,
      currentTab: 'login',
      loading: false,
      message: '',
      messageType: '',
      loginForm: {
        username: '',
        password: ''
      },
      registerForm: {
        username: '',
        password: '',
        email: '',
        display_name: '',
        migrate_data: true
      }
    };
  },
  computed: {
    isPasswordValid() {
      return isPasswordValid(this.registerForm.password);
    }
  },
  methods: {
    open() {
      this.showModal = true;
      this.message = '';
    },
    closeModal() {
      this.showModal = false;
      this.message = '';
    },
    async handleLogin() {
      this.loading = true;
      this.message = '';

      try {
        const response = await api.post(`${API_BASE}/login`, this.loginForm);
        authStore.login(response.data.token, response.data.user);
        this.message = '登录成功！';
        this.messageType = 'success';
        setTimeout(() => {
          this.closeModal();
          this.$emit('logged-in');
        }, 500);
      } catch (error) {
        this.message = error.response?.data?.error || '登录失败';
        this.messageType = 'error';
      } finally {
        this.loading = false;
      }
    },
    async handleRegister() {
      // 验证密码复杂度
      if (!isPasswordValid(this.registerForm.password)) {
        this.message = '密码必须至少8个字符，包含大小写字母和数字';
        this.messageType = 'error';
        return;
      }

      this.loading = true;
      this.message = '';

      try {
        const response = await api.post(`${API_BASE}/register`, this.registerForm);
        authStore.login(response.data.token, response.data.user);

        let msg = '注册成功！';
        if (response.data.migrated) {
          msg += ' 已继承学习数据。';
        }
        this.message = msg;
        this.messageType = 'success';
        setTimeout(() => {
          this.closeModal();
          this.$emit('logged-in');
        }, 1000);
      } catch (error) {
        this.message = error.response?.data?.error || '注册失败';
        this.messageType = 'error';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  padding: 0;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.btn-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.btn-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

/* 欢迎头部 */
.welcome-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 2rem;
  text-align: center;
}

.welcome-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.95;
}

.tabs {
  display: flex;
  gap: 0;
  margin: 0;
  border-bottom: 2px solid #f0f0f0;
  background: #fafafa;
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
  font-weight: 500;
}

.tab-btn:hover {
  background: rgba(102, 126, 234, 0.05);
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.form-container {
  padding: 2rem;
}

.form-container h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.4rem;
}

.form-description {
  margin: 0 0 1.5rem 0;
  color: #666;
  font-size: 0.95rem;
}

.info-box {
  margin: 0 2rem 1.5rem 2rem;
  padding: 1rem;
  background: #e3f2fd;
  border-left: 3px solid #2196F3;
  border-radius: 8px;
  font-size: 0.9rem;
}

.info-box p {
  margin: 0.25rem 0;
  color: #1565c0;
}

.hint-text {
  color: #666 !important;
  font-size: 0.85rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
  font-size: 0.95rem;
}

.required {
  color: #f44336;
}

.optional {
  color: #999;
  font-size: 0.85rem;
  font-weight: normal;
}

.input-hint {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: #888;
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"] {
  width: 100%;
  padding: 0.875rem;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 密码规则提示 */
.password-rules {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 0.85rem;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  margin-bottom: 0.35rem;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-item.valid {
  color: #4caf50;
}

.rule-icon {
  display: inline-block;
  width: 1.2rem;
  text-align: center;
  font-weight: bold;
  font-size: 0.9rem;
}

.rule-item.valid .rule-icon {
  color: #4caf50;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 1.5rem 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.btn-submit {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-submit:active:not(:disabled) {
  transform: translateY(0);
}

.btn-submit:disabled {
  background: linear-gradient(135deg, #ccc 0%, #999 100%);
  cursor: not-allowed;
  box-shadow: none;
}

.message {
  margin: 1rem 2rem 2rem 2rem;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  font-size: 0.95rem;
}

.message.success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.message.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

/* 移动端适配 */
@media (max-width: 600px) {
  .modal-content {
    width: 95%;
    max-width: none;
  }

  .form-container {
    padding: 1.5rem;
  }

  .welcome-header {
    padding: 1.25rem 1.5rem;
  }

  .welcome-header h1 {
    font-size: 1.25rem;
  }
}
</style>
