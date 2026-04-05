/**
 * 安全Headers中间件 - 配置HTTP安全响应头
 * 防止XSS、点击劫持、MIME类型嗅探等攻击
 */

const securityConfig = require('../config/security-config');

/**
 * 安全Headers中间件
 */
function securityHeaders(req, res, next) {
  // Content Security Policy (CSP)
  res.setHeader('Content-Security-Policy', securityConfig.headers.contentSecurityPolicy);

  // HTTP Strict Transport Security (HSTS)
  if (securityConfig.https.hstsEnabled) {
    res.setHeader('Strict-Transport-Security', securityConfig.headers.hsts);
  }

  // X-Frame-Options - 防止点击劫持
  res.setHeader('X-Frame-Options', securityConfig.headers.xFrameOptions);

  // X-Content-Type-Options - 防止MIME类型嗅探
  res.setHeader('X-Content-Type-Options', securityConfig.headers.xContentTypeOptions);

  // X-XSS-Protection - XSS保护
  res.setHeader('X-XSS-Protection', securityConfig.headers.xXssProtection);

  // Referrer-Policy - Referrer信息控制
  res.setHeader('Referrer-Policy', securityConfig.headers.referrerPolicy);

  // Permissions-Policy - 功能权限控制
  res.setHeader('Permissions-Policy', securityConfig.headers.permissionsPolicy);

  // X-Permitted-Cross-Domain-Policies - 限制跨域策略
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Cache-Control for sensitive pages
  if (req.path.includes('/auth/') || req.path.includes('/api/auth/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Remove X-Powered-By header (hide Express information)
  res.removeHeader('X-Powered-By');

  // Add custom server header (avoid revealing specific version)
  res.setHeader('Server', 'SecureServer');

  next();
}

/**
 * CORS配置中间件
 */
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  // 检查来源是否在允许列表中
  const allowedOrigins = securityConfig.api.corsOrigins;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', securityConfig.api.corsMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', securityConfig.api.corsHeaders.join(', '));
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24小时

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}

/**
 * CSRF保护中间件
 */
function csrfProtection(req, res, next) {
  if (!securityConfig.csrf.enabled) {
    return next();
  }

  // 对于安全的方法（GET, HEAD, OPTIONS），跳过CSRF检查
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers[securityConfig.csrf.headerName];
  const cookieToken = req.cookies?.[securityConfig.csrf.cookieName];

  if (!token || !cookieToken || token !== cookieToken) {
    return res.status(403).json({
      error: 'CSRF token验证失败',
      message: '请求被拒绝，请刷新页面后重试'
    });
  }

  next();
}

/**
 * 生成CSRF Token
 */
function generateCsrfToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(securityConfig.csrf.tokenLength).toString('hex');
}

/**
 * 设置CSRF Token Cookie
 */
function setCsrfToken(req, res, next) {
  if (!securityConfig.csrf.enabled) {
    return next();
  }

  const token = generateCsrfToken();

  res.cookie(
    securityConfig.csrf.cookieName,
    token,
    {
      httpOnly: securityConfig.csrf.httpOnly,
      secure: securityConfig.csrf.secure,
      sameSite: securityConfig.csrf.sameSite,
      maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
  );

  // 将token添加到响应中，供前端使用
  res.csrfToken = token;

  next();
}

/**
 * 请求体大小限制
 */
function bodySizeLimit(req, res, next) {
  const maxSize = '10mb'; // 限制请求体大小为10MB

  // Express已经内置了body limiting，这里作为额外检查
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    return res.status(413).json({
      error: '请求体过大',
      message: '请求体大小不能超过10MB'
    });
  }

  next();
}

/**
 * 输入验证中间件
 */
function inputValidation(req, res, next) {
  // 检查请求头中的注入攻击
  const checkHeaders = ['user-agent', 'referer', 'x-forwarded-for'];
  for (const header of checkHeaders) {
    const value = req.headers[header];
    if (value && detectInjection(value)) {
      console.warn(`[SECURITY] 检测到可疑请求头: ${header}`);
      return res.status(400).json({
        error: '请求包含非法内容'
      });
    }
  }

  // 检查查询参数
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && detectInjection(value)) {
      console.warn(`[SECURITY] 检测到可疑查询参数: ${key}`);
      return res.status(400).json({
        error: '查询参数包含非法内容'
      });
    }
  }

  next();
}

/**
 * 检测SQL注入和XSS攻击模式
 */
function detectInjection(input) {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|SCRIPT|DECLARE)\b)/i,
    /(\b(OR|AND)\s+\w+\s*(=|<|>|!=))/i,
    /(<\s*script[^>]*>.*?<\s*\/\s*script\s*>)/gi,
    /(javascript\s*:)/gi,
    /(on\w+\s*=)/gi, // 事件处理器注入
    /(\b(eval|expression|setTimeout|setInterval)\s*\()/gi
  ];

  return dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * HTTPS重定向中间件
 */
function httpsRedirect(req, res, next) {
  if (!securityConfig.https.enabled || !securityConfig.https.redirectHttp) {
    return next();
  }

  // 检查是否已经是HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  // 重定向到HTTPS
  const httpsUrl = `https://${req.headers.host}${req.url}`;
  res.redirect(301, httpsUrl);
}

module.exports = {
  securityHeaders,
  corsMiddleware,
  csrfProtection,
  setCsrfToken,
  generateCsrfToken,
  bodySizeLimit,
  inputValidation,
  httpsRedirect
};