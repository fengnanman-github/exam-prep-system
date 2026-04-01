/**
 * 智能复习算法
 * 基于SuperMemo SM-2算法和艾宾浩斯遗忘曲线
 */

const express = require('express');

module.exports = (pool) => {
    const router = express.Router();

    /**
     * 提交复习结果并更新记忆状态
     * POST /api/v2/review/submit
     * Body: {
     *   user_id: string,
     *   question_id: number,
     *   quality: number // 0-5: 0=完全忘记, 5=完美记忆
     * }
     */
    router.post('/review/submit', async (req, res) => {
        try {
            const { user_id, question_id, quality } = req.body;

            if (!user_id || !question_id || quality === undefined) {
                return res.status(400).json({ error: '缺少必要参数' });
            }

            if (quality < 0 || quality > 5) {
                return res.status(400).json({ error: '质量评分必须在0-5之间' });
            }

            // 获取当前错题记录
            const getWrongQuery = `
                SELECT ease_factor, review_count, review_interval, mastery_level
                FROM wrong_answers
                WHERE user_id = $1 AND question_id = $2
            `;
            const wrongResult = await pool.query(getWrongQuery, [user_id, question_id]);

            if (wrongResult.rows.length === 0) {
                // 如果不存在记录，创建新记录
                const insertQuery = `
                    INSERT INTO wrong_answers (user_id, question_id, wrong_count, ease_factor, review_interval, review_count, next_review_time, mastery_level)
                    VALUES ($1, $2, 1, 2.5, 1, 0, CURRENT_TIMESTAMP + INTERVAL '1 day', 0)
                    RETURNING *
                `;
                await pool.query(insertQuery, [user_id, question_id]);
            }

            const wrong = wrongResult.rows[0] || { ease_factor: 2.5, review_count: 0, review_interval: 1 };

            // 计算新的间隔和难度因子
            const newEaseFactor = Math.max(1.3, wrong.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

            let newInterval;
            if (wrong.review_count === 0) {
                newInterval = 1;
            } else if (wrong.review_count === 1) {
                newInterval = 6;
            } else {
                // 确保review_interval是有效的数字
                const currentInterval = wrong.review_interval || 1;
                newInterval = Math.round(currentInterval * newEaseFactor);
            }

            // 更新错题记录
            const updateQuery = `
                UPDATE wrong_answers
                SET
                    ease_factor = $1,
                    review_interval = $2,
                    review_count = review_count + 1,
                    next_review_time = CURRENT_TIMESTAMP + (INTERVAL '1 day' * $2::integer),
                    mastery_level = LEAST(1.0, COALESCE(mastery_level, 0) + ($5 - 2.5) * 0.1),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $3 AND question_id = $4
                RETURNING *
            `;
            const result = await pool.query(updateQuery, [
                newEaseFactor,
                newInterval,
                user_id,
                question_id,
                quality
            ]);

            // 如果质量评分>=4，认为已掌握，可以删除错题记录
            if (quality >= 4) {
                await pool.query(`
                    DELETE FROM wrong_answers WHERE user_id = $1 AND question_id = $2
                `, [user_id, question_id]);

                res.json({
                    message: '恭喜！该题目已掌握',
                    result: result.rows[0],
                    mastered: true
                });
            } else {
                res.json({
                    message: '继续加油！下次复习时间已更新',
                    result: result.rows[0],
                    next_review_days: newInterval,
                    mastered: false
                });
            }
        } catch (error) {
            console.error('提交复习结果失败:', error);
            res.status(500).json({ error: '提交复习结果失败' });
        }
    });

    /**
     * 获取今日待复习题目
     * GET /api/v2/review/today/:userId
     */
    router.get('/review/today/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    wa.*,
                    q.id as question_id,
                    q.question_no,
                    q.question_type,
                    q.category,
                    q.question_text,
                    q.option_a,
                    q.option_b,
                    q.option_c,
                    q.option_d,
                    q.correct_answer,
                    q.knowledge_point
                FROM wrong_answers wa
                JOIN questions q ON wa.question_id = q.id
                WHERE wa.user_id = $1
                    AND wa.next_review_time <= CURRENT_TIMESTAMP
                ORDER BY wa.next_review_time ASC, wa.mastery_level ASC
            `;
            const result = await pool.query(query, [userId]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取待复习题目失败:', error);
            res.status(500).json({ error: '获取待复习题目失败' });
        }
    });

    /**
     * 获取复习统计
     * GET /api/v2/review/stats/:userId
     */
    router.get('/review/stats/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    COUNT(*) as total_review_questions,
                    COUNT(*) FILTER (WHERE next_review_time <= CURRENT_TIMESTAMP) as due_today,
                    COUNT(*) FILTER (WHERE next_review_time > CURRENT_TIMESTAMP) as pending_review,
                    ROUND(AVG(COALESCE(mastery_level, 0)) * 100, 2) as average_mastery,
                    COUNT(*) FILTER (WHERE COALESCE(mastery_level, 0) >= 0.8) as mastered_count
                FROM wrong_answers
                WHERE user_id = $1
            `;
            const result = await pool.query(query, [userId]);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('获取复习统计失败:', error);
            res.status(500).json({ error: '获取复习统计失败' });
        }
    });

    /**
     * 获取两级分类错题统计
     * GET /api/v2/review/stats/:userId/two-level
     */
    router.get('/review/stats/:userId/two-level', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    q.law_category,
                    q.tech_category,
                    COUNT(*) as total_wrong,
                    COUNT(*) FILTER (wa.mastery_level >= 0.8) as mastered,
                    COUNT(*) FILTER (wa.next_review_time <= CURRENT_TIMESTAMP) as due_today,
                    ROUND(AVG(wa.mastery_level) * 100, 2) as avg_mastery
                FROM wrong_answers wa
                JOIN questions q ON wa.question_id = q.id
                WHERE wa.user_id = $1
                    AND q.law_category IS NOT NULL
                    AND q.tech_category IS NOT NULL
                GROUP BY q.law_category, q.tech_category
                ORDER BY q.law_category, q.tech_category
            `;
            const result = await pool.query(query, [userId]);

            // 组织成层级结构
            const lawMap = {};
            result.rows.forEach(row => {
                if (!lawMap[row.law_category]) {
                    lawMap[row.law_category] = {
                        law_category: row.law_category,
                        total_wrong: 0,
                        mastered: 0,
                        due_today: 0,
                        tech_categories: []
                    };
                }
                const lawCat = lawMap[row.law_category];
                lawCat.total_wrong += parseInt(row.total_wrong);
                lawCat.mastered += parseInt(row.mastered);
                lawCat.due_today += parseInt(row.due_today);
                lawCat.tech_categories.push(row);
            });

            // 计算平均掌握度
            Object.values(lawMap).forEach(lawCat => {
                const totalMastery = lawCat.tech_categories.reduce((sum, tc) =>
                    sum + (parseFloat(tc.avg_mastery) || 0), 0);
                lawCat.avg_mastery = parseFloat((totalMastery / lawCat.tech_categories.length).toFixed(2));
            });

            res.json(Object.values(lawMap));
        } catch (error) {
            console.error('获取两级分类错题统计失败:', error);
            res.status(500).json({ error: '获取两级分类错题统计失败' });
        }
    });

    /**
     * 获取遗忘曲线数据
     * GET /api/v2/review/curve/:userId
     */
    router.get('/review/curve/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            // 获取最近30天的复习数据
            const query = `
                SELECT
                    DATE(updated_at) as date,
                    COUNT(*) as review_count,
                    ROUND(AVG(mastery_level) * 100, 2) as avg_mastery
                FROM wrong_answers
                WHERE user_id = $1
                    AND updated_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(updated_at)
                ORDER BY date
            `;
            const result = await pool.query(query, [userId]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取遗忘曲线失败:', error);
            res.status(500).json({ error: '获取遗忘曲线失败' });
        }
    });

    /**
     * 智能推荐复习题目
     * 基于艾宾浩斯遗忘曲线，优先推荐即将遗忘的题目
     * GET /api/v2/review/recommend/:userId?limit=10
     */
    router.get('/review/recommend/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { limit = 10 } = req.query;

            const query = `
                SELECT
                    wa.*,
                    q.id as question_id,
                    q.question_no,
                    q.question_type,
                    q.category,
                    q.question_text,
                    q.option_a,
                    q.option_b,
                    q.option_c,
                    q.option_d,
                    q.correct_answer,
                    EXTRACT(EPOCH FROM (wa.next_review_time - CURRENT_TIMESTAMP)) / 3600 as hours_until_review
                FROM wrong_answers wa
                JOIN questions q ON wa.question_id = q.id
                WHERE wa.user_id = $1
                ORDER BY
                    CASE
                        WHEN wa.next_review_time <= CURRENT_TIMESTAMP THEN 0
                        ELSE EXTRACT(EPOCH FROM (wa.next_review_time - CURRENT_TIMESTAMP))
                    END ASC,
                    wa.mastery_level ASC,
                    wa.wrong_count DESC
                LIMIT $2
            `;
            const result = await pool.query(query, [userId, parseInt(limit)]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取推荐题目失败:', error);
            res.status(500).json({ error: '获取推荐题目失败' });
        }
    });

    return router;
};
