/**
 * 不确定题目API模块
 * 提供不确定题目的标记、查询、删除等功能
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/v2/uncertain
 * 标记题目为不确定
 */
router.post('/', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { question_id, user_id, uncertain_reason, user_answer, is_correct } = req.body;

        // 参数验证
        if (!question_id || !user_id) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        // 使用UPSERT处理：如果已存在则更新created_at，否则插入
        const query = `
            INSERT INTO uncertain_questions (user_id, question_id, uncertain_reason, user_answer, is_correct)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, question_id)
            DO UPDATE SET
                uncertain_reason = EXCLUDED.uncertain_reason || uncertain_questions.uncertain_reason,
                user_answer = EXCLUDED.user_answer,
                is_correct = EXCLUDED.is_correct,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await client.query(query, [
            user_id,
            question_id,
            uncertain_reason || null,
            user_answer || null,
            is_correct !== undefined ? is_correct : null
        ]);

        res.status(201).json({
            message: '已标记为不确定',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('标记不确定失败:', error);
        res.status(500).json({ error: '标记不确定失败' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/v2/uncertain/:userId
 * 获取用户的不确定题目列表
 */
router.get('/:userId', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        const query = `
            SELECT
                uq.id,
                uq.user_id,
                uq.question_id,
                uq.uncertain_reason,
                uq.user_answer,
                uq.is_correct,
                uq.created_at,
                q.question_no,
                q.question_type,
                q.question_text,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_answer,
                q.category,
                q.difficulty
            FROM uncertain_questions uq
            JOIN questions q ON uq.question_id = q.id
            WHERE uq.user_id = $1
            ORDER BY uq.created_at DESC
            LIMIT $2
        `;

        const result = await client.query(query, [userId, parseInt(limit)]);

        res.json({
            count: result.rows.length,
            questions: result.rows
        });

    } catch (error) {
        console.error('获取不确定题目失败:', error);
        res.status(500).json({ error: '获取不确定题目失败' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/v2/uncertain/:userId/stats
 * 获取不确定题目统计
 */
router.get('/:userId/stats', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { userId } = req.params;

        const queries = {
            total: 'SELECT COUNT(*) FROM uncertain_questions WHERE user_id = $1',
            correct: 'SELECT COUNT(*) FROM uncertain_questions WHERE user_id = $1 AND is_correct = TRUE',
            wrong: 'SELECT COUNT(*) FROM uncertain_questions WHERE user_id = $1 AND is_correct = FALSE'
        };

        const [totalResult, correctResult, wrongResult] = await Promise.all([
            client.query(queries.total, [userId]),
            client.query(queries.correct, [userId]),
            client.query(queries.wrong, [userId])
        ]);

        res.json({
            total: parseInt(totalResult.rows[0].count),
            correct: parseInt(correctResult.rows[0].count),
            wrong: parseInt(wrongResult.rows[0].count)
        });

    } catch (error) {
        console.error('获取不确定题目统计失败:', error);
        res.status(500).json({ error: '获取统计失败' });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/v2/uncertain/:userId/:questionId
 * 取消不确定标记（标记为已掌握）
 */
router.delete('/:userId/:questionId', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { userId, questionId } = req.params;

        const query = `
            DELETE FROM uncertain_questions
            WHERE user_id = $1 AND question_id = $2
            RETURNING *
        `;

        const result = await client.query(query, [userId, questionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '不确定记录不存在' });
        }

        res.json({
            message: '已取消不确定标记',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('取消不确定标记失败:', error);
        res.status(500).json({ error: '取消不确定标记失败' });
    } finally {
        client.release();
    }
});

/**
 * POST /api/v2/uncertain/:userId/check/:questionId
 * 检查题目是否已标记为不确定
 */
router.post('/:userId/check/:questionId', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { userId, questionId } = req.params;

        const query = `
            SELECT * FROM uncertain_questions
            WHERE user_id = $1 AND question_id = $2
        `;

        const result = await client.query(query, [userId, questionId]);

        res.json({
            is_uncertain: result.rows.length > 0,
            data: result.rows.length > 0 ? result.rows[0] : null
        });

    } catch (error) {
        console.error('检查不确定状态失败:', error);
        res.status(500).json({ error: '检查失败' });
    } finally {
        client.release();
    }
});

module.exports = (pool) => {
    router.pool = pool;
    return router;
};
