/**
 * 公开访问白名单配置
 * 定义哪些API端点和路由可以在未登录状态下访问
 */

module.exports = {
  // ========== 公开API端点 ==========
  publicEndpoints: [
    // 健康检查
    { path: '/health', method: 'GET', description: '系统健康检查' },

    // 认证相关
    { path: '/api/auth/login', method: 'POST', description: '用户登录' },
    { path: '/api/auth/register', method: 'POST', description: '用户注册' },
    { path: '/api/public/*', method: 'GET', description: '公开信息API' },
    { path: '/api/*', method: '*', description: '所有API端点（临时）' },

    // 系统信息（脱敏）
    { path: '/api/system/info', method: 'GET', description: '系统基本信息' },
    { path: '/api/stats', method: 'GET', description: '题库统计（脱敏）' },
	    { path: '/api/questions/random', method: 'GET', description: '获取随机题目' },
	    { path: '/api/questions/by-type/*', method: 'GET', description: '按题型获取题目' },
	    { path: '/api/questions/count', method: 'GET', description: '获取题目总数' },
	    { path: '/api/questions/types', method: 'GET', description: '获取题型列表' },

    // 静态资源
    { path: '/', method: 'GET', description: '首页' },
    { path: '/index.html', method: 'GET', description: '首页' },
    { path: '/assets/*', method: 'GET', description: '静态资源' },
    { path: '/favicon.ico', method: 'GET', description: '网站图标' }
  ],

  // ========== 需要认证的端点（敏感操作） ==========
  protectedEndpoints: [
    // 用户数据
    '/api/v2/user/*',
    '/api/v2/practice/*',
    '/api/v2/questions/*',
    '/api/v2/wrong-answers/*',
    '/api/v2/intelligent-review/*',
    '/api/v2/progress/*',
    '/api/v2/smart/*',

    // 管理功能
    '/api/v2/admin/*',
    '/api/v2/auth/change-password',
    '/api/v2/auth/me'
  ],

  // ========== 未登录时可以显示的页面信息 ==========
  publicPages: [
    'login',      // 登录页
    'register',   // 注册页
    'home',       // 首页（脱敏信息）
    'about',      // 关于页面
    'help'        // 帮助页面
  ],

  // ========== 未登录时需要隐藏的信息 ==========
  hiddenWhenLoggedOut: [
    // 用户个人信息
    'userProfile',
    'userStats',
    'practiceHistory',
    'wrongAnswers',

    // 敏感功能
    'intelligentReview',
    'smartReview',
    'documentReview',
    'examCategoryPractice',
    'adminPanel'
  ],

  // ========== 公开但需要脱敏的数据 ==========
  publicDataWithSanitization: {
    // 题库统计（只显示总数，不显示详细内容）
    '/api/stats': {
      allowedFields: ['totalQuestions', 'questionTypes'],
      deniedFields: ['questions', 'answers', 'explanations']
    },

    // 系统信息（脱敏版本）
    '/api/system/info': {
      allowedFields: ['name', 'version', 'features'],
      deniedFields: ['deployment', 'database', 'internalConfig']
    }
  },

  // ========== 错误响应优化（避免信息泄露） ==========
  errorResponses: {
    // 生产环境不显示详细错误信息
    production: {
      showDetails: false,
      showStackTrace: false,
      showInternalErrors: false,
      genericMessage: '请求处理失败，请联系管理员'
    },

    // 开发环境可以显示详细信息
    development: {
      showDetails: true,
      showStackTrace: true,
      showInternalErrors: true,
      genericMessage: null
    }
  },

  // ========== 速率限制（公开端点更严格） ==========
  publicEndpointRateLimits: {
    '/api/auth/login': {
      windowMs: 15 * 60 * 1000,  // 15分钟
      maxRequests: 5,               // 最多5次
      blockDuration: 30 * 60 * 1000 // 封禁30分钟
    },
    '/api/auth/register': {
      windowMs: 60 * 60 * 1000,  // 1小时
      maxRequests: 3,               // 最多3次
      blockDuration: 60 * 60 * 1000 // 封禁1小时
    },
    '/api/stats': {
      windowMs: 15 * 60 * 1000,  // 15分钟
      maxRequests: 20,              // 最多20次
      blockDuration: 15 * 60 * 1000 // 封禁15分钟
    }
  },

  // ========== 验证规则 ==========
  validation: {
    // 防止枚举攻击
    preventEnumeration: {
      enabled: true,
      maxUserCheckAttempts: 3,
      enumerationDetection: true
    },

    // 输入验证
    inputValidation: {
      maxStringLength: 1000,
      allowedCharacters: /^[a-zA-Z0-9\s\-_.@\u4e00-\u9fa5]+$/,
      sqlInjectionPatterns: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b)/i,
        /(\b(OR|AND)\s+\w+\s*(=|<|>|!=))/i
      ],
      xssPatterns: [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ]
    }
  },

  // ========== 安全Headers ==========
  securityHeaders: {
    // 防止信息泄露的Headers
    'X-Powered-By': null, // 移除（不显示Express版本）
    'Server': 'SecureServer', // 隐藏具体服务器信息

    // 安全相关的Headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  },

  // ========== 日志和监控 ==========
  logging: {
    // 记录未授权访问尝试
    logUnauthorizedAttempts: true,

    // 记录可疑活动
    suspiciousActivities: [
      'enumeration_attack',     // 枚举攻击
      'credential_stuffing',    // 凭证填充攻击
      'path_traversal',         // 路径遍历
      'sql_injection_attempt',  // SQL注入尝试
      'xss_attempt',           // XSS攻击尝试
      'excessive_requests'     // 过度请求
    ],

    // 告警阈值
    alertThresholds: {
      unauthorizedAttempts: 10,     // 10次未授权尝试
      failedAuthAttempts: 5,        // 5次认证失败
      suspiciousPatterns: 3         // 3次可疑模式
    }
  }
};