<template>
  <div class="register-page">
    <div class="register-container">
      <div class="brand-section">
        <div class="brand-content">
          <h1 class="brand-title">🔐 密评备考系统</h1>
          <p class="brand-subtitle">创建账户，开始备考之旅</p>
        </div>
      </div>

      <div class="form-section">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">注册</h2>
            <p class="form-subtitle">填写信息创建账户</p>
          </div>

          <form @submit.prevent="handleRegister" class="register-form">
            <div class="form-group">
              <label>用户名 *</label>
              <input v-model="registerForm.username" type="text" class="form-input" placeholder="3-20个字符" required :disabled="loading" />
            </div>

            <div class="form-group">
              <label>邮箱 *</label>
              <input v-model="registerForm.email" type="email" class="form-input" placeholder="用于验证和通知" required :disabled="loading" />
            </div>

            <div class="form-group">
              <label>密码 *</label>
              <input v-model="registerForm.password" type="password" class="form-input" placeholder="至少8个字符" required :disabled="loading" />
            </div>

            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
            <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

            <button type="submit" class="submit-button" :disabled="loading">
              {{ loading ? '注册中...' : '注册' }}
            </button>
          </form>

          <div class="form-footer">
            <p>已有账户？<router-link to="/login" class="link">立即登录</router-link></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RegisterPage',
  data() {
    return {
      registerForm: { username: '', email: '', password: '' },
      loading: false,
      errorMessage: '',
      successMessage: ''
    };
  },

  methods: {
    async handleRegister() {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.registerForm)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '注册失败');
        }

        this.successMessage = data.message || '注册成功，请检查邮箱进行验证';

        setTimeout(() => {
          this.$router.push('/login');
        }, 3000);

      } catch (error) {
        this.errorMessage = error.message || '注册失败';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.register-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
.register-container { display: flex; max-width: 1000px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; min-height: 600px; }
.brand-section { flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; display: flex; align-items: center; justify-content: center; color: white; }
.brand-content { max-width: 350px; text-align: center; }
.brand-title { font-size: 2rem; font-weight: bold; margin-bottom: 1rem; }
.brand-subtitle { font-size: 1rem; opacity: 0.9; }

.form-section { flex: 1.2; padding: 40px; display: flex; align-items: center; justify-content: center; overflow-y: auto; }
.form-container { width: 100%; max-width: 400px; }
.form-header { text-align: center; margin-bottom: 2rem; }
.form-title { font-size: 1.75rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem; }
.form-subtitle { color: #6b7280; font-size: 0.9rem; }

.register-form { display: flex; flex-direction: column; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-weight: 500; color: #374151; font-size: 0.9rem; }
.form-input { padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; transition: all 0.3s; }
.form-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
.form-input:disabled { background-color: #f3f4f6; cursor: not-allowed; }

.error-message { padding: 0.75rem; background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; font-size: 0.9rem; text-align: center; }
.success-message { padding: 0.75rem; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; border-radius: 8px; font-size: 0.9rem; text-align: center; }

.submit-button { padding: 0.875rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.submit-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(102,126,234,0.3); }
.submit-button:disabled { opacity: 0.6; cursor: not-allowed; }

.form-footer { margin-top: 1.5rem; text-align: center; font-size: 0.9rem; color: #6b7280; }
.link { color: #667eea; text-decoration: none; font-weight: 600; }
.link:hover { text-decoration: underline; }

@media (max-width: 768px) {
  .register-container { flex-direction: column; }
  .brand-section, .form-section { padding: 30px 20px; }
}
</style>
