/**
 * 公开API路由（无需认证）
 * 用于配置健康检查等公开端点
 */

const express = require('express');
const router = express.Router();

/**
 * 创建公开API路由
 *
 * @param {Object} pool - 数据库连接池
 * @returns {Router} Express路由器
 */
module.exports = (pool) => {
    // 将数据库连接池附加到路由器
    router.pool = pool;

    /**
     * GET /api/v2/public/admin-config/health
     * 配置健康检查
     */
    router.get('/admin-config/health', async (req, res) => {
        try {
            const { getInstance: getConfigManager } = require('./unified-core/admin-config');
            const configManager = getConfigManager(pool);

            const configs = await configManager.getAllConfigs();
            const configCount = Object.keys(configs).filter(k => !k.endsWith('_meta')).length;

            res.json({
                success: true,
                status: 'healthy',
                config_count: configCount,
                timestamp: Date.now()
            });
        } catch (error) {
            res.status(500).json({
                error: '配置健康检查失败',
                details: error.message
            });
        }
    });

    return router;
};
