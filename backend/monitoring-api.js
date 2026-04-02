/**
 * 监控和分析API
 * 提供系统性能、错误和用户行为分析接口
 */

const express = require('express');
const performanceMonitor = require('./middleware/performance-monitor');
const errorTracker = require('./middleware/error-tracker');
const PracticeAnalytics = require('./analytics/practice-analytics');

/**
 * 创建监控和分析API路由
 */
module.exports = (pool) => {
    const router = express.Router();
    const analytics = new PracticeAnalytics(pool);

    /**
     * GET /api/v2/monitoring/performance
     * 获取性能报告
     */
    router.get('/performance', (req, res) => {
        try {
            const report = performanceMonitor.getReport();
            res.json({
                success: true,
                timestamp: new Date(),
                ...report
            });
        } catch (error) {
            console.error('获取性能报告失败:', error);
            res.status(500).json({
                error: '获取性能报告失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/monitoring/errors
     * 获取错误统计
     */
    router.get('/errors', (req, res) => {
        try {
            const stats = errorTracker.getStats();
            res.json({
                success: true,
                timestamp: new Date(),
                ...stats
            });
        } catch (error) {
            console.error('获取错误统计失败:', error);
            res.status(500).json({
                error: '获取错误统计失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/monitoring/health
     * 获取系统健康状态
     */
    router.get('/health', async (req, res) => {
        try {
            // 检查数据库连接
            const dbResult = await pool.query('SELECT 1');
            const dbHealthy = dbResult.rows.length > 0;

            // 获取性能统计
            const perfReport = performanceMonitor.getReport();
            const errorStats = errorTracker.getStats();

            // 计算健康评分
            const healthScore = calculateHealthScore(perfReport, errorStats, dbHealthy);

            res.json({
                success: true,
                timestamp: new Date(),
                health: {
                    score: healthScore,
                    status: getHealthStatus(healthScore),
                    checks: {
                        database: dbHealthy ? 'ok' : 'error',
                        performance: perfReport.summary.avgResponseTime,
                        errorRate: perfReport.summary.errorRate
                    }
                },
                performance: perfReport.summary,
                errors: errorStats.summary
            });
        } catch (error) {
            console.error('获取健康状态失败:', error);
            res.status(500).json({
                success: false,
                health: {
                    score: 0,
                    status: 'critical'
                },
                error: error.message
            });
        }
    });

    /**
     * GET /api/v2/monitoring/analytics/user/:userId
     * 获取用户行为分析
     */
    router.get('/analytics/user/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { timeRange = '7d' } = req.query;

            const stats = await analytics.getUserStats(userId, timeRange);

            res.json({
                success: true,
                userId,
                timeRange,
                ...stats
            });
        } catch (error) {
            console.error('获取用户分析失败:', error);
            res.status(500).json({
                error: '获取用户分析失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/monitoring/analytics/system
     * 获取系统行为分析
     */
    router.get('/analytics/system', async (req, res) => {
        try {
            const stats = await analytics.getSystemStats();

            res.json({
                success: true,
                timestamp: new Date(),
                ...stats
            });
        } catch (error) {
            console.error('获取系统分析失败:', error);
            res.status(500).json({
                error: '获取系统分析失败',
                details: error.message
            });
        }
    });

    /**
     * POST /api/v2/monitoring/analytics/track
     * 记录分析事件
     */
    router.post('/analytics/track', async (req, res) => {
        try {
            const { user_id, event_type, data } = req.body;

            let result;
            switch (event_type) {
                case 'mode_switch':
                    result = await analytics.recordModeSwitch(user_id, data.from, data.to);
                    break;
                case 'feature_usage':
                    result = await analytics.recordFeatureUsage(user_id, data.feature, data.details);
                    break;
                case 'practice_session':
                    result = await analytics.recordPracticeSession(user_id, data);
                    break;
                case 'version_switch':
                    result = await analytics.recordVersionSwitch(user_id, data.from, data.to);
                    break;
                default:
                    return res.status(400).json({ error: '无效的事件类型' });
            }

            res.json({
                success: true,
                event: result
            });
        } catch (error) {
            console.error('记录分析事件失败:', error);
            res.status(500).json({
                error: '记录分析事件失败',
                details: error.message
            });
        }
    });

    /**
     * DELETE /api/v2/monitoring/clear
     * 清除监控数据（需要管理员权限）
     */
    router.delete('/clear', (req, res) => {
        try {
            const { type } = req.query;

            switch (type) {
                case 'performance':
                    performanceMonitor.clear();
                    break;
                case 'errors':
                    errorTracker.clear();
                    break;
                case 'analytics':
                    analytics.clear();
                    break;
                case 'all':
                    performanceMonitor.clear();
                    errorTracker.clear();
                    analytics.clear();
                    break;
                default:
                    return res.status(400).json({ error: '无效的清除类型' });
            }

            res.json({
                success: true,
                message: `已清除${type || 'all'}数据`,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('清除监控数据失败:', error);
            res.status(500).json({
                error: '清除监控数据失败',
                details: error.message
            });
        }
    });

    return router;
};

/**
 * 计算健康评分
 */
function calculateHealthScore(perfReport, errorStats, dbHealthy) {
    let score = 100;

    // 数据库健康检查
    if (!dbHealthy) {
        score -= 50;
    }

    // 错误率检查
    const errorRate = parseFloat(perfReport.summary.errorRate) || 0;
    if (errorRate > 5) {
        score -= 30;
    } else if (errorRate > 1) {
        score -= 10;
    }

    // 响应时间检查
    const avgTime = parseInt(perfReport.summary.avgResponseTime) || 0;
    if (avgTime > 1000) {
        score -= 20;
    } else if (avgTime > 500) {
        score -= 10;
    }

    return Math.max(0, score);
}

/**
 * 获取健康状态
 */
function getHealthStatus(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
}
