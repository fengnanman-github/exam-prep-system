/**
 * 统一状态API
 * 提供统一的题目状态查询和更新接口
 */

const express = require('express');
const { getInstance: getVersionManager } = require('./version-manager');

/**
 * 创建统一状态路由
 *
 * @param {Object} pool - 数据库连接池
 * @returns {Router} Express路由
 */
module.exports = (pool) => {
    const router = express.Router();
    const versionManager = getVersionManager(pool);

    /**
     * 获取用户题目统一状态
     * GET /api/v2/unified/state
     *
     * 查询参数:
     * - user_id: 用户ID
     * - question_ids: 题目ID数组（逗号分隔）
     * - exam_category: 考试类别（可选，用于筛选）
     *
     * 返回题目列表及其统一状态
     */
    router.get('/state', async (req, res) => {
        try {
            const { user_id, question_ids, exam_category } = req.query;

            if (!user_id) {
                return res.status(400).json({ error: '缺少user_id参数' });
            }

            // 检查用户是否有权访问统一状态功能
            const hasAccess = await versionManager.isFeatureEnabled('unifiedState', user_id);
            if (!hasAccess) {
                return res.status(403).json({
                    error: '功能未启用',
                    message: '统一状态功能暂未对您开放'
                });
            }

            // 设置当前用户ID（用于视图查询）
            await pool.query('SELECT set_current_user($1)', [user_id]);

            let query = '';
            let params = [];

            if (question_ids) {
                // 查询指定题目的状态
                const ids = question_ids.split(',').map(id => parseInt(id.trim()));
                query = `
                    SELECT
                        id,
                        question_no,
                        question_text,
                        question_type,
                        category,
                        exam_category,
                        law_category,
                        tech_category,
                        difficulty,
                        knowledge_point,
                        practice_status,
                        mastery_status,
                        review_status,
                        is_wrong,
                        is_uncertain,
                        is_favorite,
                        mastery_level,
                        ease_factor,
                        review_interval,
                        next_review_time,
                        practice_count,
                        correct_count,
                        wrong_count,
                        error_rate,
                        last_practice_time
                    FROM v_unified_question_status
                    WHERE id = ANY($1)
                    ORDER BY id
                `;
                params = [ids];
            } else if (exam_category) {
                // 按考试类别查询
                query = `
                    SELECT
                        id,
                        question_no,
                        question_text,
                        question_type,
                        category,
                        exam_category,
                        law_category,
                        tech_category,
                        difficulty,
                        knowledge_point,
                        practice_status,
                        mastery_status,
                        review_status,
                        is_wrong,
                        is_uncertain,
                        is_favorite,
                        mastery_level,
                        next_review_time,
                        practice_count,
                        error_rate
                    FROM v_unified_question_status
                    WHERE exam_category = $1
                    ORDER BY
                        CASE review_status
                            WHEN 'due' THEN 1
                            WHEN 'scheduled' THEN 2
                            ELSE 3
                        END,
                        mastery_level ASC
                `;
                params = [exam_category];
            } else {
                return res.status(400).json({ error: '请提供question_ids或exam_category参数' });
            }

            const result = await pool.query(query, params);

            // 分类统计
            const stats = {
                total: result.rows.length,
                practiced: result.rows.filter(r => r.practice_status === 'practiced').length,
                new: result.rows.filter(r => r.practice_status === 'new').length,
                mastered: result.rows.filter(r => r.mastery_status === 'mastered').length,
                learning: result.rows.filter(r => r.mastery_status === 'learning').length,
                struggling: result.rows.filter(r => r.mastery_status === 'struggling').length,
                due_review: result.rows.filter(r => r.review_status === 'due').length,
                wrong: result.rows.filter(r => r.is_wrong).length,
                uncertain: result.rows.filter(r => r.is_uncertain).length,
                favorite: result.rows.filter(r => r.is_favorite).length
            };

            res.json({
                questions: result.rows,
                stats
            });
        } catch (error) {
            console.error('获取题目状态失败:', error);
            res.status(500).json({ error: '获取题目状态失败', details: error.message });
        }
    });

    /**
     * 批量获取题目状态
     * POST /api/v2/unified/state/batch
     *
     * 请求体:
     * {
     *   user_id: string,
     *   question_ids: number[],
     *   exam_category?: string
     * }
     */
    router.post('/state/batch', async (req, res) => {
        try {
            const { user_id, question_ids, exam_category } = req.body;

            if (!user_id) {
                return res.status(400).json({ error: '缺少user_id参数' });
            }

            // 检查用户是否有权访问统一状态功能
            const hasAccess = await versionManager.isFeatureEnabled('unifiedState', user_id);
            if (!hasAccess) {
                return res.status(403).json({
                    error: '功能未启用',
                    message: '统一状态功能暂未对您开放'
                });
            }

            // 设置当前用户ID
            await pool.query('SELECT set_current_user($1)', [user_id]);

            let query = '';
            let params = [];

            if (question_ids && question_ids.length > 0) {
                query = `
                    SELECT * FROM v_unified_question_status
                    WHERE id = ANY($1)
                    ORDER BY id
                `;
                params = [question_ids];
            } else if (exam_category) {
                query = `
                    SELECT * FROM v_unified_question_status
                    WHERE exam_category = $1
                    ORDER BY id
                `;
                params = [exam_category];
            } else {
                return res.status(400).json({ error: '请提供question_ids或exam_category参数' });
            }

            const result = await pool.query(query, params);

            res.json({
                questions: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('批量获取题目状态失败:', error);
            res.status(500).json({ error: '批量获取题目状态失败', details: error.message });
        }
    });

    /**
     * 更新题目状态（不确定、收藏）
     * PUT /api/v2/unified/state/:questionId
     *
     * 请求体:
     * {
     *   user_id: string,
     *   is_uncertain?: boolean,
     *   uncertain_reason?: string,
     *   is_favorite?: boolean,
     *   favorite_notes?: string
     * }
     */
    router.put('/state/:questionId', async (req, res) => {
        try {
            const { questionId } = req.params;
            const { user_id, is_uncertain, uncertain_reason, is_favorite, favorite_notes } = req.body;

            if (!user_id) {
                return res.status(400).json({ error: '缺少user_id参数' });
            }

            // 检查用户是否有权访问统一状态功能
            const hasAccess = await versionManager.isFeatureEnabled('unifiedState', user_id);
            if (!hasAccess) {
                return res.status(403).json({
                    error: '功能未启用',
                    message: '统一状态功能暂未对您开放'
                });
            }

            const updates = [];

            // 更新不确定标记
            if (is_uncertain !== undefined) {
                if (is_uncertain) {
                    // 添加或更新不确定标记
                    await pool.query(`
                        INSERT INTO uncertain_questions (user_id, question_id, uncertain_reason)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (user_id, question_id)
                        DO UPDATE SET
                            uncertain_reason = EXCLUDED.uncertain_reason,
                            updated_at = CURRENT_TIMESTAMP
                    `, [user_id, questionId, uncertain_reason || null]);
                    updates.push({ field: 'is_uncertain', value: true });
                } else {
                    // 删除不确定标记
                    await pool.query(`
                        DELETE FROM uncertain_questions
                        WHERE user_id = $1 AND question_id = $2
                    `, [user_id, questionId]);
                    updates.push({ field: 'is_uncertain', value: false });
                }
            }

            // 更新收藏标记
            if (is_favorite !== undefined) {
                if (is_favorite) {
                    // 添加或更新收藏
                    await pool.query(`
                        INSERT INTO favorite_questions (user_id, question_id, notes)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (user_id, question_id)
                        DO UPDATE SET
                            notes = EXCLUDED.notes,
                            created_at = CURRENT_TIMESTAMP
                    `, [user_id, questionId, favorite_notes || null]);
                    updates.push({ field: 'is_favorite', value: true });
                } else {
                    // 删除收藏
                    await pool.query(`
                        DELETE FROM favorite_questions
                        WHERE user_id = $1 AND question_id = $2
                    `, [user_id, questionId]);
                    updates.push({ field: 'is_favorite', value: false });
                }
            }

            // 获取更新后的状态
            await pool.query('SELECT set_current_user($1)', [user_id]);
            const stateResult = await pool.query(`
                SELECT
                    practice_status,
                    mastery_status,
                    review_status,
                    is_wrong,
                    is_uncertain,
                    is_favorite,
                    mastery_level,
                    next_review_time
                FROM v_unified_question_status
                WHERE id = $1
            `, [questionId]);

            res.json({
                success: true,
                updates,
                state: stateResult.rows[0] || null
            });
        } catch (error) {
            console.error('更新题目状态失败:', error);
            res.status(500).json({ error: '更新题目状态失败', details: error.message });
        }
    });

    /**
     * 切换不确定标记
     * POST /api/v2/unified/state/:questionId/toggle-uncertain
     *
     * 请求体:
     * {
     *   user_id: string,
     *   reason?: string
     * }
     */
    router.post('/state/:questionId/toggle-uncertain', async (req, res) => {
        try {
            const { questionId } = req.params;
            const { user_id, reason } = req.body;

            if (!user_id) {
                return res.status(400).json({ error: '缺少user_id参数' });
            }

            // 检查用户是否有权访问统一状态功能
            const hasAccess = await versionManager.isFeatureEnabled('unifiedState', user_id);
            if (!hasAccess) {
                return res.status(403).json({
                    error: '功能未启用',
                    message: '统一状态功能暂未对您开放'
                });
            }

            // 检查当前状态
            const currentResult = await pool.query(`
                SELECT id FROM uncertain_questions
                WHERE user_id = $1 AND question_id = $2
            `, [user_id, questionId]);

            const isCurrentlyUncertain = currentResult.rows.length > 0;

            if (isCurrentlyUncertain) {
                // 删除标记
                await pool.query(`
                    DELETE FROM uncertain_questions
                    WHERE user_id = $1 AND question_id = $2
                `, [user_id, questionId]);

                res.json({
                    success: true,
                    is_uncertain: false,
                    message: '已取消不确定标记'
                });
            } else {
                // 添加标记
                await pool.query(`
                    INSERT INTO uncertain_questions (user_id, question_id, uncertain_reason)
                    VALUES ($1, $2, $3)
                `, [user_id, questionId, reason || null]);

                res.json({
                    success: true,
                    is_uncertain: true,
                    message: '已标记为不确定'
                });
            }
        } catch (error) {
            console.error('切换不确定标记失败:', error);
            res.status(500).json({ error: '切换不确定标记失败', details: error.message });
        }
    });

    /**
     * 切换收藏标记
     * POST /api/v2/unified/state/:questionId/toggle-favorite
     *
     * 请求体:
     * {
     *   user_id: string,
     *   notes?: string
     * }
     */
    router.post('/state/:questionId/toggle-favorite', async (req, res) => {
        try {
            const { questionId } = req.params;
            const { user_id, notes } = req.body;

            if (!user_id) {
                return res.status(400).json({ error: '缺少user_id参数' });
            }

            // 检查用户是否有权访问统一状态功能
            const hasAccess = await versionManager.isFeatureEnabled('unifiedState', user_id);
            if (!hasAccess) {
                return res.status(403).json({
                    error: '功能未启用',
                    message: '统一状态功能暂未对您开放'
                });
            }

            // 检查当前状态
            const currentResult = await pool.query(`
                SELECT id, notes FROM favorite_questions
                WHERE user_id = $1 AND question_id = $2
            `, [user_id, questionId]);

            const isCurrentlyFavorite = currentResult.rows.length > 0;

            if (isCurrentlyFavorite) {
                // 删除收藏
                await pool.query(`
                    DELETE FROM favorite_questions
                    WHERE user_id = $1 AND question_id = $2
                `, [user_id, questionId]);

                res.json({
                    success: true,
                    is_favorite: false,
                    message: '已取消收藏'
                });
            } else {
                // 添加收藏
                await pool.query(`
                    INSERT INTO favorite_questions (user_id, question_id, notes)
                    VALUES ($1, $2, $3)
                `, [user_id, questionId, notes || null]);

                res.json({
                    success: true,
                    is_favorite: true,
                    message: '已添加收藏'
                });
            }
        } catch (error) {
            console.error('切换收藏标记失败:', error);
            res.status(500).json({ error: '切换收藏标记失败', details: error.message });
        }
    });

    /**
     * 获取用户统计信息
     * GET /api/v2/unified/stats/:userId
     *
     * 查询参数:
     * - exam_category: 考试类别（可选）
     */
    router.get('/stats/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { exam_category } = req.query;

            // 检查用户是否有权访问统一统计功能
            const hasAccess = await versionManager.isFeatureEnabled('unifiedStats', userId);
            if (!hasAccess) {
                return res.status(403).json({
                    error: '功能未启用',
                    message: '统一统计功能暂未对您开放'
                });
            }

            // 设置当前用户ID
            await pool.query('SELECT set_current_user($1)', [userId]);

            let query = `
                SELECT
                    exam_category,
                    SUM(total_practiced_questions) as total_practiced,
                    SUM(total_correct_questions) as total_correct,
                    AVG(accuracy_rate) as accuracy_rate,
                    SUM(total_practices) as total_practices,
                    SUM(correct_count) as correct,
                    SUM(wrong_count) as wrong,
                    SUM(total_wrong_questions) as total_wrong,
                    SUM(mastered_wrong_questions) as mastered_wrong,
                    SUM(due_review_count) as due_review,
                    SUM(uncertain_count) as uncertain_count,
                    MAX(last_practice_time) as last_practice
                FROM v_unified_user_stats
                WHERE user_id = $1
            `;

            let params = [userId];

            if (exam_category) {
                query += ' AND exam_category = $2';
                params.push(exam_category);
            } else {
                query += ' GROUP BY exam_category';
            }

            const result = await pool.query(query, params);

            // 获取全局统计
            const globalResult = await pool.query(`
                SELECT
                    COUNT(DISTINCT ph.question_id) as total_practiced_questions,
                    COUNT(*) FILTER (WHERE ph.is_correct) as correct_count,
                    COUNT(*) FILTER (WHERE NOT ph.is_correct) as wrong_count,
                    ROUND(
                        COUNT(*) FILTER (WHERE ph.is_correct)::float /
                        NULLIF(COUNT(*), 0) * 100,
                        2
                    ) as accuracy_rate,
                    MAX(ph.practiced_at) as last_practice_time
                FROM practice_history ph
                WHERE ph.user_id = $1
            `, [userId]);

            // 获取错题统计
            const wrongResult = await pool.query(`
                SELECT
                    COUNT(*) as total_wrong,
                    COUNT(*) FILTER (WHERE mastery_level >= 0.8) as mastered,
                    COUNT(*) FILTER (WHERE next_review_time <= CURRENT_TIMESTAMP) as due_review,
                    ROUND(AVG(mastery_level) * 100, 2) as avg_mastery
                FROM wrong_answers
                WHERE user_id = $1
            `, [userId]);

            // 获取不确定和收藏统计
            const [uncertainResult, favoriteResult] = await Promise.all([
                pool.query('SELECT COUNT(*) as count FROM uncertain_questions WHERE user_id = $1', [userId]),
                pool.query('SELECT COUNT(*) as count FROM favorite_questions WHERE user_id = $1', [userId])
            ]);

            res.json({
                global: {
                    total_practiced: parseInt(globalResult.rows[0].total_practiced_questions) || 0,
                    correct: parseInt(globalResult.rows[0].correct_count) || 0,
                    wrong: parseInt(globalResult.rows[0].wrong_count) || 0,
                    accuracy_rate: parseFloat(globalResult.rows[0].accuracy_rate) || 0,
                    last_practice_time: globalResult.rows[0].last_practice_time
                },
                wrong_answers: {
                    total: parseInt(wrongResult.rows[0].total_wrong) || 0,
                    mastered: parseInt(wrongResult.rows[0].mastered) || 0,
                    due_review: parseInt(wrongResult.rows[0].due_review) || 0,
                    avg_mastery: parseFloat(wrongResult.rows[0].avg_mastery) || 0
                },
                uncertain_count: parseInt(uncertainResult.rows[0].count) || 0,
                favorite_count: parseInt(favoriteResult.rows[0].count) || 0,
                by_category: result.rows
            });
        } catch (error) {
            console.error('获取统计信息失败:', error);
            res.status(500).json({ error: '获取统计信息失败', details: error.message });
        }
    });

    return router;
};
