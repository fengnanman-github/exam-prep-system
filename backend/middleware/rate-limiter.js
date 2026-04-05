/**
 * 速率限制中间件 - 防止API滥用和DDoS攻击
 * 基于IP地址和用户的智能速率限制
 */

const securityConfig = require('../config/security-config');

class RateLimiter {
  constructor() {
    this.config = securityConfig.rateLimit;
    // 使用内存存储（生产环境建议使用Redis）
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000); // 每分钟清理一次
  }

  /**
   * 通用速率限制中间件
   */
  general() {
    return (req, res, next) => {
      const identifier = this.getIdentifier(req);
      const limit = this.config.maxRequests;
      const window = this.config.windowMs;

      if (this.checkRate(identifier, limit, window)) {
        next();
      } else {
        this.sendRateLimitExceeded(res, limit, window);
      }
    };
  }

  /**
   * 认证API速率限制（更严格）
   */
  auth() {
    return (req, res, next) => {
      const identifier = this.getIdentifier(req);
      const limit = this.config.authRequests;
      const window = this.config.windowMs;

      if (this.checkRate(identifier, limit, window)) {
        next();
      } else {
        this.sendRateLimitExceeded(res, limit, window);
      }
    };
  }

  /**
   * 登录尝试速率限制
   */
  login() {
    return (req, res, next) => {
      const identifier = this.getIdentifier(req);
      const limit = this.config.loginAttempts;
      const window = this.config.windowMs;

      if (this.checkRate(identifier, limit, window)) {
        next();
      } else {
        this.sendRateLimitExceeded(res, limit, window);
      }
    };
  }

  /**
   * 密码重置速率限制
   */
  passwordReset() {
    return (req, res, next) => {
      const identifier = this.getIdentifier(req);
      const limit = this.config.passwordResetRequests;
      const window = this.config.windowMs;

      if (this.checkRate(identifier, limit, window)) {
        next();
      } else {
        this.sendRateLimitExceeded(res, limit, window);
      }
    };
  }

  /**
   * 获取请求标识符（IP地址或用户ID）
   */
  getIdentifier(req) {
    // 优先使用用户ID（如果已认证）
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }

    // 使用IP地址
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    return `ip:${ip}`;
  }

  /**
   * 检查速率限制
   * @param {string} identifier - 请求标识符
   * @param {number} limit - 请求限制数
   * @param {number} window - 时间窗口（毫秒）
   * @returns {boolean} 是否允许请求
   */
  checkRate(identifier, limit, window) {
    const now = Date.now();
    const key = `${identifier}`;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const requests = this.requests.get(key);

    // 清理过期的请求记录
    const validRequests = requests.filter(time => now - time < window);

    // 检查是否超过限制
    if (validRequests.length >= limit) {
      return false;
    }

    // 记录当前请求
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * 发送速率限制超出响应
   */
  sendRateLimitExceeded(res, limit, window) {
    const windowMinutes = Math.ceil(window / (1000 * 60));
    res.status(429).json({
      error: '请求过于频繁',
      message: `您在${windowMinutes}分钟内的请求次数已超过限制，请稍后再试`,
      limit: limit,
      window: windowMinutes
    });
  }

  /**
   * 清理过期的请求记录
   */
  cleanup() {
    const now = Date.now();
    const window = this.config.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < window);

      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  /**
   * 获取当前使用情况
   */
  getStats() {
    const stats = {
      totalIdentifiers: this.requests.size,
      identifiers: []
    };

    for (const [key, requests] of this.requests.entries()) {
      stats.identifiers.push({
        identifier: key,
        requestCount: requests.length
      });
    }

    return stats;
  }

  /**
   * 清除特定标识符的限制
   */
  clear(identifier) {
    this.requests.delete(identifier);
  }

  /**
   * 清除所有限制
   */
  clearAll() {
    this.requests.clear();
  }

  /**
   * 停止清理定时器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// 创建单例实例
const rateLimiter = new RateLimiter();

module.exports = rateLimiter;