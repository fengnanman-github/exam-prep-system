const express = require('express');
const router = express.Router();

// 获取所有用户
router.get('/users', async (req, res) => {
  const { page = 1, limit = 20, status, role, search } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push(`approval_status = $${params.length + 1}`);
    params.push(status);
  }
  if (role) {
    conditions.push(`role = $${params.length + 1}`);
    params.push(role);
  }
  if (search) {
    conditions.push(`(username ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1} OR display_name ILIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const client = await req.pool.connect();
    const result = await client.query(
      `SELECT id, username, email, display_name, role, approval_status, email_verified,
        is_active, created_at, last_login_at, login_count, failed_login_attempts
       FROM users ${whereClause}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const countResult = await client.query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    client.release();

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('[UserManagement] Get users error:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 审批用户
router.put('/users/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.user.id;

  try {
    const client = await req.pool.connect();
    const userResult = await client.query(`SELECT id, username, email, approval_status FROM users WHERE id = $1`, [id]);

    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = userResult.rows[0];
    await client.query(
      `UPDATE users SET approval_status = 'approved', approved_at = NOW(), approved_by = $1, approval_notes = $2, is_active = true WHERE id = $3`,
      [adminId, notes || null, id]
    );

    client.release();

    const emailService = require('../services/email-service');
    await emailService.sendApprovalNotificationEmail(user.username, user.email, true);

    res.json({ message: '用户已批准' });
  } catch (error) {
    console.error('[UserManagement] Approve error:', error);
    res.status(500).json({ error: '审批失败' });
  }
});

// 拒绝用户
router.put('/users/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user.id;

  try {
    const client = await req.pool.connect();
    const userResult = await client.query(`SELECT id, username, email FROM users WHERE id = $1`, [id]);

    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = userResult.rows[0];
    await client.query(
      `UPDATE users SET approval_status = 'rejected', rejected_at = NOW(), rejected_by = $1, rejection_reason = $2, is_active = false WHERE id = $3`,
      [adminId, reason || null, id]
    );

    client.release();

    const emailService = require('../services/email-service');
    await emailService.sendApprovalNotificationEmail(user.username, user.email, false, reason);

    res.json({ message: '用户已拒绝' });
  } catch (error) {
    console.error('[UserManagement] Reject error:', error);
    res.status(500).json({ error: '拒绝失败' });
  }
});

// 启用/禁用用户
router.put('/users/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    const client = await req.pool.connect();
    const isActive = action === 'enable';
    await client.query(
      `UPDATE users SET is_active = $1, approval_status = $2 WHERE id = $3`,
      [isActive, isActive ? 'approved' : 'suspended', id]
    );
    client.release();
    res.json({ message: `用户已${isActive ? '启用' : '禁用'}` });
  } catch (error) {
    res.status(500).json({ error: '操作失败' });
  }
});

// 重置密码
router.post('/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const crypto = require('crypto');
  const bcrypt = require('bcrypt');

  try {
    const client = await req.pool.connect();
    const newPassword = crypto.randomBytes(8).toString('hex');
    const password_hash = await bcrypt.hash(newPassword, 12);

    await client.query(
      `UPDATE users SET password_hash = $1, password_changed_at = NOW(), failed_login_attempts = 0, account_locked_until = NULL WHERE id = $2`,
      [password_hash, id]
    );

    const user = await client.query('SELECT username FROM users WHERE id = $1', [id]);
    client.release();

    res.json({ message: '密码已重置', new_password: newPassword, username: user.rows[0]?.username });
  } catch (error) {
    res.status(500).json({ error: '重置密码失败' });
  }
});

// 获取用户详情
router.get('/users/:id', async (req, res) => {
  try {
    const client = await req.pool.connect();
    const result = await client.query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    client.release();

    if (result.rows.length === 0) return res.status(404).json({ error: '用户不存在' });
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取用户统计
router.get('/users/:id/stats', async (req, res) => {
  const { days = 30 } = req.query;

  try {
    const client = await req.pool.connect();
    const overallStats = await client.query(
      `SELECT COUNT(DISTINCT question_id) as total_questions,
        COUNT(CASE WHEN is_correct THEN 1 END) as correct_count,
        ROUND(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate
       FROM practice_history
       WHERE user_id = $1 AND practiced_at >= NOW() - INTERVAL '${days} days' AND is_admin_practice = false`,
      [req.params.id]
    );

    const categoryStats = await client.query(
      `SELECT q.exam_category, COUNT(*) as total_count,
        COUNT(CASE WHEN ph.is_correct THEN 1 END) as correct_count,
        ROUND(COUNT(CASE WHEN ph.is_correct THEN 1 END)::numeric / COUNT(*) * 100, 2) as accuracy_rate
       FROM practice_history ph JOIN questions q ON ph.question_id = q.id
       WHERE ph.user_id = $1 AND ph.practiced_at >= NOW() - INTERVAL '${days} days' AND ph.is_admin_practice = false
       GROUP BY q.exam_category ORDER BY total_count DESC`,
      [req.params.id]
    );

    client.release();
    res.json({ overall: overallStats.rows[0] || {}, by_category: categoryStats.rows });
  } catch (error) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

module.exports = router;
