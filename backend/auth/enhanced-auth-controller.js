/**
 * 增强的认证控制器 - 集成安全功能
 * 包含密码策略、账户锁定、审计日志等
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateToken } = require('./auth-middleware');
const passwordValidator = require('../security/password-validator');
const AccountLockout = require('../security/account-lockout');
const securityConfig = require('../config/security-config');

/**
 * 用户注册（增强版）
 */
async function register(pool, req, res) {
  const client = await pool.connect();

  try {
    const { username, password, email, display_name } = req.body;

    // 参数验证
    const validation = validateUserInfo(username, email, display_name);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    // 密码强度验证
    const passwordValidation = passwordValidator.validate(password, { username, email, display_name });
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: '密码不符合安全要求',
        details: passwordValidation.errors,
        strength: passwordValidation.strength
      });
    }

    // 检查用户名是否已存在
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: '邮箱已被注册' });
      }
    }

    // 加密密码（使用更高的bcrypt轮数）
    const password_hash = await bcrypt.hash(password, securityConfig.password.bcryptRounds);

    // 生成邮箱验证token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时

    // 创建用户
    const result = await client.query(
      `INSERT INTO users (username, password_hash, email, display_name, email_verification_token, email_verification_expires)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, display_name, role, created_at`,
      [username, password_hash, email || null, display_name || username, emailVerificationToken, emailVerificationExpires]
    );

    const user = result.rows[0];

    // 记录审计日志
    await logAuditEvent(client, {
      event_type: 'user_registered',
      user_id: user.id,
      username: username,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // 发送邮箱验证邮件（这里需要集成邮件服务）
    if (email) {
      // TODO: 发送验证邮件
      console.log(`[EMAIL] 验证邮件已发送至 ${email}, Token: ${emailVerificationToken}`);
    }

    // 生成Token
    const token = generateToken(user);

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        email_verified: false
      },
      passwordStrength: passwordValidation.strength
    });

  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败' });
  } finally {
    client.release();
  }
}

/**
 * 用户登录（增强版）
 */
