<template>
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <button @click="closeModal" class="btn-close">✕</button>

      <div class="form-container">
        <h2>修改密码</h2>
        <form @submit.prevent="handleChangePassword">
          <div class="form-group">
            <label>当前密码 *</label>
            <input
              v-model="form.old_password"
              type="password"
              placeholder="请输入当前密码"
              required
              minlength="6"
            />
          </div>
          <div class="form-group">
            <label>新密码 *</label>
            <input
              v-model="form.new_password"
              type="password"
              placeholder="请输入新密码（至少8个字符）"
              required
              minlength="8"
            />
            <!-- 密码强度指示器 -->
            <div v-if="form.new_password && passwordStrength.text" class="password-strength">
              <span class="strength-label">密码强度：</span>
              <span class="strength-indicator" :style="{ color: passwordStrength.color }">
                {{ passwordStrength.text }}
              </span>
            </div>
            <!-- 密码规则提示 -->
            <div class="password-rules">
              <div class="rule-item" :class="{ valid: form.new_password.length >= 8 }">
                <span class="rule-icon">{{ form.new_password.length >= 8 ? '✓' : '○' }}</span>
                至少8个字符
              </div>
              <div class="rule-item" :class="{ valid: /[a-z]/.test(form.new_password) }">
                <span class="rule-icon">{{ /[a-z]/.test(form.new_password) ? '✓' : '○' }}</span>
                包含小写字母
              </div>
              <div class="rule-item" :class="{ valid: /[A-Z]/.test(form.new_password) }">
                <span class="rule-icon">{{ /[A-Z]/.test(form.new_password) ? '✓' : '○' }}</span>
                包含大写字母
              </div>
              <div class="rule-item" :class="{ valid: /\d/.test(form.new_password) }">
                <span class="rule-icon">{{ /\d/.test(form.new_password) ? '✓' : '○' }}</span>
                包含数字
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>确认新密码 *</label>
            <input
              v-model="form.confirm_password"
              type="password"
              placeholder="请再次输入新密码"
              required
              minlength="8"
            />
          </div>

          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? '提交中...' : '确认修改' }}
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

const API_BASE = '/api/auth';

// 密码复杂度规则
const PASSWORD_RULES = {
  minLength: 8,
  requireLowercase: true,   // 需要小写字母
  requireUppercase: true,   // 需要大写字母
  requireNumber: true,      // 需要数字
  requireSpecial: false     // 需要特殊字符（可选）
};

// 验证密码复杂度
function validatePasswordComplexity(password) {
  const errors = [];

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`密码长度至少${PASSWORD_RULES.minLength}个字符`);
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }

  if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }

  if (PASSWORD_RULES.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符');
  }

  return errors;
}

export default {
  name: 'ChangePasswordModal',
  data() {
    return {
      showModal: false,
      loading: false,
      message: '',
      messageType: '',
      form: {
        old_password: '',
        new_password: '',
        confirm_password: ''
      },
      passwordStrength: {
        score: 0,
        text: '',
        color: ''
      }
    };
  },
  methods: {
    open() {
      this.showModal = true;
      this.message = '';
      this.form = {
        old_password: '',
        new_password: '',
        confirm_password: ''
      };
      this.passwordStrength = { score: 0, text: '', color: '' };
    },
    closeModal() {
      this.showModal = false;
      this.message = '';
      this.form = {
        old_password: '',
        new_password: '',
        confirm_password: ''
      };
      this.passwordStrength = { score: 0, text: '', color: '' };
    },

    // 检查密码强度
    checkPasswordStrength() {
      const password = this.form.new_password;
      if (!password) {
        this.passwordStrength = { score: 0, text: '', color: '' };
        return;
      }

      let score = 0;

      // 长度检查
      if (password.length >= 8) score++;
      if (password.length >= 12) score++;

      // 字符类型检查
      if (/[a-z]/.test(password)) score++;  // 小写字母
      if (/[A-Z]/.test(password)) score++;  // 大写字母
      if (/\d/.test(password)) score++;     // 数字
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;  // 特殊字符

      // 根据分数设置强度显示
      if (score <= 2) {
        this.passwordStrength = { score, text: '弱', color: '#f44336' };
      } else if (score <= 4) {
        this.passwordStrength = { score, text: '中', color: '#ff9800' };
      } else {
        this.passwordStrength = { score, text: '强', color: '#4caf50' };
      }
    },

    async handleChangePassword() {
      // 验证新密码和确认密码是否一致
      if (this.form.new_password !== this.form.confirm_password) {
        this.message = '两次输入的新密码不一致';
        this.messageType = 'error';
        return;
      }

      // 验证新密码不能与旧密码相同
      if (this.form.old_password === this.form.new_password) {
        this.message = '新密码不能与当前密码相同';
        this.messageType = 'error';
        return;
      }

      // 验证密码复杂度
      const complexityErrors = validatePasswordComplexity(this.form.new_password);
      if (complexityErrors.length > 0) {
        this.message = complexityErrors.join('；');
        this.messageType = 'error';
        return;
      }

      this.loading = true;
      this.message = '';

      try {
        const response = await api.post(
          `${API_BASE}/change-password`,
          {
            old_password: this.form.old_password,
            new_password: this.form.new_password
          }
        );

        this.message = '密码修改成功！请使用新密码重新登录。';
        this.messageType = 'success';

        setTimeout(() => {
          this.closeModal();
          // 密码修改成功后，自动登出
          this.$emit('password-changed');
        }, 1500);
      } catch (error) {
        this.message = error.response?.data?.error || '修改密码失败';
        this.messageType = 'error';
      } finally {
        this.loading = false;
      }
    }
  },
  watch: {
    'form.new_password'() {
      this.checkPasswordStrength();
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 450px;
  position: relative;
}

.btn-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.form-container h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
}

.btn-submit {
  width: 100%;
  padding: 0.875rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.btn-submit:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.message {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  text-align: center;
}

.message.success {
  background: #e8f5e9;
  color: #4CAF50;
}

.message.error {
  background: #ffebee;
  color: #f44336;
}

/* 密码强度指示器 */
.password-strength {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 0.85rem;
}

.strength-label {
  color: #666;
}

.strength-indicator {
  font-weight: 600;
  margin-left: 0.5rem;
}

/* 密码规则提示 */
.password-rules {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-item.valid {
  color: #4caf50;
}

.rule-icon {
  display: inline-block;
  width: 1rem;
  text-align: center;
  font-weight: bold;
}

.rule-item.valid .rule-icon {
  color: #4caf50;
}
</style>
