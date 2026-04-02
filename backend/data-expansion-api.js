/**
 * 数据扩充API
 * 提供题库统计、数据质量检查、扩充建议等功能
 */

const express = require('express');
const DataAnalytics = require('./unified-core/data-analytics');

/**
 * 创建数据扩充API路由
 */
module.exports = (pool) => {
    const router = express.Router();
    const dataAnalytics = new DataAnalytics(pool);

    // ==================== 题库统计API ====================

    /**
     * GET /api/v2/data/stats/overview
     * 获取题库统计概览
     */
    router.get('/stats/overview', async (req, res) => {
        try {
            const stats = await dataAnalytics.getQuestionStatsOverview();
            res.json({
                success: true,
                timestamp: new Date(),
                ...stats
            });
        } catch (error) {
            console.error('获取题库统计失败:', error);
            res.status(500).json({
                error: '获取题库统计失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/data/stats/coverage/:userId
     * 分析用户题目覆盖率
     */
    router.get('/stats/coverage/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const coverage = await dataAnalytics.analyzeCoverage(userId);
            res.json({
                success: true,
                ...coverage
            });
        } catch (error) {
            console.error('分析覆盖率失败:', error);
            res.status(500).json({
                error: '分析覆盖率失败',
                details: error.message
            });
        }
    });

    // ==================== 数据质量检查API ====================

    /**
     * GET /api/v2/data/quality/check
     * 检查数据质量问题
     */
    router.get('/quality/check', async (req, res) => {
        try {
            const qualityReport = await dataAnalytics.checkDataQuality();
            res.json({
                success: true,
                timestamp: new Date(),
                ...qualityReport
            });
        } catch (error) {
            console.error('数据质量检查失败:', error);
            res.status(500).json({
                error: '数据质量检查失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/data/quality/issues
     * 获取详细的数据质量问题列表
     */
    router.get('/quality/issues', async (req, res) => {
        try {
            const { type } = req.query;
            const qualityReport = await dataAnalytics.checkDataQuality();

            let issues = qualityReport.issues;
            if (type) {
                issues = issues.filter(issue => issue.type === type);
            }

            res.json({
                success: true,
                type,
                count: issues.length,
                issues
            });
        } catch (error) {
            console.error('获取数据质量问题失败:', error);
            res.status(500).json({
                error: '获取数据质量问题失败',
                details: error.message
            });
        }
    });

    // ==================== 数据扩充建议API ====================

    /**
     * GET /api/v2/data/expansion/recommendations
     * 获取数据扩充建议
     */
    router.get('/expansion/recommendations', async (req, res) => {
        try {
            const recommendations = await dataAnalytics.generateExpansionRecommendations();
            res.json({
                success: true,
                timestamp: new Date(),
                count: recommendations.length,
                recommendations
            });
        } catch (error) {
            console.error('获取扩充建议失败:', error);
            res.status(500).json({
                error: '获取扩充建议失败',
                details: error.message
            });
        }
    });

    // ==================== 学习资源推荐API ====================

    /**
     * GET /api/v2/data/resources/:userId
     * 获取学习资源推荐
     */
    router.get('/resources/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const recommendations = await dataAnalytics.getResourceRecommendations(userId);
            res.json({
                success: true,
                userId,
                recommendations
            });
        } catch (error) {
            console.error('获取资源推荐失败:', error);
            res.status(500).json({
                error: '获取资源推荐失败',
                details: error.message
            });
        }
    });

    // ==================== 模拟考试生成API ====================

    /**
     * POST /api/v2/data/mock-exam/generate
     * 生成模拟考试
     */
    router.post('/mock-exam/generate', async (req, res) => {
        try {
            const config = req.body;
            const mockExam = await dataAnalytics.generateMockExam(config);
            res.json({
                success: true,
                timestamp: new Date(),
                ...mockExam
            });
        } catch (error) {
            console.error('生成模拟考试失败:', error);
            res.status(500).json({
                error: '生成模拟考试失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/data/mock-exam/configs
     * 获取预设的模拟考试配置
     */
    router.get('/mock-exam/configs', (req, res) => {
        try {
            const configs = [
                {
                    name: '标准模拟考试',
                    description: '100题，按照标准考试比例分配',
                    config: {
                        totalQuestions: 100,
                        distribution: {
                            singleChoice: 0.4,
                            multiChoice: 0.3,
                            judgment: 0.3
                        },
                        difficulty: 'mixed'
                    }
                },
                {
                    name: '快速测试',
                    description: '50题，快速检测学习效果',
                    config: {
                        totalQuestions: 50,
                        distribution: {
                            singleChoice: 0.5,
                            multiChoice: 0.25,
                            judgment: 0.25
                        },
                        difficulty: 'mixed'
                    }
                },
                {
                    name: '专项练习-密码算法',
                    description: '重点练习密码算法相关题目',
                    config: {
                        totalQuestions: 30,
                        distribution: {
                            singleChoice: 0.4,
                            multiChoice: 0.3,
                            judgment: 0.3
                        },
                        categories: ['密码算法'],
                        difficulty: 'mixed'
                    }
                },
                {
                    name: '专项练习-密码管理',
                    description: '重点练习密码管理相关题目',
                    config: {
                        totalQuestions: 30,
                        distribution: {
                            singleChoice: 0.4,
                            multiChoice: 0.3,
                            judgment: 0.3
                        },
                        categories: ['密码管理'],
                        difficulty: 'mixed'
                    }
                }
            ];

            res.json({
                success: true,
                configs
            });
        } catch (error) {
            console.error('获取模拟考试配置失败:', error);
            res.status(500).json({
                error: '获取模拟考试配置失败',
                details: error.message
            });
        }
    });

    // ==================== 数据导入导出API ====================

    /**
     * POST /api/v2/data/import/questions
     * 导入题目数据（需要管理员权限）
     */
    router.post('/import/questions', async (req, res) => {
        try {
            const { questions } = req.body;

            if (!Array.isArray(questions) || questions.length === 0) {
                return res.status(400).json({ error: '题目数据格式错误' });
            }

            let imported = 0;
            let failed = 0;

            for (const question of questions) {
                try {
                    await this.pool.query(`
                        INSERT INTO questions (
                            question_no, question_type, question_text,
                            option_a, option_b, option_c, option_d,
                            correct_answer, explanation, category, exam_category
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `, [
                        question.question_no,
                        question.question_type,
                        question.question_text,
                        question.option_a,
                        question.option_b,
                        question.option_c,
                        question.option_d,
                        question.correct_answer,
                        question.explanation,
                        question.category,
                        question.exam_category
                    ]);
                    imported++;
                } catch (error) {
                    console.error('导入题目失败:', error);
                    failed++;
                }
            }

            res.json({
                success: true,
                imported,
                failed,
                total: questions.length
            });
        } catch (error) {
            console.error('导入题目失败:', error);
            res.status(500).json({
                error: '导入题目失败',
                details: error.message
            });
        }
    });

    return router;
};
