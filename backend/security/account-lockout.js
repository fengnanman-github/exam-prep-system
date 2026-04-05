/**
 * 账户锁定机制 - 防止暴力破解
 * 实现登录失败计数和自动锁定
 */

const securityConfig = require('../config/security-config');

class AccountLockout {
  constructor(pool) {
    this.pool = pool;
    this.config = securityConfig.accountLockout;
  }

  /**
   * 检查账户是否被锁定
   * @param {string} username - 用户名
   * @returns {Object} { locked: boolean, reason: string, remainingTime: number }
   */
  async checkLockout(username) {
    if (!this.config.enabled) {
      return { locked: false };
    }

    try {
      const result = await this.pool.query(
        `SELECT
          failed_login_attempts,
          account_locked_until,
          permanent_locked,
          lockout_count
        FROM users
        WHERE username = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        return { locked: false };
      }

      const user = result.rows[0];

      // 检查永久锁定
      if (user.permanent_locked) {
        return {
          locked: true,
          reason: 'permanent',
          message: '账户已被永久锁定，请联系管理员解锁'
        };
      }

      // 检查临时锁定
      if (user.account_locked_until) {
        const lockedUntil = new Date(user.account_locked_until);
        const now = new Date();

        if (lockedUntil > now) {
          const remainingMinutes = Math.ceil((lockedUntil - now) / (1000 * 60));
          return {
            locked: true,
            reason: 'temporary',
            message: `账户已被临时锁定，请在${remainingMinutes}分钟后重试`,
            remainingTime: remainingMinutes
          };
        } else {
          // 锁定时间已过，自动解锁
          await this.clearLockout(username);
        }
      }

      return { locked: false };

    } catch (error) {
      console.error('检查账户锁定状态失败:', error);
      return { locked: false }; // 失败时允许继续，避免误锁定
    }
  }

  /**
   * 记录登录失败
   * @param {string} username - 用户名
   * @returns {Object} { shouldLock: boolean, attempts: number, remainingAttempts: number }
   */
  async recordFailedAttempt(username) {
    if (!this.config.enabled) {
      return { shouldLock: false };
    }

    try {
      const result = await this.pool.query(
        `SELECT
          failed_login_attempts,
          lockout_count,
          permanent_locked
        FROM users
        WHERE username = $1
        FOR UPDATE`, // 行级锁，防止并发问题
        [username]
      );

      if (result.rows.length === 0) {
        return { shouldLock: false };
      }

      const user = result.rows[0];
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const newLockoutCount = (user.lockout_count || 0) + 1;

      // 检查是否达到永久锁定阈值
      if (newAttempts >= this.config.permanentThreshold) {
        await this.pool.query(
          `UPDATE users SET
            failed_login_attempts = $1,
            permanent_locked = true,
            account_locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE username = $2`,
          [newAttempts, username]
        );

        this.logSecurityEvent('account_permanent_locked', {
          username,
          attempts: newAttempts
        });

        return {
          shouldLock: true,
          lockType: 'permanent',
          message: '账户已被永久锁定，请联系管理员解锁'
        };
      }

      // 检查是否需要临时锁定
      if (newAttempts >= this.config.maxAttempts) {
        // 计算锁定时长（多次锁定会增加时长）
        let lockDuration = this.config.durationMinutes;
        if (this.config.increaseDuration) {
          lockDuration = this.config.durationMinutes * Math.pow(2, newLockoutCount - 1);
          lockDuration = Math.min(lockDuration, 24 * 60); // 最多锁定24小时
        }

        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + lockDuration);

        await this.pool.query(
          `UPDATE users SET
            failed_login_attempts = $1,
            lockout_count = $2,
            account_locked_until = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE username = $4`,
          [newAttempts, newLockoutCount, lockedUntil, username]
        );

        this.logSecurityEvent('account_temp_locked', {
          username,
          attempts: newAttempts,
          duration: lockDuration
        });

        return {
          shouldLock: true,
          lockType: 'temporary',
          message: `账户已被临时锁定${lockDuration}分钟`,
          duration: lockDuration
        };
      }

      // 仅增加失败计数
      await this.pool.query(
        `UPDATE users SET
          failed_login_attempts = $1,
          lockout_count = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE username = $3`,
        [newAttempts, newLockoutCount, username]
      );

      return {
        shouldLock: false,
        attempts: newAttempts,
        remainingAttempts: this.config.maxAttempts - newAttempts
      };

    } catch (error) {
      console.error('记录登录失败失败:', error);
      return { shouldLock: false };
    }
  }

  /**
   * 清除登录失败计数（登录成功时调用）
   * @param {string} username - 用户名
   */
  async clearFailedAttempts(username) {
    if (!this.config.enabled || !this.config.resetOnSuccess) {
      return;
    }

    try {
      await this.pool.query(
        `UPDATE users SET
          failed_login_attempts = 0,
          account_locked_until = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE username = $1`,
        [username]
      );
    } catch (error) {
      console.error('清除登录失败计数失败:', error);
    }
  }

  /**
   * 解除账户锁定（管理员操作）
   * @param {string} username - 用户名
   * @param {string} adminUser - 执行解锁的管理员
   */
  async unlockAccount(username, adminUser) {
    try {
      await this.pool.query(
        `UPDATE users SET
          failed_login_attempts = 0,
          account_locked_until = NULL,
          permanent_locked = false,
          lockout_count = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE username = $1`,
        [username]
      );

      this.logSecurityEvent('account_unlocked', {
        username,
        adminUser
      });

      return { success: true };
    } catch (error) {
      console.error('解除账户锁定失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 清除过期的锁定状态
   */
  async clearExpiredLocks() {
    try {
      const result = await this.pool.query(
        `UPDATE users SET
          failed_login_attempts = 0,
          account_locked_until = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_locked_until IS NOT NULL
        AND account_locked_until <= CURRENT_TIMESTAMP`
      );

      console.log(`清除了${result.rowCount}个过期锁定`);
      return result.rowCount;
    } catch (error) {
      console.error('清除过期锁定失败:', error);
      return 0;
    }
  }

  /**
   * 记录安全事件
   */
  logSecurityEvent(event, data) {
    console.log(`[SECURITY] ${event}:`, data);
    // TODO: 发送到审计日志系统
  }
}

module.exports = AccountLockout;