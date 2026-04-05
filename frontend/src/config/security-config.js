/**
 * 前端安全配置
 * 定义哪些UI组件和功能在未登录时应该隐藏
 */

export const securityConfig = {
  // ========== 公开页面（未登录可访问） ==========
  publicPages: [
    'home',        // 首页
    'login',       // 登录页
    'register',    // 注册页
    'about',       // 关于
    'help'         // 帮助
  ],

  // ========== 受保护页面（需要登录） ==========
  protectedPages: [
    'practice',           // 练习模式
    'category-practice',   // 分类练习
    'exam-category-practice', // 考试类别练习
    'smart-review',        // 智能复习
    'intelligent-review',  // 智能复习+
    'wrong-answers-book',  // 错题本
    'document-review',     // 文档复习
    'progress-stats',      // 学习进度
    'custom-practice',     // 自定义练习
    'bulk-practice',       // 批量练习
    'admin'               // 管理后台
  ],

  // ========== 未登录时隐藏的UI组件 ==========
  hiddenComponents: {
    // 导航菜单项
    navigation: [
      'practice-mode',
      'category-practice',
      'exam-category-practice',
      'smart-review',
      'intelligent-review',
      'wrong-answers-book',
      'document-review',
      'progress-stats',
      'custom-practice',
      'bulk-practice',
      'admin-panel'
    ],

    // 页面元素
    pageElements: [
      'user-stats-display',
      'practice-history',
      'learning-progress',
      'achievements-display',
      'wrong-answers-list',
      'favorites-list',
      'notes-list'
    ]
  },

  // ========== 公开显示的脱敏信息 ==========
  publicInfo: {
    // 系统基本信息
    systemInfo: {
      name: '密评备考系统',
      version: '1.0.0',
      features: [
        '智能练习',
        '错题管理',
        '学习进度追踪',
        '多种练习模式'
      ]
    },

    // 脱敏的统计数据
    publicStats: {
      totalQuestions: 5000,  // 只显示题库总数
      questionTypes: ['单项选择题', '多项选择题', '判断题'],
      practiceModes: 5
    }
  },

  // ========== 路由守卫配置 ==========
  routeGuards: {
    // 需要认证的路由
    requiresAuth: [
      '/practice',
      '/category-practice',
      '/exam-category-practice',
      '/smart-review',
      '/intelligent-review',
      '/wrong-answers-book',
      '/document-review',
      '/progress-stats',
      '/custom-practice',
      '/bulk-practice',
      '/admin'
    ],

    // 公开路由
    publicRoutes: [
      '/',
      '/login',
      '/register',
      '/about',
      '/help'
    ]
  },

  // ========== API访问控制 ==========
  apiAccessControl: {
    // 公开API（不需要认证）
    publicAPIs: [
      '/api/public/*',
      '/api/auth/login',
      '/api/auth/register',
      '/api/health',
      '/api/system/info'
    ],

    // 受保护的API（需要认证）
    protectedAPIs: [
      '/api/v2/user/*',
      '/api/v2/practice/*',
      '/api/v2/questions/*',
      '/api/v2/wrong-answers/*',
      '/api/v2/intelligent-review/*',
      '/api/v2/progress/*',
      '/api/v2/smart/*'
    ]
  },

  // ========== 错误处理配置 ==========
  errorHandling: {
    // 401未授权错误
    unauthorized: {
      message: '请先登录后使用此功能',
      redirectTo: '/login',
      showLoginButton: true
    },

    // 403禁止访问错误
    forbidden: {
      message: '您没有权限访问此功能',
      showContactSupport: true,
      supportEmail: 'support@example.com'
    },

    // 404未找到错误
    notFound: {
      message: '页面不存在',
      redirectToHome: true
    },

    // 通用错误
    generic: {
      message: '系统暂时不可用，请稍后重试',
      showRetryButton: true
    }
  },

  // ========== 安全显示规则 ==========
  displayRules: {
    // 未登录时的首页显示规则
    loggedOutHome: {
      showWelcome: true,
      showFeatures: true,
      showStats: true,        // 只显示脱敏统计
      showPracticeModes: true, // 显示练习模式列表（不可点击）
      showTestimonials: true,
      showCTA: true,          // 行动号召（注册/登录）
      hideUserStats: true,
      hideRecentActivity: true,
      hidePersonalizedContent: true
    },

    // 未登录时的导航栏显示规则
    loggedOutNavigation: {
      showLogo: true,
      showHomeLink: true,
      showAboutLink: true,
      showHelpLink: true,
      showLoginButton: true,
      showRegisterButton: true,
      hideUserMenu: true,
      hideLogoutButton: true,
      hideProtectedFeatures: true
    },

    // 错误页面显示规则
    errorPages: {
      showSupportInfo: true,
      showBackButton: true,
      showHomeButton: true,
      hideSensitiveInfo: true
    }
  },

  // ========== 输入验证配置 ==========
  inputValidation: {
    // 用户名验证
    username: {
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_]+$/,
      preventReserved: true,
      reservedNames: ['admin', 'root', 'system', 'api', 'www', 'mail']
    },

    // 密码验证
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventUserInfo: true
    },

    // 邮箱验证
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      requireVerification: true
    }
  },

  // ========== 速率限制配置 ==========
  rateLimiting: {
    // API调用速率限制
    apiCalls: {
      maxRequests: 100,
      perMilliseconds: 15 * 60 * 1000, // 15分钟
      showCountdown: true
    },

    // 登录尝试速率限制
    loginAttempts: {
      maxAttempts: 5,
      perMilliseconds: 15 * 60 * 1000,
      lockoutDuration: 30 * 60 * 1000 // 30分钟
    },

    // 注册尝试速率限制
    registrationAttempts: {
      maxAttempts: 3,
      perMilliseconds: 60 * 60 * 1000 // 1小时
    }
  },

  // ========== 安全提示信息 ==========
  securityMessages: {
    // 登录提示
    loginRequired: {
      title: '请先登录',
      message: '您需要登录后才能使用此功能',
      actions: ['立即登录', '注册账号']
    },

    // 权限不足提示
    insufficientPermissions: {
      title: '权限不足',
      message: '您当前没有权限访问此功能',
      actions: ['联系管理员', '查看权限说明']
    },

    // 会话过期提示
    sessionExpired: {
      title: '会话已过期',
      message: '您的登录已过期，请重新登录',
      actions: ['重新登录']
    }
  }
};

/**
 * 检查页面是否需要认证
 */
export function requiresAuth(page) {
  return securityConfig.protectedPages.some(protectedPage =>
    page.includes(protectedPage)
  );
}

/**
 * 检查路由是否为公开路由
 */
export function isPublicRoute(path) {
  return securityConfig.routeGuards.publicRoutes.some(publicRoute =>
    path === publicRoute || path.startsWith(publicRoute)
  );
}

/**
 * 获取未授权错误信息
 */
export function getUnauthorizedError() {
  return securityConfig.errorHandling.unauthorized;
}

/**
 * 获取禁止访问错误信息
 */
export function getForbiddenError() {
  return securityConfig.errorHandling.forbidden;
}

export default securityConfig;