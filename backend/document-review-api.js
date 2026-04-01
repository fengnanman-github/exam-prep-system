/**
 * 按文档复习 API
 * 提供基于原始法律法规和标准的复习功能
 */

const express = require('express');
const DOCUMENT_CATEGORIES = require('./document-categories.js');

module.exports = (pool) => {
  const router = express.Router();

/**
 * GET /api/v2/documents
 * 获取所有文档列表（按优先级排序）
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.user_id || 'exam_user_001';

    // 使用与统一统计API相同的去重逻辑
    const query = `
      SELECT
        q.original_document as document_name,
        q.document_category,
        q.document_priority,
        COUNT(*) as total_questions,
        COUNT(DISTINCT ph.question_id) as practiced_questions,
        COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct_questions
      FROM questions q
      LEFT JOIN (
        SELECT DISTINCT question_id, is_correct
        FROM practice_history
        WHERE user_id = $1
      ) ph ON q.id = ph.question_id
      WHERE q.original_document IS NOT NULL
      GROUP BY q.original_document, q.document_category, q.document_priority
      ORDER BY q.document_priority DESC, total_questions DESC
    `;

    const result = await pool.query(query, [userId]);

    // 添加文档分类的详细信息
    const documents = result.rows.map(row => {
      const docInfo = DOCUMENT_CATEGORIES[row.document_name];
      return {
        ...row,
        icon: docInfo?.icon || '📄',
        color: docInfo?.color || '#6b7280',
        description: docInfo?.description || '',
        accuracy: row.total_questions > 0
          ? Math.round((row.correct_questions / row.total_questions) * 100 * 10) / 10
          : '0.0',
        category_label: docInfo?.category || '其他'
      };
    });

    res.json(documents);
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ error: '获取文档列表失败' });
  }
});

/**
 * GET /api/v2/documents/:documentName/questions
 * 获取特定文档的题目
 */
router.get('/:documentName/questions', async (req, res) => {
  try {
    const { documentName } = req.params;
    const userId = req.query.user_id || 'exam_user_001';
    const limit = parseInt(req.query.limit) || 50;
    const excludePracticed = req.query.exclude_practiced === 'true';

    let query = `
      SELECT
        q.*,
        EXISTS (
          SELECT 1 FROM practice_history ph
          WHERE ph.question_id = q.id AND ph.user_id = $1
        ) as is_practiced
      FROM questions q
      WHERE q.original_document = $2
    `;

    const params = [userId, documentName];

    if (excludePracticed) {
      query += ` AND NOT EXISTS (
        SELECT 1 FROM practice_history ph
        WHERE ph.question_id = q.id AND ph.user_id = $3
      )`;
      params.push(userId);
    }

    query += ` ORDER BY RANDOM()
             LIMIT $${params.length + 1}`;

    params.push(limit);

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('获取文档题目失败:', error);
    res.status(500).json({ error: '获取文档题目失败' });
  }
});

/**
 * GET /api/v2/documents/stats
 * 获取文档复习统计
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.user_id || 'exam_user_001';

    const query = `
      WITH doc_stats AS (
        SELECT
          document_priority,
          COUNT(*) as total_docs,
          SUM(total_questions) as total_questions,
          SUM(practiced_questions) as practiced_questions,
          SUM(correct_questions) as correct_questions
        FROM (
          SELECT
            original_document,
            document_priority,
            COUNT(*) as total_questions,
            COUNT(*) FILTER (WHERE id IN (
              SELECT question_id FROM practice_history WHERE user_id = $1
            )) as practiced_questions,
            COUNT(*) FILTER (WHERE id IN (
              SELECT question_id FROM practice_history
              WHERE user_id = $1 AND is_correct = true
            )) as correct_questions
          FROM questions
          WHERE original_document IS NOT NULL
          GROUP BY original_document, document_priority
        ) subq
        GROUP BY document_priority
      )
      SELECT
        document_priority,
        total_docs,
        total_questions,
        practiced_questions,
        correct_questions,
        CASE
          WHEN total_questions > 0 THEN ROUND((correct_questions::NUMERIC / total_questions) * 100, 2)
          ELSE 0
        END as overall_accuracy
      FROM doc_stats
      ORDER BY document_priority DESC
    `;

    const result = await pool.query(query, [userId]);

    // 按优先级分组统计
    const stats = {
      priority5: { label: '核心必考', ...result.rows.find(r => r.document_priority === 5) || { total_docs: 0, total_questions: 0, practiced_questions: 0, correct_questions: 0 } },
      priority4: { label: '重要考点', ...result.rows.find(r => r.document_priority === 4) || { total_docs: 0, total_questions: 0, practiced_questions: 0, correct_questions: 0 } },
      priority3: { label: '一般考点', ...result.rows.find(r => r.document_priority === 3) || { total_docs: 0, total_questions: 0, practiced_questions: 0, correct_questions: 0 } },
      priority2: { label: '补充考点', ...result.rows.find(r => r.document_priority === 2) || { total_docs: 0, total_questions: 0, practiced_questions: 0, correct_questions: 0 } },
      priority1: { label: '其他', ...result.rows.find(r => r.document_priority === 1) || { total_docs: 0, total_questions: 0, practiced_questions: 0, correct_questions: 0 } }
    };

    // 计算总体进度
    const total = result.rows.reduce((sum, row) => ({
      total_docs: sum.total_docs + row.total_docs,
      total_questions: sum.total_questions + row.total_questions,
      practiced_questions: sum.practiced_questions + row.practiced_questions,
      correct_questions: sum.correct_questions + row.correct_questions
    }), { total_docs: 0, total_questions: 0, practiced_questions: 0, correct_questions: 0 });

    stats.overall = {
      total_documents: total.total_docs,
      total_questions: total.total_questions,
      practiced_questions: total.practiced_questions,
      correct_questions: total.correct_questions,
      accuracy: total.total_questions > 0
        ? ((total.correct_questions / total.total_questions) * 100).toFixed(2)
        : '0.0'
    };

    res.json(stats);
  } catch (error) {
    console.error('获取文档统计失败:', error);
    res.status(500).json({ error: '获取文档统计失败' });
  }
});

/**
 * GET /api/v2/documents/recommend
 * 获取推荐复习文档（基于优先级和薄弱环节）
 */
router.get('/recommend', async (req, res) => {
  try {
    const userId = req.query.user_id || 'exam_user_001';
    const limit = parseInt(req.query.limit) || 5;

    // 获取准确率低的优先级高的文档
    const query = `
      SELECT
        original_document as document_name,
        document_priority,
        document_category,
        COUNT(*) as total_questions,
        COUNT(*) FILTER (WHERE id IN (
          SELECT question_id FROM practice_history WHERE user_id = $1
        )) as practiced_questions,
        COUNT(*) FILTER (WHERE id IN (
          SELECT question_id FROM practice_history
          WHERE user_id = $1 AND is_correct = true
        )) as correct_questions,
        CASE
          WHEN COUNT(*) FILTER (WHERE id IN (
            SELECT question_id FROM practice_history WHERE user_id = $1
          )) > 0 THEN
            (COUNT(*) FILTER (WHERE id IN (
              SELECT question_id FROM practice_history
              WHERE user_id = $1 AND is_correct = true
            ))::NUMERIC /
             COUNT(*) FILTER (WHERE id IN (
              SELECT question_id FROM practice_history WHERE user_id = $1
             ))) * 100
          ELSE 0
        END as accuracy
      FROM questions
      WHERE original_document IS NOT NULL
      GROUP BY original_document, document_priority, document_category
      HAVING COUNT(*) > 0
      ORDER BY
        document_priority DESC,
        accuracy ASC,
        practiced_questions ASC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);

    const recommendations = result.rows.map(row => {
      const docInfo = DOCUMENT_CATEGORIES[row.document_name];
      const accuracy = parseFloat(row.accuracy) || 0;

      let reason = '';
      if (row.practiced_questions === 0) {
        reason = '尚未练习';
      } else if (accuracy < 60) {
        reason = '需要加强';
      } else if (accuracy < 80) {
        reason = '继续巩固';
      } else {
        reason = '掌握良好';
      }

      return {
        document_name: row.document_name,
        document_priority: row.document_priority,
        document_category: row.document_category,
        total_questions: parseInt(row.total_questions),
        practiced_questions: parseInt(row.practiced_questions),
        correct_questions: parseInt(row.correct_questions),
        accuracy: accuracy.toFixed(1),
        reason,
        icon: docInfo?.icon || '📄',
        color: docInfo?.color || '#6b7280',
        description: docInfo?.description || ''
      };
    });

    res.json(recommendations);
  } catch (error) {
    console.error('获取推荐文档失败:', error);
    res.status(500).json({ error: '获取推荐文档失败' });
  }
});

/**
 * 批量更新题目的文档字段
 * 用于初始化或更新文档分类
 */
router.post('/update-metadata', async (req, res) => {
  try {
    // 这里应该有管理员权限检查
    // 暂时跳过，实际使用时需要添加

    const updates = [];

    // 从 DOCUMENT_CATEGORIES 生成更新语句
    for (const [docName, docInfo] of Object.entries(DOCUMENT_CATEGORIES)) {
      const keywords = docInfo.keywords || [docName];
      const conditions = keywords.map(k => `question_text ILIKE '%${k}%'`).join(' OR ');

      updates.push({
        document: docName,
        category: docInfo.category,
        priority: docInfo.priority,
        sql: `
          UPDATE questions
          SET
            original_document = '${docName}',
            document_category = '${docInfo.category}',
            document_priority = ${docInfo.priority}
          WHERE original_document IS NULL
            AND (${conditions})
        `
      });
    }

    // 执行更新
    let updatedCount = 0;
    for (const update of updates) {
      try {
        const result = await pool.query(update.sql);
        updatedCount += result.rowCount || 0;
      } catch (error) {
        console.error(`更新 ${update.document} 失败:`, error.message);
      }
    }

    res.json({
      message: '文档元数据更新完成',
      updated_count: updatedCount,
      total_documents: Object.keys(DOCUMENT_CATEGORIES).length
    });
  } catch (error) {
    console.error('更新文档元数据失败:', error);
    res.status(500).json({ error: '更新文档元数据失败' });
  }
});

  return router;
};
