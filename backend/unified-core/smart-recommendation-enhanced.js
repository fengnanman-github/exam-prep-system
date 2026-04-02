/**
 * 智能推荐增强API
 * 基于用户行为数据提供个性化推荐和自动配置
 */

const express = require('express');
const { getInstance: getConfigManager } = require('./admin-config');
const { getInstance: getAutoConfigEngine } = require('./auto-config-engine');

/**
 * 创建智能推荐增强API路由
 */
module.exports = (pool) => {
    const router = express.Router();
    const configManager = getConfigManager(pool);
    const autoConfigEngine = getAutoConfigEngine(pool);

    // 初始化自动配置引擎
    autoConfigEngine.initialize().catch(err => {
        console.error('初始化自动配置引擎失败:', err);
    });

    /**
     * GET /api/v2/smart/personalized-recommendations
     * 获取个性化推荐
     */
    router.get('/personalized-recommendations', async (req, res) => {
        try {
            const { user_id } = req.query;

            if (!user_id) {
                return res.status(400).json({ error: '缺少user_id参数' });
            }

            const recommendations = await generatePersonalizedRecommendations(pool, user_id);

            res.json({
                success: true,
                user_id,
                recommendations,
                generated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('生成个性化推荐失败:', error);
            res.status(500).json({
                error: '生成个性化推荐失败',
                details: error.message
            });
        }
    });

    /**
     * POST /api/v2/smart/auto-configure
     * 触发自动配置
     */
    router.post('/auto-configure', async (req, res) => {
        try {
            const { user_id, trigger_type } = req.body;

            if (!user_id) {
                return res.status(400).json({ error: '缺少user_id参数' });
            }

            // 运行自动配置评估
            const results = await autoConfigEngine.runAutoEvaluation(user_id, trigger_type);

            // 自动执行高置信度的推荐
            const executed = [];
            for (const result of results) {
                if (result.confidence > 0.8 && result.rule.execute) {
                    const executionResult = await result.rule.execute(user_id, result);
                    executed.push({
                        ruleId: result.ruleId,
                        ruleName: result.ruleName,
                        execution: executionResult
                    });
                }
            }

            res.json({
                success: true,
                user_id,
                evaluations: results,
                executed,
                message: `发现 ${results.length} 个配置建议，已执行 ${executed.length} 个`
            });
        } catch (error) {
            console.error('触发自动配置失败:', error);
            res.status(500).json({
                error: '触发自动配置失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/smart/auto-rules
     * 获取自动配置规则列表
     */
    router.get('/auto-rules', async (req, res) => {
        try {
            const rules = autoConfigEngine.getRules();

            res.json({
                success: true,
                rules: rules.map(r => ({
                    id: r.id,
                    name: r.name,
                    description: r.description,
                    enabled: r.enabled,
                    trigger: r.trigger
                }))
            });
        } catch (error) {
            console.error('获取自动规则失败:', error);
            res.status(500).json({
                error: '获取自动规则失败',
                details: error.message
            });
        }
    });

    /**
     * PUT /api/v2/smart/auto-rules/:ruleId
     * 启用/禁用自动规则
     */
    router.put('/auto-rules/:ruleId', async (req, res) => {
        try {
            const { ruleId } = req.params;
            const { enabled } = req.body;

            if (typeof enabled !== 'boolean') {
                return res.status(400).json({ error: 'enabled参数必须是布尔值' });
            }

            await autoConfigEngine.setRuleEnabled(ruleId, enabled);

            res.json({
                success: true,
                ruleId,
                enabled,
                message: `规则${enabled ? '已启用' : '已禁用'}`
            });
        } catch (error) {
            console.error('更新自动规则失败:', error);
            res.status(500).json({
                error: '更新自动规则失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/smart/learning-path
     * 获取学习路径推荐
     */
    router.get('/learning-path', async (req, res) => {
        try {
            const { user_id } = req.query;

            if (!user_id) {
                return res.status(400).json({ error: '缺少user_id参数' });
            }

            const learningPath = await generateLearningPath(pool, user_id);

            res.json({
                success: true,
                user_id,
                learning_path: learningPath
            });
        } catch (error) {
            console.error('生成学习路径失败:', error);
            res.status(500).json({
                error: '生成学习路径失败',
                details: error.message
            });
        }
    });

    /**
     * GET /api/v2/smart/study-plan
     * 获取学习计划建议
     */
    router.get('/study-plan', async (req, res) => {
        try {
            const { user_id, time_available } = req.query;

            if (!user_id) {
                return res.status(400).json({ error: '缺少user_id参数' });
            }

            const studyPlan = await generateStudyPlan(pool, user_id, time_available);

            res.json({
                success: true,
                user_id,
                study_plan
            });
        } catch (error) {
            console.error('生成学习计划失败:', error);
            res.status(500).json({
                error: '生成学习计划失败',
                details: error.message
            });
        }
    });

    return router;
};

/**
 * 生成个性化推荐
 */
async function generatePersonalizedRecommendations(pool, userId) {
    // 获取用户统计数据
    const stats = await getUserStats(pool, userId);

    const recommendations = [];

    // 1. 根据薄弱知识点推荐
    const weakCategories = stats.categoryAccuracy
        .filter(([cat, acc]) => acc < 70)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 3);

    if (weakCategories.length > 0) {
        recommendations.push({
            type: 'focus_weak_areas',
            title: '加强薄弱知识点',
            description: '您在以下知识点正确率较低，建议重点练习',
            data: {
                categories: weakCategories.map(([cat, acc]) => ({ category: cat, accuracy: acc })),
                action: 'practice',
                priority: 'high'
            }
        });
    }

    // 2. 推荐复习即将到期的题目
    const dueReviews = await getDueReviews(pool, userId);
    if (dueReviews.length > 0) {
        recommendations.push({
            type: 'review_due',
            title: '复习即将到期',
            description: `有 ${dueReviews.length} 道题目需要复习`,
            data: {
                count: dueReviews.length,
                question_ids: dueReviews.slice(0, 10).map(r => r.question_id)
            },
            action: 'review',
            priority: dueReviews.length > 20 ? 'high' : 'medium'
        });
    }

    // 3. 推荐新的学习内容
    const learnedCategories = Object.keys(stats.categoryAccuracy);
    if (learnedCategories.length > 0 && learnedCategories.length < stats.totalCategories) {
        const newCategories = await getNewCategories(pool, learnedCategories);
        if (newCategories.length > 0) {
            recommendations.push({
                type: 'explore_new_content',
                title: '探索新内容',
                description: '建议学习新的知识点',
                data: {
                    categories: newCategories.slice(0, 3)
                },
                action: 'explore',
                priority: 'low'
            });
        }
    }

    return recommendations;
}

/**
 * 生成学习路径
 */
async function generateLearningPath(pool, userId) {
    const stats = await getUserStats(pool, userId);

    // 根据用户当前水平生成学习路径
    const path = {
        current_level: calculateLevel(stats),
        next_steps: [],
        estimated_completion: null
    };

    // 根据掌握程度规划下一步
    if (stats.overallAccuracy < 60) {
        path.next_steps.push({
            phase: '基础巩固',
            focus: '基础题目练习',
            target_accuracy: 75,
            estimated_time: '2周'
        });
    } else if (stats.overallAccuracy < 80) {
        path.next_steps.push({
            phase: '强化提升',
            focus: '重点难点攻克',
            target_accuracy: 85,
            estimated_time: '3周'
        });
    } else {
        path.next_steps.push({
            phase: '考前冲刺',
            focus: '全真模拟',
            target_accuracy: 90,
            estimated_time: '1周'
        });
    }

    return path;
}

/**
 * 生成学习计划
 */
async function generateStudyPlan(pool, userId, timeAvailable) {
    const stats = await getUserStats(pool, userId);

    const timeInMinutes = parseInt(timeAvailable) || 60; // 默认60分钟

    // 根据可用时间和用户水平生成学习计划
    const plan = {
        total_time: timeInMinutes,
        sessions: []
    };

    // 基础练习 (40%)
    plan.sessions.push({
        type: 'practice',
        name: '基础练习',
        duration: Math.floor(timeInMinutes * 0.4),
        question_count: Math.floor(timeInMinutes * 0.4 / 0.6),
        focus: '全题库随机练习'
    });

    // 薄弱环节 (30%)
    const weakCategories = stats.categoryAccuracy
        .filter(([cat, acc]) => acc < 70)
        .map(([cat]) => cat);

    if (weakCategories.length > 0) {
        plan.sessions.push({
            type: 'category_practice',
            name: '薄弱环节强化',
            duration: Math.floor(timeInMinutes * 0.3),
            focus: weakCategories.slice(0, 2)
        });
    }

    // 复习 (30%)
    plan.sessions.push({
        type: 'review',
        name: '复习巩固',
        duration: Math.floor(timeInMinutes * 0.3),
        focus: '即将到期的复习题目'
    });

    return plan;
}

/**
 * 获取用户统计数据
 */
async function getUserStats(pool, userId) {
    // 获取练习统计
    const practiceResult = await pool.query(`
        SELECT
            COUNT(*) as total_practiced,
            COUNT(*) FILTER (WHERE is_correct = true) * 100.0 / COUNT(*) as overall_accuracy
        FROM practice_history
        WHERE user_id = $1
    `, [userId]);

    // 获取分类统计
    const categoryResult = await pool.query(`
        SELECT
            q.category,
            COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
        FROM practice_history ph
        JOIN questions q ON ph.question_id = q.id
        WHERE ph.user_id = $1
        GROUP BY q.category
    `, [userId]);

    // 获取总分类数
    const totalCategoriesResult = await pool.query(`
        SELECT COUNT(DISTINCT category) as count
        FROM questions
    `);

    const stats = {
        totalPracticed: parseInt(practiceResult.rows[0].total_practiced),
        overallAccuracy: parseFloat(practiceResult.rows[0].overall_accuracy) || 0,
        categoryAccuracy: {}
    };

    categoryResult.rows.forEach(row => {
        stats.categoryAccuracy[row.category] = parseFloat(row.percentage);
    });

    stats.totalCategories = parseInt(totalCategoriesResult.rows[0].count);

    return stats;
}

/**
 * 计算用户水平
 */
function calculateLevel(stats) {
    if (stats.overallAccuracy < 50) return 'beginner';
    if (stats.overallAccuracy < 70) return 'intermediate';
    if (stats.overallAccuracy < 85) return 'advanced';
    return 'expert';
}

/**
 * 获取需要复习的题目
 */
async function getDueReviews(pool, userId) {
    const result = await pool.query(`
        SELECT DISTINCT ph.question_id, ph.next_review_time
        FROM practice_history ph
        LEFT JOIN supermemo_data sm ON sm.question_id = ph.question_id AND sm.user_id = ph.user_id
        WHERE ph.user_id = $1
          AND sm.next_review_time IS NOT NULL
          AND sm.next_review_time <= NOW()
        ORDER BY sm.next_review_time ASC
        LIMIT 50
    `, [userId]);

    return result.rows;
}

/**
 * 获取新的分类
 */
async function getNewCategories(pool, learnedCategories) {
    const result = await pool.query(`
        SELECT DISTINCT category
        FROM questions
        WHERE category IS NOT NULL
          AND category NOT IN (ARRAY[$1]::text[])
        ORDER BY category
        LIMIT 10
    `, [learnedCategories]);

    return result.rows.map(row => row.category);
}
