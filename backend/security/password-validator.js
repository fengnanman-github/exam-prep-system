/**
 * 密码验证器 - 业界最佳实践
 * 验证密码强度、复杂度和安全性
 */

const securityConfig = require('../config/security-config');

class PasswordValidator {
  constructor() {
    this.config = securityConfig.password;
  }

  /**
   * 验证密码是否符合安全策略
   * @param {string} password - 待验证的密码
   * @param {Object} userInfo - 用户信息（用于检查密码中是否包含用户信息）
   * @returns {Object} { valid: boolean, errors: string[], strength: string }
   */
  validate(password, userInfo = {}) {
    const errors = [];

    // 长度检查
    if (password.length < this.config.minLength) {
      errors.push(`密码长度至少${this.config.minLength}位`);
    }
    if (password.length > this.config.maxLength) {
      errors.push(`密码长度不能超过${this.config.maxLength}位`);
    }

    // 复杂度检查
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
    }
    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
    }
    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    }
    if (this.config.requireSpecialChars && !this.hasSpecialChar(password)) {
      errors.push(`密码必须包含至少一个特殊字符 (${this.config.specialChars})`);
    }

    // 防止包含用户信息
    if (this.config.preventUserInfo) {
      const userInfoArray = [
        userInfo.username,
        userInfo.email?.split('@')[0],
        userInfo.displayName
      ].filter(Boolean);

      for (const info of userInfoArray) {
        if (info && password.toLowerCase().includes(info.toLowerCase())) {
          errors.push('密码不能包含用户名、邮箱或显示名称');
          break;
        }
      }
    }

    // 防止常见弱密码
    if (this.config.preventCommon && this.isCommonPassword(password)) {
      errors.push('密码过于常见，请使用更复杂的密码');
    }

    // 计算密码强度
    const strength = this.calculateStrength(password);

    return {
      valid: errors.length === 0,
      errors,
      strength,
      score: this.getStrengthScore(strength)
    };
  }

  /**
   * 检查密码是否包含特殊字符
   */
  hasSpecialChar(password) {
    const specialCharsRegex = new RegExp(
      `[${this.config.specialChars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`
    );
    return specialCharsRegex.test(password);
  }

  /**
   * 检查是否为常见弱密码
   */
  isCommonPassword(password) {
    const commonPasswords = [
      'password', '12345678', 'qwerty', 'abc123', 'monkey',
      'master', 'dragon', '11111111', 'baseball', 'iloveyou',
      'trustno1', 'sunshine', 'princess', 'admin', 'welcome',
      'shadow', 'ashley', 'football', 'jesus', 'michael',
      'ninja', 'mustang', 'password1', 'password123', '123456789'
    ];

    return commonPasswords.some(common =>
      password.toLowerCase().includes(common.toLowerCase()) ||
      common.toLowerCase().includes(password.toLowerCase())
    );
  }

  /**
   * 计算密码强度
   */
  calculateStrength(password) {
    let score = 0;

    // 长度得分
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // 复杂度得分
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (this.hasSpecialChar(password)) score += 1;

    // 额外复杂度
    if (/[a-z].*[A-Z]|[A-Z].*[a-z]/.test(password)) score += 1; // 大小写混合
    if (/\d.*\d/.test(password)) score += 1; // 多个数字
    if (new RegExp(`[${this.config.specialChars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}].*[${this.config.specialChars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$ &')}]`).test(password)) score += 1; // 多个特殊字符

    if (score <= 3) return 'weak';
    if (score <= 6) return 'medium';
    if (score <= 8) return 'strong';
    return 'very-strong';
  }

  /**
   * 获取强度得分（0-100）
   */
  getStrengthScore(strength) {
    const scores = {
      'weak': 25,
      'medium': 50,
      'strong': 75,
      'very-strong': 100
    };
    return scores[strength] || 0;
  }

  /**
   * 生成强密码建议
   */
  generateSuggestions(length = 16) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = this.config.specialChars;

    let password = '';
    const allChars = uppercase + lowercase + numbers + special;

    // 确保包含各类字符
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // 填充剩余长度
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // 随机打乱
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

module.exports = new PasswordValidator();