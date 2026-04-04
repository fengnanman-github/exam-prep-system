/**
 * 统一练习提交API
 * 整合练习历史记录、SuperMemo算法和状态更新
 * 所有练习模式使用统一的练习提交逻辑
 */

const express = require('express');
const { calculateQuality, updateSuperMemo, initializeSuperMemo } = require('./supermemo-engine');
const { getInstance: getVersionManager } = require('./version-manager');

/**
 * 创建统一练习路由
 *
 * @param {Object} pool - 数据库连接池
 * @returns {Router} Express路由
 */
module.exports = (pool) => {
    const router = express.Router();
    const versionManager = getVersionManager(pool);

    /**
     * 统一练习提交接口
     * POST /api/v2/unified/practice/submit
     *
     * 请求体:
     * {
     *   user_id: string,
     *   question_id: number,
     *   user_answer: string,
     *   is_correct: boolean,
     *   time_spent: number, // 秒
     *   practice_mode: string, // random, category, exam_category, wrong, review, document
     *   is_uncertain?: boolean,
     *   uncertain_reason?: string
     * }
     *
     * 返回:
     * {
     *   success: boolean,
     *   state: { 更新后的题目状态 },
     *   supermemo?: { SuperMemo数据（如果答错） },
     *   message: string
     * }
     */
    router.post('/practice/submit', async (req, res) => {
        const client = await pool.connect();
        try {
            const {
                user_id,
                question_id,
                user_answer,
                is_correct,
                time_spent,
                practice_mode = 'random',
                is_uncertain = false,
                uncertain_reason
            } = req.body;

            // 验证必要参数
            if (!user_id || !question_id || user_answer === undefined || is_correct === undefined) {
                return res.status(400).json({ error: '缺少必要参数' });
            }

            // 检查用户是否有权访问统一练习功能
            const hasAccess = await versionManager.isFeatureEnabled('unifiedSuperMemo', user_id);
            if (!hasAccess) {
                client.release();
                return res.status(403).json({
                    error: '功能未启用',
                    message: '统一练习功能暂未对您开放'
                });
            }

            await client.query('BEGIN');

            // 1. 记录练习历史
            const historyResult = await client.query(`
                INSERT INTO practice_history (
                    user_id, question_id, user_answer, is_correct,
                    time_spent, practice_mode, is_uncertain, practiced_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                RETURNING id
            `, [user_id, question_id, user_answer, is_correct, time_spent, practice_mode, is_uncertain]);

            // 2. 获取该题目的平均用时（用于计算质量评分）
            const avgTimeResult = await client.query(`
                SELECT AVG(time_spent) as avg_time
                FROM practice_history
                WHERE question_id = $1 AND time_spent IS NOT NULL AND time_spent > 0
            `, [question_id]);

            const averageTime = parseFloat(avgTimeResult.rows[0]?.avg_time) || null;

            // 3. 计算质量评分
            const quality = calculateQuality({
                isCorrect: is_correct,
                timeSpent: time_spent || 0,
                isUncertain: is_uncertain,
                averageTime
            });

            // 4. 处理错题记录和SuperMemo算法
            let supermemoData = null;

            if (!is_correct) {
                // 答错了：更新错题记录
                const existingWrongResult = await client.query(`
                    SELECT id, ease_factor, review_interval, review_count, mastery_level, wrong_count
                    FROM wrong_answers
                    WHERE user_id = $1 AND question_id = $2
                `, [user_id, question_id]);

                if (existingWrongResult.rows.length > 0) {
                    // 已有错题记录：更新SuperMemo参数
                    const existingWrong = existingWrongResult.rows[0];
                    supermemoData = updateSuperMemo(existingWrong, quality);

                    await client.query(`
                        UPDATE wrong_answers
                        SET
                            wrong_count = wrong_count + 1,
                            ease_factor = $1,
                            review_interval = $2,
                            review_count = $3,
                            mastery_level = $4,
                            next_review_time = $5,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = $6 AND question_id = $7
                    `, [
                        supermemoData.ease_factor,
                        supermemoData.review_interval,
                        supermemoData.review_count,
                        supermemoData.mastery_level,
                        supermemoData.next_review_time,
                        user_id,
                        question_id
                    ]);
                } else {
                    // 新错题：创建记录
                    supermemoData = initializeSuperMemo();

                    await client.query(`
                        INSERT INTO wrong_answers (
                            user_id, question_id, wrong_count,
                            ease_factor, review_interval, review_count,
                            mastery_level, next_review_time
                        )
                        VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
                    `, [
                        user_id,
                        question_id,
                        supermemoData.ease_factor,
                        supermemoData.review_interval,
                        supermemoData.review_count,
                        supermemoData.mastery_level,
                        supermemoData.next_review_time
                    ]);
                }
            } else {
                // 答对了：检查是否需要从错题本移除
                const wrongResult = await client.query(`
                    SELECT id, mastery_level, review_count
                    FROM wrong_answers
                    WHERE user_id = $1 AND question_id = $2
                `, [user_id, question_id]);

                if (wrongResult.rows.length > 0) {
                    const wrongRecord = wrongResult.rows[0];

                    // 更新SuperMemo参数（即使答对也要更新）
                    supermemoData = updateSuperMemo(wrongRecord, quality);

                    // 检查是否应该从错题本移除
                    if (quality >= 4 || supermemoData.mastery_level >= 0.8) {
                        // 已掌握：从错题本移除
                        await client.query(`
                            DELETE FROM wrong_answers
                            WHERE user_id = $1 AND question_id = $2
                        `, [user_id, question_id]);

                        supermemoData.removed_from_wrong_book = true;
                    } else {
                        // 还未完全掌握：更新记录
                        await client.query(`
                            UPDATE wrong_answers
                            SET
                                ease_factor = $1,
                                review_interval = $2,
                                review_count = $3,
                                mastery_level = $4,
                                next_review_time = $5,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = $6 AND question_id = $7
                        `, [
                            supermemoData.ease_factor,
                            supermemoData.review_interval,
                            supermemoData.review_count,
                            supermemoData.mastery_level,
                            supermemoData.next_review_time,
                            user_id,
                            question_id
                        ]);
                    }
                }
            }

            // 5. 处理不确定标记
            if (is_uncertain) {
                await client.query(`
                    INSERT INTO uncertain_questions (user_id, question_id, uncertain_reason, user_answer, is_correct)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (user_id, question_id)
                    DO UPDATE SET
                        uncertain_reason = EXCLUDED.uncertain_reason,
                        user_answer = EXCLUDED.user_answer,
                        is_correct = EXCLUDED.is_correct,
                        updated_at = CURRENT_TIMESTAMP
                `, [user_id, question_id, uncertain_reason || null, user_answer, is_correct]);
            }

            await client.query('COMMIT');

            // 6. 获取更新后的题目状态
            await pool.query('SELECT set_current_user($1)', [user_id]);
            const stateResult = await pool.query(`
                SELECT
                    id,
                    practice_status,
                    mastery_status,
                    review_status,
                    is_wrong,
                    is_uncertain,
                    is_favorite,
                    mastery_level,
                    next_review_time,
                    practice_count,
                    correct_count,
                    wrong_count,
                    error_rate
                FROM v_unified_question_status
                WHERE id = $1
            `, [question_id]);

            // 7. 生成反馈消息
            let message = '';
            if (!is_correct) {
                message = `❌ 回答错误，已加入错题本。建议${supermemoData.review_interval}天后复习。`;
            } else if (is_uncertain) {
                message = `✅ 回答正确，但标记为不确定。请加强复习。`;
            } else if (supermemoData?.removed_from_wrong_book) {
                message = `🎉 恭喜！该题目已掌握，从错题本移除。`;
            } else {
                message = `✅ 回答正确！继续保持。`;
            }

            res.json({
                success: true,
                state: stateResult.rows[0] || null,
                supermemo: supermemoData ? {
                    quality,
                    ease_factor: supermemoData.ease_factor,
                    review_interval: supermemoData.review_interval,
                    mastery_level: supermemoData.mastery_level,
                    next_review_time: supermemoData.next_review_time,
                    removed_from_wrong_book: supermemoData.removed_from_wrong_book || false
                } : null,
                message
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('统一练习提交失败:', error);
            res.status(500).json({ error: '统一练习提交失败', details: error.message });
        } finally {
            client.release();
        }
    });

    /**
     * 批量练习提交
     * POST /api/v2/unified/practice/submit-batch
     *
     * 请求体:
     * {
     *   user_id: string,
     *   practices: Array<{
     *     question_id: number,
     *     user_answer: string,
     *     is_correct: boolean,
     *     time_spent: number,
     *     practice_mode: string,
     *     is_uncertain?: boolean
     *   }>
     * }
     */
    router.post('/practice/submit-batch', async (req, res) => {
        const client = await pool.connect();
        try {
            const { user_id, practices } = req.body;

            if (!user_id || !practices || !Array.isArray(practices)) {
                return res.status(400).json({ error: '缺少必要参数或practices格式错误' });
            }

            await client.query('BEGIN');

            const results = [];
            const questionIds = practices.map(p => p.question_id);

            // 获取所有题目的平均用时
            const avgTimeResult = await client.query(`
                SELECT question_id, AVG(time_spent) as avg_time
                FROM practice_history
                WHERE question_id = ANY($1) AND time_spent IS NOT NULL AND time_spent > 0
                GROUP BY question_id
            `, [questionIds]);

            const avgTimeMap = {};
            avgTimeResult.rows.forEach(row => {
                avgTimeMap[row.question_id] = parseFloat(row.avg_time);
            });

            // 处理每条练习记录
            for (const practice of practices) {
                const {
                    question_id,
                    user_answer,
                    is_correct,
                    time_spent,
                    practice_mode = 'random',
                    is_uncertain = false
                } = practice;

                // 记录练习历史
                await client.query(`
                    INSERT INTO practice_history (
                        user_id, question_id, user_answer, is_correct,
                        time_spent, practice_mode, is_uncertain, practiced_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                `, [user_id, question_id, user_answer, is_correct, time_spent, practice_mode, is_uncertain]);

                // 计算质量评分
                const quality = calculateQuality({
                    isCorrect: is_correct,
                    timeSpent: time_spent || 0,
                    isUncertain: is_uncertain,
                    averageTime: avgTimeMap[question_id] || null
                });

                // 处理错题记录
                if (!is_correct) {
                    const existingWrongResult = await client.query(`
                        SELECT id, ease_factor, review_interval, review_count, mastery_level
                        FROM wrong_answers
                        WHERE user_id = $1 AND question_id = $2
                    `, [user_id, question_id]);

                    if (existingWrongResult.rows.length > 0) {
                        const supermemoData = updateSuperMemo(existingWrongResult.rows[0], quality);
                        await client.query(`
                            UPDATE wrong_answers
                            SET
                                wrong_count = wrong_count + 1,
                                ease_factor = $1,
                                review_interval = $2,
                                review_count = $3,
                                mastery_level = $4,
                                next_review_time = $5,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = $6 AND question_id = $7
                        `, [
                            supermemoData.ease_factor,
                            supermemoData.review_interval,
                            supermemoData.review_count,
                            supermemoData.mastery_level,
                            supermemoData.next_review_time,
                            user_id,
                            question_id
                        ]);
                    } else {
                        const supermemoData = initializeSuperMemo();
                        await client.query(`
                            INSERT INTO wrong_answers (
                                user_id, question_id, wrong_count,
                                ease_factor, review_interval, review_count,
                                mastery_level, next_review_time
                            )
                            VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
                        `, [
                            user_id,
                            question_id,
                            supermemoData.ease_factor,
                            supermemoData.review_interval,
                            supermemoData.review_count,
                            supermemoData.mastery_level,
                            supermemoData.next_review_time
                        ]);
                    }
                } else {
                    // 答对：检查是否从错题本移除
                    const wrongResult = await client.query(`
                        SELECT id, mastery_level, review_count
                        FROM wrong_answers
                        WHERE user_id = $1 AND question_id = $2
                    `, [user_id, question_id]);

                    if (wrongResult.rows.length > 0) {
                        const supermemoData = updateSuperMemo(wrongResult.rows[0], quality);

                        if (quality >= 4 || supermemoData.mastery_level >= 0.8) {
                            await client.query(`
                                DELETE FROM wrong_answers
                                WHERE user_id = $1 AND question_id = $2
                            `, [user_id, question_id]);
                        } else {
                            await client.query(`
                                UPDATE wrong_answers
                                SET
                                    ease_factor = $1,
                                    review_interval = $2,
                                    review_count = $3,
                                    mastery_level = $4,
                                    next_review_time = $5,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE user_id = $6 AND question_id = $7
                            `, [
                                supermemoData.ease_factor,
                                supermemoData.review_interval,
                                supermemoData.review_count,
                                supermemoData.mastery_level,
                                supermemoData.next_review_time,
                                user_id,
                                question_id
                            ]);
                        }
                    }
                }

                results.push({
                    question_id,
                    is_correct,
                    quality
                });
            }

            await client.query('COMMIT');

            // 获取更新后的状态
            await pool.query('SELECT set_current_user($1)', [user_id]);
            const stateResult = await pool.query(`
                SELECT * FROM v_unified_question_status
                WHERE id = ANY($1)
            `, [questionIds]);

            res.json({
                success: true,
                results,
                states: stateResult.rows
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('批量练习提交失败:', error);
            res.status(500).json({ error: '批量练习提交失败', details: error.message });
        } finally {
            client.release();
        }
    });

    /**
     * 获取待复习题目
     * GET /api/v2/unified/practice/due-review/:userId
     *
     * 查询参数:
     * - exam_category: 考试类别（可选）
     * - limit: 返回数量（默认20）
     */
    router.get('/practice/due-review/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { exam_category, limit = 20 } = req.query;

            // 设置当前用户ID
            await pool.query('SELECT set_current_user($1)', [userId]);

            let query = `
                SELECT
                    uqs.id,
                    uqs.question_no,
                    q.question_text,
                    q.question_type,
                    q.category,
                    q.exam_category,
                    q.law_category,
                    q.tech_category,
                    q.difficulty,
                    uqs.mastery_level,
                    uqs.next_review_time,
                    uqs.review_interval,
                    uqs.practice_count,
                    uqs.wrong_count,
                    uqs.error_rate,
                    uqs.supermemo_review_count as review_count,
                    q.option_a,
                    q.option_b,
                    q.option_c,
                    q.option_d,
                    q.correct_answer,
                    q.explanation
                FROM v_unified_question_status uqs
                JOIN questions q ON uqs.id = q.id
                WHERE uqs.review_status = 'due'
            `;

            const params = [];
            let paramIndex = 1;

            if (exam_category) {
                query += ` AND exam_category = $${paramIndex}`;
                params.push(exam_category);
                paramIndex++;
            }

            query += ` ORDER BY mastery_level ASC, next_review_time ASC LIMIT $${paramIndex}`;
            params.push(parseInt(limit));

            const result = await pool.query(query, params);

            res.json({
                total: result.rows.length,
                questions: result.rows
            });
        } catch (error) {
            console.error('获取待复习题目失败:', error);
            res.status(500).json({ error: '获取待复习题目失败', details: error.message });
        }
    });

    /**
     * 获取推荐练习题目
     * GET /api/v2/unified/practice/recommend/:userId
     *
     * 查询参数:
     * - exam_category: 考试类别（可选）
     * - limit: 返回数量（默认10）
     */
    router.get('/practice/recommend/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { exam_category, limit = 10 } = req.query;

            // 设置当前用户ID
            await pool.query('SELECT set_current_user($1)', [userId]);

            let query = `
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
                    practice_status,
                    mastery_status,
                    review_status,
                    is_wrong,
                    mastery_level,
                    next_review_time,
                    error_rate,
                    practice_count
                FROM v_unified_question_status
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if (exam_category) {
                query += ` AND exam_category = $${paramIndex}`;
                params.push(exam_category);
                paramIndex++;
            }

            // 优先级排序：
            // 1. 待复习且掌握度低
            // 2. 错题且掌握度低
            // 3. 新题
            // 4. 已掌握
            query += `
                ORDER BY
                    CASE
                        WHEN review_status = 'due' AND mastery_level < 0.5 THEN 1
                        WHEN is_wrong AND mastery_level < 0.5 THEN 2
                        WHEN practice_status = 'new' THEN 3
                        WHEN review_status = 'due' THEN 4
                        ELSE 5
                    END,
                    mastery_level ASC,
                    RANDOM()
                LIMIT $${paramIndex}
            `;

            params.push(parseInt(limit));

            const result = await pool.query(query, params);

            res.json({
                total: result.rows.length,
                questions: result.rows
            });
        } catch (error) {
            console.error('获取推荐题目失败:', error);
            res.status(500).json({ error: '获取推荐题目失败', details: error.message });
        }
    });

    return router;
};
