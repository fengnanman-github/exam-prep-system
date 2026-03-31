/**
 * JWT 认证中间件
 * 提供 Token 生成、验证和三种认证中间件
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'exam-jwt-secret-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const DEFAULT_USER_ID = 'exam_user_001';

/**
 * 生成 JWT Token
 * @param {Object} user - 用户对象 { id, username, role }
 * @returns {string} JWT Token
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * 验证 JWT Token
 * @param {string} token - JWT Token
 * @returns {Object|null} 解码后的用户信息，验证失败返回 null
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * 强制认证中间件（需要登录）
 * 如果未提供 Token 或 Token 无效，返回 401/403 错误
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }

    const user = verifyToken(token);
    if (!user) {
        return res.status(403).json({ error: '无效的认证信息' });
    }

    req.user = user;
    req.isDefaultUser = false;
    next();
}

/**
 * 可选认证中间件（支持默认用户，保持向后兼容）
 * 如果已登录，使用登录用户；否则使用默认用户 exam_user_001
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        const user = verifyToken(token);
        if (user) {
            req.user = user;
            req.isDefaultUser = false;
            return next();
        }
    }

    // 未登录，使用默认用户
    req.user = { username: DEFAULT_USER_ID, role: 'user', isDefault: true };
    req.isDefaultUser = true;
    next();
}

/**
 * 管理员权限中间件
 * 验证用户是否为管理员角色
 */
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    authenticateToken,
    optionalAuth,
    requireAdmin,
    DEFAULT_USER_ID
};
