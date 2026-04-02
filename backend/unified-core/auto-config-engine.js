/**
 * 自动配置规则引擎
 * 根据用户行为数据自动调整系统配置
 */

const { getInstance: getConfigManager } = require('./admin-config');

/**
 * 自动配置规则引擎类
 */
class AutoConfigEngine {
    constructor(pool) {
        this.pool = pool;
        this.configManager = getConfigManager(pool);
        this.rules = [];
    }

    /**
     * 初始化自动配置规则
     */
    async initialize() {
        // 定义自动配置规则
        this.rules = [
            {
                id: 'auto_adjust_practice_scope',
                name: '自动调整练习范围',
                description: '根据用户正确率自动调整题目难度范围',
                enabled: false,
                trigger: 'practice_completion_rate',
                evaluate: this.evaluatePracticeScope.bind(this),
                execute: this.adjustPracticeScope.bind(this)
            },
            {
                id: 'auto_recommend_focus_area',
                name: '自动推荐重点领域',
                description: '根据用户薄弱环节自动推荐重点练习领域',
                enabled: false,
                trigger: 'weak_area_detection',
                evaluate: this.evaluateWeakArea.bind(this),
                execute: this.recommendFocusArea.bind(this)
            },
            {
                id: 'auto_optimize_review_schedule',
                name: '自动优化复习计划',
                description: '根据遗忘曲线自动优化复习计划',
                enabled: false,
                trigger: 'review_optimization',
                evaluate: this.evaluateReviewPlan.bind(this),
                execute: this.optimizeReviewPlan.bind(this)
            }
        ];

        // 加载规则配置
        await this.loadRulesConfig();
    }

    /**
     * 加载规则配置
     */
    async loadRulesConfig() {
        try {
            // 尝试从数据库加载规则配置
            const rulesConfig = await this.configManager.getConfig('auto_apply_supermemo');
            if (rulesConfig) {
                // 使用现有的自动配置作为全局开关
                const globalEnabled = rulesConfig.value_boolean;
                this.rules.forEach(rule => {
                    rule.enabled = globalEnabled;
                });
            }
        } catch (error) {
            console.warn('加载自动配置规则配置失败，使用默认配置:', error.message);
            // 使用默认配置（所有规则禁用）
            this.rules.forEach(rule => {
                rule.enabled = false;
            });
        }
    }

    /**
     * 评估是否需要调整练习范围
     */
    async evaluatePracticeScope(userId) {
        try {
            // 获取用户练习统计
            const stats = await this.getUserPracticeStats(userId);

            // 评估规则
            const evaluation = {
                shouldTrigger: false,
                confidence: 0,
                data: {}
            };

            // 规则1: 正确率过高(>85%)，需要增加难度
            if (stats.overallAccuracy > 85 && stats.totalPracticed > 50) {
                evaluation.shouldTrigger = true;
                evaluation.confidence = 0.8;
                evaluation.data.reason = '正确率过高，建议增加题目难度';
                evaluation.data.action = 'increase_difficulty';
            }

            // 规则2: 正确率过低(<60%)，需要降低难度
            if (stats.overallAccuracy < 60 && stats.totalPracticed > 20) {
                evaluation.shouldTrigger = true;
                evaluation.confidence = 0.9;
                evaluation.data.reason = '正确率较低，建议降低题目难度';
                evaluation.data.action = 'decrease_difficulty';
            }

            // 规则3: 某类别正确率特别低，需要重点强化
            const weakCategories = Object.entries(stats.categoryAccuracy)
                .filter(([cat, acc]) => acc < 50 && stats.totalPracticed > 10)
                .sort(([, a], [, b]) => a - b);

            if (weakCategories.length > 0) {
                evaluation.shouldTrigger = true;
                evaluation.confidence = 0.85;
                evaluation.data.weakCategories = weakCategories.map(([cat]) => cat);
                evaluation.data.reason = '发现薄弱知识点，需要重点强化';
                evaluation.data.action = 'focus_weak_categories';
            }

            return evaluation;
        } catch (error) {
            console.error('评估练习范围失败:', error);
            return { shouldTrigger: false, confidence: 0, data: {} };
        }
    }

