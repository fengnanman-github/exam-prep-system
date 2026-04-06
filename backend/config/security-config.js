/**
 * 安全配置 - 业界最佳实践
 * 适用于云部署和公网访问
 */

module.exports = {
  // ========== JWT配置 ==========
  jwt: {
    // 从环境变量读取密钥，确保生产环境使用强密钥
    secret: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production');
      }
      return 'dev-jwt-secret-change-in-production';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h', // 生产环境建议1小时
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 刷新token有效期7天
    algorithm: 'HS256'
  },

  // ========== 密码策略 ==========
  password: {
    minLength: 8, // 最小长度8位
    maxLength: 128, // 最大长度128位
    requireUppercase: true, // 需要大写字母
    requireLowercase: true, // 需要小写字母
    requireNumbers: true, // 需要数字
    requireSpecialChars: true, // 需要特殊字符
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?', // 允许的特殊字符
    preventCommon: true, // 防止常见密码
    preventUserInfo: true, // 防止包含用户信息
    bcryptRounds: 12, // bcrypt哈希轮数（建议12-14）
    historyCount: 5, // 记住最近5次密码，防止重复使用
    expiryDays: 90 // 密码90天过期
  },

  // ========== 账户锁定策略 ==========
  accountLockout: {
    enabled: true,
    maxAttempts: 10, // 最大失败次数（调整为10次，更宽松）
    durationMinutes: 30, // 锁定时长30分钟
    resetOnSuccess: true, // 成功登录后重置失败计数
    increaseDuration: true, // 多次锁定增加时长
    permanentThreshold: 20 // 20次失败后永久锁定（需管理员解锁）
  },

  // ========== 速率限制 ==========
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟窗口
    maxRequests: 2000, // 每个IP最多2000个请求（大幅增加，适应学习系统）
    authRequests: 200, // 认证相关请求（从10增加到200）
    passwordResetRequests: 10, // 密码重置请求限制（从3增加到10）
    loginAttempts: 20 // 登录尝试限制（从5增加到20）
  },

  // ========== 会话管理 ==========
  session: {
    maxConcurrentSessions: 3, // 最大并发会话数
    absoluteTimeout: 24 * 60 * 60, // 绝对超时24小时（秒）
    idleTimeout: 30 * 60, // 空闲超时30分钟（秒）
    rememberMeDays: 30 // "记住我"功能有效期30天
  },

  // ========== CSRF保护 ==========
  csrf: {
    enabled: true,
    tokenLength: 32,
    headerName: 'x-csrf-token',
    cookieName: 'csrf_token',
    httpOnly: true, // HTTP only，防止XSS
    secure: process.env.NODE_ENV === 'production', // 生产环境使用HTTPS
    sameSite: 'strict' // 严格same-site策略
  },

  // ========== 安全Headers ==========
  headers: {
    // 内容安全策略
    contentSecurityPolicy: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'"
    ].join('; '),

    // 其他安全headers
    hsts: 'max-age=31536000; includeSubDomains; preload', // HTTP Strict Transport Security
    xFrameOptions: 'DENY', // 防止点击劫持
    xContentTypeOptions: 'nosniff', // 防止MIME类型嗅探
    xXssProtection: '1; mode=block', // XSS保护
    referrerPolicy: 'strict-origin-when-cross-origin', // Referrer策略
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()' // 权限策略
  },

  // ========== 输入验证 ==========
  validation: {
    username: {
      minLength: 3,
      maxLength: 20,
      pattern: '^[a-zA-Z0-9_]+$', // 只允许字母、数字、下划线
      preventReserved: true, // 防止保留用户名
      reservedNames: ['admin', 'root', 'system', 'api', 'www', 'mail']
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // 基本邮箱格式
      requireVerification: true // 需要邮箱验证
    },
    displayName: {
      minLength: 1,
      maxLength: 50,
      preventHTML: true // 防止HTML注入
    }
  },

  // ========== 审计日志 ==========
  audit: {
    enabled: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    events: [
      'login',
      'logout',
      'failed_login',
      'password_change',
      'account_locked',
      'account_unlocked',
      'password_reset',
      'privilege_escalation',
      'data_access'
    ],
    retentionDays: 90, // 日志保留90天
    sensitiveDataMasking: true // 屏蔽敏感数据
  },

  // ========== 数据加密 ==========
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64
  },

  // ========== HTTPS配置 ==========
  https: {
    enabled: process.env.NODE_ENV === 'production',
    redirectHttp: true, // 自动重定向HTTP到HTTPS
    hstsEnabled: true, // 启用HSTS
    sslProtocols: ['TLSv1.2', 'TLSv1.3'], // 只允许TLS 1.2和1.3
    sslCiphers: [ // 安全的加密套件
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384'
    ]
  },

  // ========== 文件上传安全 ==========
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    scanForViruses: true, // 病毒扫描（需要集成）
    sanitizeFilename: true, // 清理文件名
    preventDirectoryTraversal: true // 防止目录遍历
  },

  // ========== API安全 ==========
  api: {
    versioning: true, // 启用API版本控制
    corsEnabled: true, // 启用CORS
    corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:18080'],
    corsMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    corsHeaders: ['Content-Type', 'Authorization'],
    apiKeysEnabled: false, // API密钥功能（可选）
    rateLimitPerUser: true, // 每个用户独立速率限制
    ipWhitelist: [], // IP白名单（可选）
    ipBlacklist: [] // IP黑名单（可选）
  }
};