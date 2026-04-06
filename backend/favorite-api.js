/**
 * 收藏功能 API
 * 提供题目的收藏、取消收藏、查询收藏状态等接口
 */

const express = require('express');
const router = express.Router();

/**
 * 检查题目是否已收藏
 * GET /api/v2/favorite/:userId/:questionId
 */
router.get('/:userId/:questionId', async (req, res) => {
  const { userId, questionId } = req.params;

  try {
    const client = await req.pool.connect();

    const result = await client.query(
      `SELECT id, notes, created_at
       FROM favorite_questions
       WHERE user_id = $1 AND question_id = $2`,
      [userId, parseInt(questionId)]
    );

    client.release();

    if (result.rows.length > 0) {
      res.json({
        is_favorite: true,
        favorite_data: result.rows[0]
      });
    } else {
      res.status(404).json({
        is_favorite: false,
        message: '未收藏'
      });
    }
  } catch (error) {
    console.error('[FavoriteAPI] 查询收藏状态失败:', error);
    res.status(500).json({ error: '查询收藏状态失败' });
  }
});

/**
 * 添加收藏
 * POST /api/v2/favorite
 */
router.post('/', async (req, res) => {
  const { user_id, question_id, notes } = req.body;

  if (!user_id || !question_id) {
    return res.status(400).json({ error: '缺少必需参数' });
  }

  try {
    const client = await req.pool.connect();

    const result = await client.query(
      `INSERT INTO favorite_questions (user_id, question_id, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, question_id)
       DO UPDATE SET notes = EXCLUDED.notes, created_at = CURRENT_TIMESTAMP
       RETURNING id, user_id, question_id, notes, created_at`,
      [user_id, parseInt(question_id), notes || null]
    );

    client.release();

    res.json({
      success: true,
      message: '收藏成功',
      favorite: result.rows[0]
    });
  } catch (error) {
    console.error('[FavoriteAPI] 添加收藏失败:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: '题目不存在' });
    }
    res.status(500).json({ error: '添加收藏失败' });
  }
});

/**
 * 取消收藏
 * DELETE /api/v2/favorite/:userId/:questionId
 */
router.delete('/:userId/:questionId', async (req, res) => {
  const { userId, questionId } = req.params;

  try {
    const client = await req.pool.connect();

    const result = await client.query(
      `DELETE FROM favorite_questions
       WHERE user_id = $1 AND question_id = $2
       RETURNING id`,
      [userId, parseInt(questionId)]
    );

    client.release();

    if (result.rows.length > 0) {
      res.json({
        success: true,
        message: '取消收藏成功'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '收藏记录不存在'
      });
    }
  } catch (error) {
    console.error('[FavoriteAPI] 取消收藏失败:', error);
    res.status(500).json({ error: '取消收藏失败' });
  }
});

/**
 * 获取用户的所有收藏
 * GET /api/v2/favorite/:userId
 */
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const client = await req.pool.connect();

    const result = await client.query(
      `SELECT fq.id, fq.question_id, fq.notes, fq.created_at,
              q.question_no, q.question_text, q.question_type,
              q.category, q.exam_category, q.difficulty
       FROM favorite_questions fq
       JOIN questions q ON fq.question_id = q.id
       WHERE fq.user_id = $1
       ORDER BY fq.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    // 获取总数
    const countResult = await client.query(
      `SELECT COUNT(*) FROM favorite_questions WHERE user_id = $1`,
      [userId]
    );

    client.release();

    res.json({
      favorites: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[FavoriteAPI] 获取收藏列表失败:', error);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

module.exports = router;
