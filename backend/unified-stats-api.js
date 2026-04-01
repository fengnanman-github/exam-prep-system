/**
 * 统一的用户统计API
 * 确保文档、分类、练习等各个页面的统计信息保持一致
 */

const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  /**
   * GET /api/v2/stats/user/:userId
   * 获取用户的统一统计数据
   */
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 1. 基础统计（去重后的练习题数）
      const baseStatsQuery = `
        SELECT
          COUNT(DISTINCT question_id) as practiced_questions,
          COUNT(*) FILTER (WHERE is_correct = true) as correct_answers,
          COUNT(*) FILTER (WHERE is_correct = false) as wrong_answers,
          ROUND(AVG(CASE WHEN is_correct THEN 1 ELSE 0 END), 4) as accuracy_rate
        FROM practice_history
        WHERE user_id = $1
      `;

      const baseStatsResult = await pool.query(baseStatsQuery, [userId]);
      const baseStats = baseStatsResult.rows[0];

      // 2. 题库总数
      const totalQuestionsQuery = `SELECT COUNT(*) as total FROM questions`;
      const totalResult = await pool.query(totalQuestionsQuery);
      const totalQuestions = parseInt(totalResult.rows[0].total);

      // 3. 题型分布统计
      const typeDistributionQuery = `
        SELECT
          q.question_type,
          COUNT(*) as total,
          COUNT(ph.question_id) as practiced,
          COUNT(ph.question_id) FILTER (WHERE ph.is_correct = true) as correct
        FROM questions q
        LEFT JOIN (
          SELECT DISTINCT question_id, is_correct
          FROM practice_history
          WHERE user_id = $1
        ) ph ON q.id = ph.question_id
        GROUP BY q.question_type
        ORDER BY q.question_type
      `;
      const typeResult = await pool.query(typeDistributionQuery, [userId]);

      // 4. 按文档统计
      const documentStatsQuery = `
        SELECT
          q.original_document,
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
      const documentResult = await pool.query(documentStatsQuery, [userId]);

      // 5. 按法律法规分类统计
      const lawCategoryStatsQuery = `
        SELECT
          q.law_category,
          COUNT(*) as total_questions,
          COUNT(DISTINCT ph.question_id) as practiced_questions,
          COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct_questions
        FROM questions q
        LEFT JOIN (
          SELECT DISTINCT question_id, is_correct
          FROM practice_history
          WHERE user_id = $1
        ) ph ON q.id = ph.question_id
        WHERE q.law_category IS NOT NULL
        GROUP BY q.law_category
        ORDER BY practiced_questions DESC
      `;
      const lawCategoryResult = await pool.query(lawCategoryStatsQuery, [userId]);

      // 6. 按技术专业分类统计
      const techCategoryStatsQuery = `
        SELECT
          q.tech_category,
          COUNT(*) as total_questions,
          COUNT(DISTINCT ph.question_id) as practiced_questions,
          COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct_questions
        FROM questions q
        LEFT JOIN (
          SELECT DISTINCT question_id, is_correct
          FROM practice_history
          WHERE user_id = $1
        ) ph ON q.id = ph.question_id
        WHERE q.tech_category IS NOT NULL
        GROUP BY q.tech_category
        ORDER BY practiced_questions DESC
      `;
      const techCategoryResult = await pool.query(techCategoryStatsQuery, [userId]);

      // 6. 按考试类别统计（密评考试5大类别）
      const examCategoryStatsQuery = `
        SELECT
          q.exam_category,
          COUNT(*) as total_questions,
          COUNT(DISTINCT ph.question_id) as practiced_questions,
          COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct_questions
        FROM questions q
        LEFT JOIN (
          SELECT DISTINCT question_id, is_correct
          FROM practice_history
          WHERE user_id = $1
        ) ph ON q.id = ph.question_id
        WHERE q.exam_category IS NOT NULL
        GROUP BY q.exam_category
        ORDER BY
          CASE q.exam_category
            WHEN '密码应用与安全性评估实务综合' THEN 1
            WHEN '密码技术基础及相关标准' THEN 2
            WHEN '密码产品原理、应用及相关标准' THEN 3
            WHEN '密评理论、技术及相关标准' THEN 4
            WHEN '密码政策法规' THEN 5
          END
      `;
      const examCategoryResult = await pool.query(examCategoryStatsQuery, [userId]);

      // 7. 错题统计
      const wrongAnswersQuery = `
        SELECT
          COUNT(DISTINCT question_id) as total_wrong,
          SUM(wrong_count) as total_errors
        FROM wrong_answers
        WHERE user_id = $1
      `;
      const wrongResult = await pool.query(wrongAnswersQuery, [userId]);

      // 组装返回数据
      const stats = {
        // 总体统计
        overall: {
          total_questions: totalQuestions,
          practiced_questions: parseInt(baseStats.practiced_questions) || 0,
          correct_answers: parseInt(baseStats.correct_answers) || 0,
          wrong_answers: parseInt(baseStats.wrong_answers) || 0,
          remaining_questions: totalQuestions - parseInt(baseStats.practiced_questions) || 0,
          accuracy_rate: parseFloat(baseStats.accuracy_rate) || 0,
          completion_rate: totalQuestions > 0
            ? (parseInt(baseStats.practiced_questions) / totalQuestions)
            : 0
        },

        // 错题统计
        wrong_answers: {
          total_wrong: parseInt(wrongResult.rows[0].total_wrong) || 0,
          total_errors: parseInt(wrongResult.rows[0].total_errors) || 0
        },

        // 题型分布
        by_type: typeResult.rows.map(row => ({
          question_type: row.question_type,
          total: parseInt(row.total),
          practiced: parseInt(row.practiced),
          correct: parseInt(row.correct),
          accuracy: row.total > 0 ? (row.correct / row.total) : 0
        })),

        // 文档统计
        by_document: documentResult.rows.map(row => ({
          document_name: row.original_document,
          category: row.document_category,
          priority: parseInt(row.document_priority),
          total: parseInt(row.total_questions),
          practiced: parseInt(row.practiced_questions),
          correct: parseInt(row.correct_questions),
          accuracy: row.total > 0 ? (row.correct_questions / row.total) : 0
        })),

        // 法律法规分类统计
        by_law_category: lawCategoryResult.rows.map(row => ({
          category: row.law_category,
          total: parseInt(row.total_questions),
          practiced: parseInt(row.practiced_questions),
          correct: parseInt(row.correct_questions),
          accuracy: row.total > 0 ? (row.correct_questions / row.total) : 0
        })),

        // 技术专业分类统计
        by_tech_category: techCategoryResult.rows.map(row => ({
          category: row.tech_category,
          total: parseInt(row.total_questions),
          practiced: parseInt(row.practiced_questions),
          correct: parseInt(row.correct_questions),
          accuracy: row.total > 0 ? (row.correct_questions / row.total) : 0
        })),

        // 考试类别统计（密评考试5大类别）
        by_exam_category: examCategoryResult.rows.map(row => ({
          category: row.exam_category,
          total: parseInt(row.total_questions),
          practiced: parseInt(row.practiced_questions),
          correct: parseInt(row.correct_questions),
          accuracy: row.total_questions > 0 ? (row.correct_questions / row.total_questions) : 0
        }))
      };

      res.json(stats);
    } catch (error) {
      console.error('获取用户统计失败:', error);
      res.status(500).json({ error: '获取用户统计失败' });
    }
  });

  return router;
};
