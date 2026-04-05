/**
 * 公开访问控制中间件
 * 限制未登录用户的访问，减少信息暴露
 */

const publicAccessConfig = require('../config/public-access-config');

/**
 * 检查路径是否匹配模式
 */
function matchPath(path, pattern) {
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\//g, '\\/');
  return new RegExp(`^${regexPattern}$`).test(path);
}

/**
 * 检查是否为公开端点
 */
function isPublicEndpoint(req) {
  const { path, method } = req;

  // 检查精确匹配
  const exactMatch = publicAccessConfig.publicEndpoints.find(
    endpoint => endpoint.path === path && (endpoint.method === '*' || endpoint.method === method)
  );

  if (exactMatch) {
    return true;
  }

  // 检查模式匹配
  const patternMatch = publicAccessConfig.publicEndpoints.find(
    endpoint => matchPath(path, endpoint.path) && (endpoint.method === '*' || endpoint.method === method)
  );

  return !!patternMatch;
}

/**
 * 检查是否为受保护的端点
 */
function isProtectedEndpoint(req) {
  const { path } = req;

  return publicAccessConfig.protectedEndpoints.some(pattern =>
    matchPath(path, pattern)
  );
}

/**
 * 公开访问控制中间件
 * 允许公开端点，拒绝受保护的端点（未认证用户）
 */
function publicAccessControl(req, res, next) {
  const { path, method } = req;
  const isAuthorized = req.user && !req.user.isDefault;

  // 如果已登录（非默认用户），允许访问所有端点
  if (isAuthorized) {
    return next();
  }

  // 检查是否为公开端点
  if (isPublicEndpoint(req)) {
    return next();
  }

  // 受保护的端点需要认证
  if (isProtectedEndpoint(req)) {
    return res.status(401).json({
      error: '需要登录',
      message: '请先登录后访问此功能',
      code: 'AUTH_REQUIRED'
    });
  }

  // 未明确配置的端点，默认拒绝访问（安全优先）
  console.warn(`[SECURITY] 未配置的访问路径: ${method} ${path} from ${req.ip}`);
  return res.status(403).json({
    error: '访问被拒绝',
    message: '此功能暂不可用',
    code: 'ACCESS_DENIED'
  });
}

/**
 * 数据脱敏中间件
 * 对公开端点的响应数据进行脱敏处理
 */
function sanitizePublicData(req, res, next) {
  if (req.user && !req.user.isDefault) {
    // 已登录用户不需要脱敏
    return next();
  }

  // 拦截响应进行数据脱敏
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const sanitizedData = sanitizeResponseData(req.path, data);
    return originalJson(sanitizedData);
  };

  next();
}

/**
 * 对响应数据进行脱敏处理
 */
function sanitizeResponseData(path, data) {
  // 查找对应的脱敏配置
  const sanitizationConfig = Object.entries(publicAccessConfig.publicDataWithSanitization)
    .find(([configPath]) => matchPath(path, configPath));

  if (!sanitizationConfig) {
    return data;
  }

  const [_, config] = sanitizationConfig;

  // 如果数据是数组
  if (Array.isArray(data)) {
    return data.map(item => sanitizeObject(item, config.deniedFields));
  }

  // 如果数据是对象
  if (typeof data === 'object' && data !== null) {
    return sanitizeObject(data, config.deniedFields);
  }

  return data;
}

/**
 * 脱敏对象中的敏感字段
 */
function sanitizeObject(obj, deniedFields) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  deniedFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * 枚举攻击检测中间件
 */
function detectEnumerationAttack(req, res, next) {
  const { path, ip } = req;
  const suspiciousPaths = [
    '/api/v2/user/',
    '/api/v2/questions/',
    '/api/v2/stats/user/'
  ];

  // 检查是否为可疑的枚举路径
  const isSuspicious = suspiciousPaths.some(suspiciousPath =>
    path.startsWith(suspiciousPath)
  );

  if (isSuspicious && !req.user) {
    console.warn(`[SECURITY] 检测到可能的枚举攻击: ${path} from ${ip}`);

    return res.status(403).json({
      error: '访问被拒绝',
      message: '请先登录后访问',
      code: 'AUTH_REQUIRED'
    });
  }

  next();
}

/**
 * 错误信息优化中间件
 * 避免在错误响应中泄露系统信息
 */
