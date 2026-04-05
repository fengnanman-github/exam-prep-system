<template>
  <div class="login-page">
    <div class="login-container">
      <div class="brand-section">
        <div class="brand-content">
          <h1 class="brand-title">🔐 密评备考系统</h1>
          <p class="brand-subtitle">商用密码应用安全性评估从业人员考核备考平台</p>
          <div class="brand-features">
            <div class="feature-item">🎯 5,000+精选题库</div>
            <div class="feature-item">🧠 智能复习算法</div>
            <div class="feature-item">📊 学习进度追踪</div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">登录</h2>
            <p class="form-subtitle">欢迎回来</p>
          </div>

          <form @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <label>用户名</label>
              <input v-model="loginForm.username" type="text" class="form-input" placeholder="请输入用户名" required :disabled="loading" />
            </div>

            <div class="form-group">
              <label>密码</label>
              <div class="password-input">
                <input v-model="loginForm.password" :type="showPassword ? 'text' : 'password'" class="form-input" placeholder="请输入密码" required :disabled="loading" />
                <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

            <button type="submit" class="submit-button" :disabled="loading">
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </form>

          <div class="form-footer">
            <p>还没有账户？<router-link to="/register" class="link">立即注册</router-link></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authStore } from '../store/auth';

export default {
  name: 'LoginPage',
  data() {
    return {
      loginForm: { username: '', password: '' },
      showPassword: false,
      loading: false,
      errorMessage: ''
    };
  },

  methods: {
    async handleLogin() {
      this.loading = true;
      this.errorMessage = '';

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.loginForm)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '登录失败');
        }

        // 检查审批状态
        if (data.user.approval_status && data.user.approval_status !== 'approved') {
          this.errorMessage = this.getStatusMessage(data.user.approval_status);
          return;
        }

        authStore.login(data.token, data.user);

        // 重定向
        const redirect = data.user.role === 'admin' ? '/admin' : '/';
        this.$router.push(redirect);

      } catch (error) {
        this.errorMessage = error.message || '登录失败，请检查用户名和密码';
      } finally {
        this.loading = false;
      }
    },

    getStatusMessage(status) {
      const messages = {
        'pending_verification': '请先验证您的邮箱地址',
        'pending_approval': '您的账户正在等待管理员审批',
        'rejected': '您的账户申请已被拒绝',
        'suspended': '您的账户已被暂停'
      };
      return messages[status] || '账户状态异常';
    }
  }
};
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
.login-container { display: flex; max-width: 1000px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; min-height: 500px; }
.brand-section { flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; display: flex; align-items: center; justify-content: center; color: white; }
.brand-content { max-width: 350px; text-align: center; }
.brand-title { font-size: 2rem; font-weight: bold; margin-bottom: 1rem; }
.brand-subtitle { font-size: 1rem; opacity: 0.9; margin-bottom: 2rem; }
.brand-features { display: flex; flex-direction: column; gap: 1rem; }
.feature-item { padding: 0.75rem; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.9rem; }

.form-section { flex: 1; padding: 40px; display: flex; align-items: center; justify-content: center; }
.form-container { width: 100%; max-width: 350px; }
.form-header { text-align: center; margin-bottom: 2rem; }
.form-title { font-size: 1.75rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem; }
.form-subtitle { color: #6b7280; font-size: 0.9rem; }

.login-form { display: flex; flex-direction: column; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-weight: 500; color: #374151; font-size: 0.9rem; }
.form-input { padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; transition: all 0.3s; }
.form-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
.form-input:disabled { background-color: #f3f4f6; cursor: not-allowed; }

.password-input { position: relative; display: flex; align-items: center; }
.password-input .form-input { flex: 1; padding-right: 3rem; }
.toggle-password { position: absolute; right: 0.5rem; background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 0.5rem; }

.error-message { padding: 0.75rem; background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; font-size: 0.9rem; text-align: center; }

.submit-button { padding: 0.875rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.submit-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(102,126,234,0.3); }
.submit-button:disabled { opacity: 0.6; cursor: not-allowed; }

.form-footer { margin-top: 1.5rem; text-align: center; font-size: 0.9rem; color: #6b7280; }
.link { color: #667eea; text-decoration: none; font-weight: 600; }
.link:hover { text-decoration: underline; }

@media (max-width: 768px) {
  .login-container { flex-direction: column; }
  .brand-section, .form-section { padding: 30px 20px; }
}
</style>