    /**
     * 执行练习范围调整
     */
    async adjustPracticeScope(userId, evaluation) {
        try {
            const { action, weakCategories, reason } = evaluation.data;

            if (action === 'increase_difficulty') {
                // 增加难度：排除简单题目
                await this.adjustDifficultyForUser(userId, 'increase');
            } else if (action === 'decrease_difficulty') {
                // 降低难度：只使用简单题目
                await this.adjustDifficultyForUser(userId, 'decrease');
            } else if (action === 'focus_weak_categories' && weakCategories) {
                // 重点强化薄弱类别
                await this.focusOnWeakCategories(userId, weakCategories);
            }

            // 记录自动配置历史
            await this.recordAutoConfig(userId, 'practice_scope', evaluation);

            return { success: true, action };
        } catch (error) {
            console.error('调整练习范围失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 评估是否存在薄弱领域
     */
    async evaluateWeakArea(userId) {
        try {
            const stats = await this.getUserPracticeStats(userId);

            const evaluation = {
                shouldTrigger: false,
                confidence: 0,
                data: {}
            };

            // 检查是否有明显的薄弱领域
            const weakAreas = Object.entries(stats.categoryAccuracy)
                .filter(([cat, acc]) => acc < 60 && stats.totalPracticed > 10)
                .sort(([, a], [, b]) => a - b);

            if (weakAreas.length > 0) {
                evaluation.shouldTrigger = true;
                evaluation.confidence = 0.8;
                evaluation.data.weakAreas = weakAreas.map(([cat, acc]) => ({
                    category: cat,
                    accuracy: acc
                }));
                evaluation.data.reason = '发现薄弱领域需要加强';
            }

            return evaluation;
        } catch (error) {
            console.error('评估薄弱领域失败:', error);
            return { shouldTrigger: false, confidence: 0, data: {} };
        }
    }

    /**
     * 推荐重点领域
     */
    async recommendFocusArea(userId, evaluation) {
        try {
            const { weakAreas } = evaluation.data;

            if (!weakAreas || weakAreas.length === 0) {
                return { success: false, error: '没有发现薄弱领域' };
            }

            // 生成推荐配置
            const categories = weakAreas.slice(0, 3).map(area => area.category);

            // 更新练习配置
            await this.configManager.setConfig(
                'practice_question_scope',
                {
                    mode: 'category',
                    filters: {
                        categories: categories
                    }
                },
                'auto-config',
                '自动推荐重点领域'
            );

            // 记录推荐历史
            await this.recordAutoConfig(userId, 'focus_area', evaluation);

            return { success: true, categories };
        } catch (error) {
            console.error('推荐重点领域失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 评估复习计划
     */
    async evaluateReviewPlan(userId) {
        try {
            // 获取用户的复习数据
            const reviewData = await this.getUserReviewData(userId);

            const evaluation = {
                shouldTrigger: false,
                confidence: 0,
                data: {}
            };

            // 检查是否有需要复习但未复习的题目
            const dueReviews = reviewData.dueReviews || [];
            const overdueCount = dueReviews.filter(r => {
                const overdueTime = new Date(r.next_review_time) < new Date(Date.now() - 86400000); // 1天前
                return overdueTime;
            }).length;

            if (overdueCount > 10) {
                evaluation.shouldTrigger = true;
                evaluation.confidence = 0.9;
                evaluation.data.overdueCount = overdueCount;
                evaluation.data.reason = '有大量逾期未复习题目';
            }

            return evaluation;
        } catch (error) {
            console.error('评估复习计划失败:', error);
            return { shouldTrigger: false, confidence: 0, data: {} };
        }
    }

    /**
     * 优化复习计划
     */
    async optimizeReviewPlan(userId, evaluation) {
        try {
            // 调整SuperMemo参数以优化复习间隔
            await this.adjustSuperMemoParams(userId, evaluation);

            // 记录优化历史
            await this.recordAutoConfig(userId, 'review_plan', evaluation);

            return { success: true };
        } catch (error) {
            console.error('优化复习计划失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取用户练习统计
     */
    async getUserPracticeStats(userId) {
        const result = await this.pool.query(`
            SELECT
                COUNT(*) as total_practiced,
                COUNT(*) FILTER (WHERE is_correct = true) * 100.0 / COUNT(*) as overall_accuracy,
                COUNT(*) FILTER (WHERE is_correct = false) as wrong_count
            FROM practice_history
            WHERE user_id = $1
        `, [userId]);

        const row = result.rows[0];
        const stats = {
            totalPracticed: parseInt(row.total_practiced),
            overallAccuracy: parseFloat(row.overall_accuracy) || 0,
            wrongCount: parseInt(row.wrong_count)
        };

        // 获取各分类统计
        const categoryResult = await this.pool.query(`
            SELECT
                q.category,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE ph.is_correct = true) * 100.0 / COUNT(*) as accuracy
            FROM practice_history ph
            JOIN questions q ON ph.question_id = q.id
            WHERE ph.user_id = $1
            GROUP BY q.category
        `, [userId]);

        stats.categoryAccuracy = {};
        categoryResult.rows.forEach(row => {
            stats.categoryAccuracy[row.category] = parseFloat(row.accuracy);
        });

        return stats;
    }

    /**
     * 获取用户复习数据
     */
    async getUserReviewData(userId) {
        const result = await this.pool.query(`
            SELECT
                ph.question_id,
                ph.next_review_time,
                ph.is_correct,
                sm.mastery_level,
                sm.ease_factor
            FROM practice_history ph
            LEFT JOIN supermemo_data sm ON sm.question_id = ph.question_id AND sm.user_id = ph.user_id
            WHERE ph.user_id = $1
            ORDER BY ph.practiced_at DESC
        `, [userId]);

        const dueReviews = result.rows.filter(row => {
            return row.next_review_time && new Date(row.next_review_time) <= new Date();
        });

        return { dueReviews };
    }

    /**
     * 调整题目难度
     */
    async adjustDifficultyForUser(userId, direction) {
        try {
            // 获取当前配置
            const currentConfig = await this.configManager.getConfig('practice_question_scope');
            const currentMode = currentConfig?.mode || 'all';
            const currentFilters = currentConfig?.filters || {};

            let newConfig = {};

            if (direction === 'increase') {
                // 增加难度：排除正确率高的简单题目
                const easyQuestionIds = await this.getEasyQuestionIds(userId, 50);
                newConfig = {
                    mode: currentMode,
                    filters: {
                        ...currentFilters,
                        exclude_ids: [
                            ...(currentFilters.exclude_ids || []),
                            ...easyQuestionIds
                        ]
                    }
                };
            } else {
                // 降低难度：只使用正确率高的题目
                const easyQuestionIds = await this.getEasyQuestionIds(userId, 200);
                newConfig = {
                    mode: 'custom',
                    filters: {
                        question_ids: easyQuestionIds
                    }
                };
            }

            await this.configManager.setConfig(
                'practice_question_scope',
                newConfig,
                'auto-config',
                `自动${direction === 'increase' ? '增加' : '降低'}难度`
            );
        } catch (error) {
            console.error('调整难度失败:', error);
            throw error;
        }
    }

    /**
     * 重点强化薄弱类别
     */
    async focusOnWeakCategories(userId, categories) {
        try {
            const config = {
                mode: 'category',
                filters: {
                    categories: categories.slice(0, 3)
                }
            };

            await this.configManager.setConfig(
                'practice_question_scope',
                config,
                'auto-config',
                '重点强化薄弱类别'
            );
        } catch (error) {
            console.error('设置重点领域失败:', error);
            throw error;
        }
    }

    /**
     * 获取简单题目ID
     */
    async getEasyQuestionIds(userId, limit = 100) {
        const result = await this.pool.query(`
            SELECT DISTINCT ph.question_id
            FROM practice_history ph
            JOIN questions q ON ph.question_id = q.id
            WHERE ph.user_id = $1
              AND ph.is_correct = true
              AND ph.time_spent < (
                  SELECT AVG(time_spent) * 0.5
                  FROM practice_history
                  WHERE user_id = $1
              )
            ORDER BY ph.practiced_at DESC
            LIMIT $2
        `, [userId, limit]);

        return result.rows.map(row => row.question_id);
    }

    /**
     * 调整SuperMemo参数
     */
    async adjustSuperMemoParams(userId, evaluation) {
        // 根据用户表现调整SuperMemo算法参数
        // 这里可以实现更复杂的参数优化逻辑
        console.log(`为用户 ${userId} 优化SuperMemo参数`, evaluation.data);
    }

    /**
     * 记录自动配置历史
     */
    async recordAutoConfig(userId, configType, evaluation) {
        try {
            // 这里可以将自动配置记录保存到数据库
            // 方便后续审计和分析
            console.log(`记录自动配置: 用户=${userId}, 类型=${configType}`, evaluation.data);
        } catch (error) {
            console.error('记录自动配置历史失败:', error);
        }
    }

    /**
     * 运行自动配置评估
     */
    async runAutoEvaluation(userId, triggerType) {
        const results = [];

        for (const rule of this.rules) {
            if (!rule.enabled) continue;

            if (rule.trigger === triggerType) {
                const evaluation = await rule.evaluate(userId);
                if (evaluation.shouldTrigger) {
                    results.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    ...evaluation
                });
                }
            }
        }

        return results;
    }

    /**
     * 启用/禁用自动配置规则
     */
    async setRuleEnabled(ruleId, enabled) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = enabled;
        }

        // 保存到数据库
        await this.configManager.setConfig('auto_config_rules', {
            rules: this.rules.map(r => ({
                id: r.id,
                enabled: r.enabled
            }))
        }, 'system', '更新自动配置规则状态');
    }

    /**
     * 获取所有规则
     */
    getRules() {
        return this.rules;
    }
}

// 全局实例
let instance = null;

/**
 * 获取自动配置引擎实例
 */
function getInstance(pool) {
    if (!instance) {
        instance = new AutoConfigEngine(pool);
    }
    return instance;
}

module.exports = {
    AutoConfigEngine,
    getInstance
};