async function login(pool, req, res) {
  const client = await pool.connect();
  const accountLockout = new AccountLockout(pool);

  try {
    const { username, password, remember_me } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 检查账户锁定状态
    const lockoutStatus = await accountLockout.checkLockout(username);
    if (lockoutStatus.locked) {
      await logAuditEvent(client, {
        event_type: 'login_attempt_locked',
        username: username,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        details: lockoutStatus
      });

      return res.status(403).json({
        error: '账户已被锁定',
        message: lockoutStatus.message,
        remainingTime: lockoutStatus.remainingTime
      });
    }

    // 查询用户
    const result = await client.query(
      `SELECT id, username, password_hash, display_name, role, is_active,
              email, email_verified, last_login_at, failed_login_attempts
       FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      // 记录失败尝试
      const failResult = await accountLockout.recordFailedAttempt(username);
      await logAuditEvent(client, {
        event_type: 'login_failed_user_not_found',
        username: username,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      return res.status(401).json({
        error: '用户名或密码错误',
        remainingAttempts: failResult.remainingAttempts
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: '账户已被禁用' });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      // 记录失败尝试
      const failResult = await accountLockout.recordFailedAttempt(username);
      await logAuditEvent(client, {
        event_type: 'login_failed_wrong_password',
        user_id: user.id,
        username: username,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      return res.status(401).json({
        error: '用户名或密码错误',
        remainingAttempts: failResult.remainingAttempts
      });
    }

    // 清除失败尝试计数
    await accountLockout.clearFailedAttempts(username);

    // 更新最后登录时间和登录信息
    await client.query(
      `UPDATE users SET
        last_login_at = CURRENT_TIMESTAMP,
        last_login_ip = $1,
        last_login_user_agent = $2,
        login_count = login_count + 1
       WHERE id = $3`,
      [req.ip, req.headers['user-agent'] || 'Unknown', user.id]
    );

    // 生成Token（根据remember_me设置不同有效期）
    const token = generateToken(user, remember_me);

    // 记录成功登录
    await logAuditEvent(client, {
      event_type: 'login_success',
      user_id: user.id,
      username: username,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      remember_me: remember_me || false
    });

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        email: user.email,
        email_verified: user.email_verified,
        last_login_at: user.last_login_at
      }
    });

  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  } finally {
    client.release();
  }
}

/**
 * 修改密码（增强版）
 */
async function changePassword(pool, req, res) {
  const client = await pool.connect();

  try {
    const { old_password, new_password, confirm_password } = req.body;
    const username = req.user.username;

    if (!old_password || !new_password || !confirm_password) {
      return res.status(400).json({ error: '所有密码字段都不能为空' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: '新密码和确认密码不匹配' });
    }

    // 验证新密码强度
    const passwordValidation = passwordValidator.validate(new_password, { username });
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: '新密码不符合安全要求',
        details: passwordValidation.errors,
        strength: passwordValidation.strength
      });
    }

    // 获取用户当前密码和历史密码
    const result = await client.query(
      `SELECT password_hash, password_history FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = result.rows[0];
    const passwordHistory = user.password_history || [];

    // 验证旧密码
    const isValid = await bcrypt.compare(old_password, user.password_hash);
    if (!isValid) {
      await logAuditEvent(client, {
        event_type: 'password_change_failed_wrong_old_password',
        user_id: req.user.id,
        username: username,
        ip_address: req.ip
      });

      return res.status(401).json({ error: '旧密码错误' });
    }

    // 检查新密码是否在历史记录中
    for (const oldHash of passwordHistory) {
      if (await bcrypt.compare(new_password, oldHash)) {
        return res.status(400).json({
          error: '新密码不能与最近使用的密码相同',
          message: `请使用一个新的密码（最近${securityConfig.password.historyCount}次使用过的密码不可重复使用）`
        });
      }
    }

    // 加密新密码
    const new_hash = await bcrypt.hash(new_password, securityConfig.password.bcryptRounds);

    // 更新密码历史（保留最近N次）
    const updatedHistory = [user.password_hash, ...passwordHistory].slice(0, securityConfig.password.historyCount);

    // 更新密码和过期时间
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + securityConfig.password.expiryDays);

    await client.query(
      `UPDATE users SET
        password_hash = $1,
        password_history = $2,
        password_expires_at = $3,
        password_changed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE username = $4`,
      [new_hash, JSON.stringify(updatedHistory), passwordExpiresAt, username]
    );

    // 记录审计日志
    await logAuditEvent(client, {
      event_type: 'password_changed',
      user_id: req.user.id,
      username: username,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      message: '密码修改成功',
      expires_at: passwordExpiresAt,
      strength: passwordValidation.strength
    });

  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  } finally {
    client.release();
  }
}

/**
 * 验证用户信息
 */
function validateUserInfo(username, email, displayName) {
  const errors = [];
  const config = securityConfig.validation;

  // 用户名验证
  if (!username || username.length < config.username.minLength || username.length > config.username.maxLength) {
    errors.push(`用户名长度应为${config.username.minLength}-${config.username.maxLength}个字符`);
  }

  if (config.username.pattern && !new RegExp(`^${config.username.pattern}$`).test(username)) {
    errors.push('用户名只能包含字母、数字和下划线');
  }

  if (config.username.preventReserved && config.username.reservedNames.includes(username.toLowerCase())) {
    errors.push('该用户名为系统保留，请使用其他用户名');
  }

  // 邮箱验证
  if (email) {
    if (!config.email.pattern.test(email)) {
      errors.push('邮箱格式不正确');
    }
  }

  // 显示名称验证
  if (displayName) {
    if (displayName.length < config.displayName.minLength || displayName.length > config.displayName.maxLength) {
      errors.push(`显示名称长度应为${config.displayName.minLength}-${config.displayName.maxLength}个字符`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 记录审计日志
 */
async function logAuditEvent(client, eventData) {
  try {
    await client.query(
      `INSERT INTO audit_logs (event_type, user_id, username, ip_address, user_agent, event_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        eventData.event_type,
        eventData.user_id || null,
        eventData.username || null,
        eventData.ip_address || null,
        eventData.user_agent || null,
        JSON.stringify(eventData)
      ]
    );
  } catch (error) {
    console.error('记录审计日志失败:', error);
  }
}

module.exports = {
  register,
  login,
  changePassword
};