/**
 * 认证路由
 * 定义用户认证相关的 API 端点
 */

const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getCurrentUser,
    logout,
    changePassword
} = require('./auth-controller');
const { authenticateToken } = require('./auth-middleware');

/**
 * POST /api/auth/register
 * 用户注册
 * Body: { username, password, email?, display_name?, migrate_data? }
 */
router.post('/register', (req, res) => {
    register(router.pool, req, res);
});

/**
 * POST /api/auth/login
 * 用户登录
 * Body: { username, password }
 */
router.post('/login', (req, res) => {
    login(router.pool, req, res);
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 * Header: Authorization: Bearer <token>
 */
router.get('/me', authenticateToken, getCurrentUser);

/**
 * POST /api/auth/logout
 * 用户登出
 */
router.post('/logout', logout);

/**
 * POST /api/auth/change-password
 * 修改密码
 * Header: Authorization: Bearer <token>
 * Body: { old_password, new_password }
 */
router.post('/change-password', authenticateToken, (req, res) => {
    changePassword(router.pool, req, res);
});

module.exports = (pool) => {
    router.pool = pool;
    return router;
};
