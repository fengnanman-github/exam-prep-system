const express = require('express');
const router = express.Router();

// 系统概览
router.get('/overview', async (req, res) => {
  try {
    const client = await req.pool.connect();

    const userStats = await client.query(`
      SELECT COUNT(*) as total_users,
        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as active_users,
        COUNT(CASE WHEN approval_status = 'pending_approval' THEN 1 END) as pending_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count
      FROM users
    `);

    const practiceStats = await client.query(`
      SELECT COUNT(DISTINCT ph.user_id) as active_learners,
        COUNT(*) as total_practices,
        COUNT(CASE WHEN ph.is_correct THEN 1 END) as correct_count,
        ROUND(AVG(CASE WHEN ph.is_correct THEN 100 ELSE 0 END), 2) as avg_accuracy
      FROM practice_history ph
      JOIN users u ON ph.user_id::text = u.id::text
      WHERE u.role = 'user' AND ph.is_admin_practice = false AND ph.practiced_at >= NOW() - INTERVAL '30 days'
    `);

    const questionStats = await client.query(`
      SELECT COUNT(*) as total_questions,
        COUNT(CASE WHEN question_type = '单项选择题' THEN 1 END) as single_choice,
        COUNT(CASE WHEN question_type = '多项选择题' THEN 1 END) as multiple_choice,
        COUNT(CASE WHEN question_type = '判断题' THEN 1 END) as true_false
      FROM questions
    `);

    client.release();
    res.json({ users: userStats.rows[0], practices: practiceStats.rows[0], questions: questionStats.rows[0] });
  } catch (error) {
    console.error('[Analytics] Overview error:', error);
    res.status(500).json({ error: '获取概览失败' });
  }
});

// TOP用户
router.get('/top-users', async (req, res) => {
  const { limit = 10, days = 30 } = req.query;

  try {
    const client = await req.pool.connect();
    const result = await client.query(`
      SELECT u.id, u.username, u.display_name,
        COUNT(DISTINCT ph.question_id) as questions_practiced,
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN ph.is_correct THEN 1 END) as correct_count,
        ROUND(COUNT(CASE WHEN ph.is_correct THEN 1 END)::numeric / COUNT(*) * 100, 2) as accuracy_rate
      FROM users u
      JOIN practice_history ph ON u.id::text = ph.user_id
      WHERE u.role = 'user' AND ph.is_admin_practice = false AND ph.practiced_at >= NOW() - INTERVAL '${days} days'
      GROUP BY u.id, u.username, u.display_name
      ORDER BY questions_practiced DESC LIMIT $1
    `, [limit]);

    client.release();
    res.json({ top_users: result.rows });
  } catch (error) {
    res.status(500).json({ error: '获取TOP用户失败' });
  }
});

// 用户行为分析
router.get('/user-behavior', async (req, res) => {
  const { days = 30 } = req.query;

  try {
    const client = await req.pool.connect();

    const dailyActiveUsers = await client.query(`
      SELECT DATE(practiced_at) as date, COUNT(DISTINCT ph.user_id) as active_users, COUNT(*) as total_practices
      FROM practice_history ph
      JOIN users u ON ph.user_id::text = u.id::text
      WHERE u.role = 'user' AND ph.is_admin_practice = false AND ph.practiced_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(practiced_at) ORDER BY date
    `);

    const hourlyDistribution = await client.query(`
      SELECT EXTRACT(HOUR FROM practiced_at) as hour, COUNT(*) as practice_count
      FROM practice_history ph
      JOIN users u ON ph.user_id::text = u.id::text
      WHERE u.role = 'user' AND ph.is_admin_practice = false AND ph.practiced_at >= NOW() - INTERVAL '${days} days'
      GROUP BY EXTRACT(HOUR FROM practiced_at) ORDER BY hour
    `);

    client.release();
    res.json({ daily_active_users: dailyActiveUsers.rows, hourly_distribution: hourlyDistribution.rows });
  } catch (error) {
    res.status(500).json({ error: '获取行为分析失败' });
  }
});

// 题目难度分析
router.get('/question-difficulty', async (req, res) => {
  try {
    const client = await req.pool.connect();
    const result = await client.query(`
      SELECT q.exam_category, COUNT(*) as total_attempts,
        COUNT(CASE WHEN ph.is_correct THEN 1 END) as correct_count,
        ROUND(COUNT(CASE WHEN ph.is_correct THEN 1 END)::numeric / COUNT(*) * 100, 2) as accuracy_rate,
        COUNT(DISTINCT ph.user_id) as unique_users
      FROM practice_history ph
      JOIN questions q ON ph.question_id = q.id
      JOIN users u ON ph.user_id::text = u.id::text
      WHERE u.role = 'user' AND ph.is_admin_practice = false
      GROUP BY q.exam_category ORDER BY accuracy_rate ASC
    `);

    client.release();
    res.json({ category_difficulty: result.rows });
  } catch (error) {
    res.status(500).json({ error: '获取难度分析失败' });
  }
});

module.exports = router;
