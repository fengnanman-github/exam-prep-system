/**
 * 功能扩展API
 * 提供成就系统、学习提醒、数据导出等扩展功能
 */

const express = require('express');
const AchievementSystem = require('./unified-core/achievement-system');
const StudyReminder = require('./unified-core/study-reminder');
const DataExport = require('./unified-core/data-export');

/**
 * 创建功能扩展API路由
 */
module.exports = (pool) => {
    const router = express.Router();

    // 初始化功能模块
    const achievementSystem = new AchievementSystem(pool);
    const studyReminder = new StudyReminder(pool);
    const dataExport = new DataExport(pool);

    // ==================== 成就系统 API ====================

    /**
     * GET /api/v2/achievements/user/:userId
     * 获取用户成就
     */
    router.get('/achievements/user/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            // 检查并解锁新成就
            const newAchievements = await achievementSystem.checkUserAchievements(userId);

            // 获取用户所有成就
            const achievements = await achievementSystem.getUserAchievements(userId);

            // 获取成就统计
            const stats = await achievementSystem.getAchievementStats(userId);

            res.json({
                success: true,
                userId,
                achievements,
                stats,
                newAchievements
            });
        } catch (error) {
            console.error('获取用户成就失败:', error);
            res.status(500).json({
                error: '获取用户成就失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/achievements/all
     * 获取所有可用成就
     */
    router.get('/achievements/all', (req, res) => {
        try {
            const achievements = achievementSystem.getAllAchievements();
            res.json({
                success: true,
                achievements
            });
        } catch (error) {
            console.error('获取成就列表失败:', error);
            res.status(500).json({
                error: '获取成就列表失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/achievements/leaderboard
     * 获取排行榜
     */
    router.get('/achievements/leaderboard', async (req, res) => {
        try {
            const { type = 'achievements', limit = 10 } = req.query;

            const leaderboard = await achievementSystem.getLeaderboard(type, parseInt(limit));

            res.json({
                success: true,
                type,
                leaderboard
            });
        } catch (error) {
            console.error('获取排行榜失败:', error);
            res.status(500).json({
                error: '获取排行榜失败',
                details: error.message
            });
        }
    });

    // ==================== 学习提醒 API ====================

    /**
     * GET /api/v2/reminders/:userId
     * 获取用户提醒
     */
    router.get('/reminders/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            // 检查并创建提醒
            const reminders = await studyReminder.checkAndCreateReminders(userId);

            // 获取提醒设置
            const settings = await studyReminder.getReminderSettings(userId);

            res.json({
                success: true,
                userId,
                reminders,
                settings
            });
        } catch (error) {
            console.error('获取提醒失败:', error);
            res.status(500).json({
                error: '获取提醒失败',
                details: error.message
            });
        }
    });

    /**
     * PUT /api/v2/reminders/:userId/settings
     * 更新提醒设置
     */
    router.put('/reminders/:userId/settings', async (req, res) => {
        try {
            const { userId } = req.params;
            const { settings } = req.body;

            await studyReminder.updateReminderSettings(userId, settings);

            res.json({
                success: true,
                message: '提醒设置已更新'
            });
        } catch (error) {
            console.error('更新提醒设置失败:', error);
            res.status(500).json({
                error: '更新提醒设置失败',
                details: error.message
            });
        }
    });

    /**
     * POST /api/v2/reminders/:userId/send
     * 发送提醒通知
     */
    router.post('/reminders/:userId/send', async (req, res) => {
        try {
            const { userId } = req.params;
            const { reminder } = req.body;

            await studyReminder.sendReminder(userId, reminder);

            res.json({
                success: true,
                message: '提醒已发送'
            });
        } catch (error) {
            console.error('发送提醒失败:', error);
            res.status(500).json({
                error: '发送提醒失败',
                details: error.message
            });
        }
    });

    // ==================== 数据导出 API ====================

    /**
     * GET /api/v2/export/:userId/:exportType
     * 导出用户数据
     */
    router.get('/export/:userId/:exportType', async (req, res) => {
        try {
            const { userId, exportType } = req.params;
            const { format = 'json' } = req.query;

            // 导出数据
            const exportData = await dataExport.exportUserData(userId, exportType, format);

            // 记录导出历史
            await dataExport.recordExportHistory(userId, exportType, format);

            // 根据格式返回数据
            if (format === 'csv') {
                const csv = dataExport.convertToCSV(exportData.data);
                const fileName = dataExport.generateFileName(userId, exportType, 'csv');
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.send(csv);
            } else {
                res.json({
                    success: true,
                    ...exportData
                });
            }
        } catch (error) {
            console.error('导出数据失败:', error);
            res.status(500).json({
                error: '导出数据失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/export/:userId/history
     * 获取导出历史
     */
    router.get('/export/:userId/history', async (req, res) => {
        try {
            const { userId } = req.params;
            const { limit = 20 } = req.query;

            const history = await dataExport.getExportHistory(userId, parseInt(limit));

            res.json({
                success: true,
                userId,
                history
            });
        } catch (error) {
            console.error('获取导出历史失败:', error);
            res.status(500).json({
                error: '获取导出历史失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/export/formats
     * 获取支持的导出格式
     */
    router.get('/export/formats', (req, res) => {
        try {
            res.json({
                success: true,
                formats: dataExport.supportedFormats,
                types: dataExport.exportTypes
            });
        } catch (error) {
            console.error('获取导出格式失败:', error);
            res.status(500).json({
                error: '获取导出格式失败',
                details: error.message
            });
        }
    });

    return router;
};