function sanitizeErrorResponse(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const config = publicAccessConfig.errorResponses[isProduction ? 'production' : 'development'];

  // 捕获错误
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      const errorResponse = {
        error: '请求处理失败',
        message: config.genericMessage || '发生错误，请稍后重试',
        code: res.statusCode,
        timestamp: new Date().toISOString()
      };

      // 只在开发环境显示详细信息
      if (!isProduction || config.showDetails) {
        errorResponse.details = data;
      }

      return originalSend.call(res, JSON.stringify(errorResponse));
    }

    return originalSend.call(res, data);
  };

  next();
}

/**
 * 请求方法验证中间件
 * 只允许安全的HTTP方法
 */
function validateRequestMethod(req, res, next) {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];

  if (!allowedMethods.includes(req.method)) {
    console.warn(`[SECURITY] 不允许的HTTP方法: ${req.method} ${req.path} from ${req.ip}`);

    return res.status(405).json({
      error: '方法不允许',
      message: '此HTTP方法不被支持',
      allowedMethods: allowedMethods.filter(m => m !== 'OPTIONS')
    });
  }

  next();
}

/**
 * 请求头验证中间件
 * 检查可疑的请求头
 */
function validateRequestHeaders(req, res, next) {
  const suspiciousHeaders = [
    // 检测自动化工具
    /^python-/i,
    /^curl\//i,
    /^wget\//i,
    /^mozilla\/5\.0.*bot/i,
    /^.*scanner.*/i
  ];

  const userAgent = req.headers['user-agent'] || '';

  // 如果是OPTIONS预检请求，允许通过
  if (req.method === 'OPTIONS') {
    return next();
  }

  // 检查是否为可疑User-Agent
  const isSuspicious = suspiciousHeaders.some(pattern =>
    pattern.test(userAgent)
  );

  if (isSuspicious) {
    console.warn(`[SECURITY] 检测到可疑User-Agent: ${userAgent} from ${req.ip}`);

    // 对公开API端点仍然允许，但记录日志
    if (!isPublicEndpoint(req)) {
      return res.status(403).json({
        error: '访问被拒绝',
        message: '请使用正常的浏览器访问',
        code: 'SUSPICIOUS_CLIENT'
      });
    }
  }

  next();
}

/**
 * 输入验证中间件
 * 防止SQL注入、XSS等攻击
 */
function validateInput(req, res, next) {
  const validation = publicAccessConfig.validation.inputValidation;

  // 验证查询参数
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      // 检查长度
      if (value.length > validation.maxStringLength) {
        return res.status(400).json({
          error: '参数过长',
          message: '参数长度超过限制'
        });
      }

      // 检查SQL注入模式
      for (const pattern of validation.sqlInjectionPatterns) {
        if (pattern.test(value)) {
          console.warn(`[SECURITY] 检测到SQL注入尝试: ${key}=${value} from ${req.ip}`);
          return res.status(400).json({
            error: '非法参数',
            message: '参数包含非法内容'
          });
        }
      }

      // 检查XSS模式
      for (const pattern of validation.xssPatterns) {
        if (pattern.test(value)) {
          console.warn(`[SECURITY] 检测到XSS尝试: ${key}=${value} from ${req.ip}`);
          return res.status(400).json({
            error: '非法参数',
            message: '参数包含非法内容'
          });
        }
      }
    }
  }

  next();
}

/**
 * 安全日志中间件
 * 记录未授权访问尝试
 */
function securityLogging(req, res, next) {
  const startTime = Date.now();

  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { path, method, ip, user } = req;
    const statusCode = res.statusCode;

    // 记录401/403响应
    if (statusCode === 401 || statusCode === 403) {
      console.warn(`[SECURITY] 未授权访问: ${method} ${path} - ${statusCode} - ${ip} - ${duration}ms`);

      // TODO: 发送到安全监控系统
      logSecurityEvent({
        type: 'unauthorized_access',
        path,
        method,
        ip,
        userAgent: req.headers['user-agent'],
        statusCode,
        duration,
        timestamp: new Date().toISOString()
      });
    }

    // 记录慢请求（可能是DoS攻击）
    if (duration > 5000) {
      console.warn(`[SECURITY] 慢请求: ${method} ${path} - ${duration}ms from ${ip}`);
    }
  });

  next();
}

/**
 * 记录安全事件
 */
function logSecurityEvent(eventData) {
  // TODO: 发送到安全监控系统或数据库
  console.log(`[SECURITY_EVENT]:`, JSON.stringify(eventData));
}

module.exports = {
  publicAccessControl,
  isPublicEndpoint,
  isProtectedEndpoint,
  sanitizePublicData,
  detectEnumerationAttack,
  sanitizeErrorResponse,
  validateRequestMethod,
  validateRequestHeaders,
  validateInput,
  securityLogging,
  sanitizeResponseData
};