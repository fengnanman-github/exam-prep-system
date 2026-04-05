/**
 * 题库深度分析脚本
 * 分析高频考点、考试重点分布
 */

const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  /**
   * GET /api/v2/analysis/high-frequency-points
   * 分析高频考点
   */
  router.get('/high-frequency-points', async (req, res) => {
    try {
      // 1. 统计各法律大类的题目数量
      const lawCategoryQuery = `
        SELECT
          law_category,
          COUNT(*) as total_questions,
          COUNT(DISTINCT tech_category) as tech_categories_count,
          COUNT(DISTINCT original_document) as documents_count,
          STRING_AGG(question_type, ',') as question_types
        FROM questions
        WHERE law_category IS NOT NULL
        GROUP BY law_category
        ORDER BY total_questions DESC
      `;
      const lawCategoryResult = await pool.query(lawCategoryQuery);

      // 2. 统计各技术类别的题目数量
      const techCategoryQuery = `
        SELECT
          law_category,
          tech_category,
          COUNT(*) as total_questions,
          AVG(
            CASE
              WHEN question_type = '单项选择题' THEN 3
              WHEN question_type = '多项选择题' THEN 5
              WHEN question_type = '判断题' THEN 2
              ELSE 3
            END
          ) as avg_weight,
          STRING_AGG(question_type, ',') as question_types
        FROM questions
        WHERE tech_category IS NOT NULL
        GROUP BY law_category, tech_category
        ORDER BY total_questions DESC
      `;
      const techCategoryResult = await pool.query(techCategoryQuery);

      // 3. 统计各文档的题目数量
      const documentQuery = `
        SELECT
          law_category,
          original_document,
          COUNT(*) as total_questions,
          COUNT(DISTINCT tech_category) as tech_categories_count
        FROM questions
        WHERE original_document IS NOT NULL
        GROUP BY law_category, original_document
        ORDER BY total_questions DESC
      `;
      const documentResult = await pool.query(documentQuery);

      // 4. 分析考试类别分布
      const examCategoryQuery = `
        SELECT
          exam_category,
          COUNT(*) as total_questions,
          COUNT(DISTINCT law_category) as law_categories_count,
          COUNT(DISTINCT tech_category) as tech_categories_count
        FROM questions
        WHERE exam_category IS NOT NULL
        GROUP BY exam_category
        ORDER BY total_questions DESC
      `;
      const examCategoryResult = await pool.query(examCategoryQuery);

      // 5. 题型分布统计
      const questionTypeQuery = `
        SELECT
          question_type,
          COUNT(*) as total_questions,
          ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM questions) * 100, 2) as percentage
        FROM questions
        GROUP BY question_type
        ORDER BY total_questions DESC
      `;
      const questionTypeResult = await pool.query(questionTypeQuery);

      // 6. 计算考点重要性分数
      // 重要性 = (题目数量 × 0.4) + (文档覆盖度 × 0.3) + (考试类别覆盖 × 0.3)
      const importanceQuery = `
        WITH category_stats AS (
          SELECT
            law_category,
            tech_category,
            COUNT(*) as question_count,
            COUNT(DISTINCT original_document) as document_count,
            COUNT(DISTINCT exam_category) as exam_count,
            AVG(
              CASE
                WHEN question_type = '多项选择题' THEN 5
                WHEN question_type = '单项选择题' THEN 3
                WHEN question_type = '判断题' THEN 2
                ELSE 3
              END
            ) as avg_weight
          FROM questions
          WHERE law_category IS NOT NULL AND tech_category IS NOT NULL
          GROUP BY law_category, tech_category
        )
        SELECT
          *,
          -- 题目数量分数（0-40分）
          (question_count / (SELECT MAX(question_count) FROM category_stats) * 40) as question_score,
          -- 文档覆盖度分数（0-30分）
          (document_count / (SELECT MAX(document_count) FROM category_stats) * 30) as document_score,
          -- 考试类别覆盖度分数（0-30分）
          (exam_count / (SELECT MAX(exam_count) FROM category_stats) * 30) as exam_score,
          -- 总分
          (question_count / (SELECT MAX(question_count) FROM category_stats) * 40 +
           document_count / (SELECT MAX(document_count) FROM category_stats) * 30 +
           exam_count / (SELECT MAX(exam_count) FROM category_stats) * 30) as total_importance_score
        FROM category_stats
        ORDER BY total_importance_score DESC
      `;
      const importanceResult = await pool.query(importanceQuery);

      // 7. 识别核心考点（Top 20%）
      const corePointsThreshold = 0.8;
      const corePoints = importanceResult.rows
        .filter(row => row.total_importance_score >= corePointsThreshold * 100)
        .slice(0, 20)
        .map(row => ({
          law_category: row.law_category,
          tech_category: row.tech_category,
          importance_score: parseFloat(row.total_importance_score.toFixed(2)),
          question_count: parseInt(row.question_count),
          rank: importanceResult.rows.findIndex(r => r === row) + 1
        }));

      res.json({
        success: true,
        data: {
          law_categories: lawCategoryResult.rows,
          tech_categories: techCategoryResult.rows,
          documents: documentResult.rows,
          exam_categories: examCategoryResult.rows,
          question_types: questionTypeResult.rows,
          importance_ranking: importanceResult.rows,
          core_points: corePoints,
          summary: {
            total_questions: parseInt((await pool.query('SELECT COUNT(*) FROM questions')).rows[0].count),
            total_law_categories: lawCategoryResult.rows.length,
            total_tech_categories: techCategoryResult.rows.length,
            total_documents: documentResult.rows.length,
            core_points_count: corePoints.length,
            high_frequency_threshold: corePointsThreshold
          }
        }
      });

    } catch (error) {
      console.error('分析高频考点失败:', error);
      res.status(500).json({
        success: false,
        message: '分析高频考点失败',
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/analysis/user-gaps/:userId
   * 分析用户知识缺口（针对80分目标）
   */
  router.get('/user-gaps/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 1. 获取用户练习统计
      const userStatsQuery = `
        WITH user_practice AS (
          SELECT
            q.law_category,
            q.tech_category,
            COUNT(DISTINCT ph.question_id) as practiced_count,
            COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct_count,
            ROUND(
              COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true)::numeric /
              NULLIF(COUNT(DISTINCT ph.question_id), 0), 3
            ) as accuracy
          FROM practice_history ph
          JOIN questions q ON ph.question_id = q.id
          WHERE ph.user_id = $1
          GROUP BY q.law_category, q.tech_category
        ),
        category_totals AS (
          SELECT
            law_category,
            tech_category,
            COUNT(*) as total_count
          FROM questions
          WHERE law_category IS NOT NULL AND tech_category IS NOT NULL
          GROUP BY law_category, tech_category
        ),
        combined AS (
          SELECT
            up.law_category,
            up.tech_category,
            up.practiced_count,
            up.correct_count,
            up.accuracy,
            ct.total_count,
            -- 掌握度（已练习/总数）
          ROUND(up.practiced_count::numeric / NULLIF(ct.total_count, 0), 3) as coverage,
          -- 是否达到80%目标（正确率>=80% 且 覆盖度>=60%）
          CASE
            WHEN up.accuracy >= 0.8 AND up.practiced_count::numeric / ct.total_count >= 0.6 THEN true
            ELSE false
          end as meets_target
          FROM user_practice up
          FULL OUTER JOIN category_totals ct ON up.law_category = ct.law_category AND up.tech_category = ct.tech_category
        )
        SELECT
          *,
          -- 缺口类型
          CASE
            WHEN practiced_count IS NULL THEN 'unstarted'
            WHEN coverage < 0.3 THEN 'barely_started'
            WHEN coverage < 0.6 THEN 'in_progress'
            WHEN accuracy < 0.6 THEN 'weak_mastery'
            WHEN accuracy < 0.8 THEN 'needs_improvement'
            ELSE 'on_track'
          end as gap_type,
          -- 优先级分数（用于复习排序）
          CASE
            WHEN practiced_count IS NULL THEN 100
            WHEN accuracy < 0.5 THEN 90
            WHEN accuracy < 0.6 THEN 80
            WHEN coverage < 0.3 THEN 70
            WHEN coverage < 0.6 THEN 60
            WHEN accuracy < 0.8 THEN 40
            ELSE 10
          end as priority_score
        FROM combined
        ORDER BY priority_score DESC, total_count DESC
      `;
      const result = await pool.query(userStatsQuery, [userId]);

      // 2. 分析用户在各考试类别的表现
      const examCategoryStatsQuery = `
        WITH user_exam_stats AS (
          SELECT
            q.exam_category,
            COUNT(DISTINCT ph.question_id) as practiced_count,
            COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct_count,
            ROUND(
              COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true)::numeric /
              NULLIF(COUNT(DISTINCT ph.question_id), 0), 3
            ) as accuracy
          FROM practice_history ph
          JOIN questions q ON ph.question_id = q.id
          WHERE ph.user_id = $1 AND q.exam_category IS NOT NULL
          GROUP BY q.exam_category
        ),
        exam_totals AS (
          SELECT
            exam_category,
            COUNT(*) as total_count
          FROM questions
          WHERE exam_category IS NOT NULL
          GROUP BY exam_category
        )
        SELECT
          ue.exam_category,
          ue.practiced_count,
          ue.accuracy,
          et.total_count,
          ROUND(ue.practiced_count::numeric / NULLIF(et.total_count, 0), 3) as coverage,
          CASE
            WHEN ue.accuracy >= 0.8 AND ue.practiced_count::numeric / et.total_count >= 0.6 THEN true
            ELSE false
          end as meets_target
        FROM user_exam_stats ue
        FULL OUTER JOIN exam_totals et ON ue.exam_category = et.exam_category
        ORDER BY et.total_count DESC
      `;
      const examCategoryResult = await pool.query(examCategoryStatsQuery, [userId]);

      // 3. 识别关键缺口（阻碍达到80分的知识点）
      const criticalGaps = result.rows.filter(row => !row.meets_target).slice(0, 10);

      // 4. 计算预期得分
      const expectedScore = calculateExpectedScore(examCategoryResult.rows);

      res.json({
        success: true,
        data: {
          category_gaps: result.rows,
          exam_category_stats: examCategoryResult.rows,
          critical_gaps: criticalGaps,
          expected_score: expectedScore,
          summary: {
            total_categories: result.rows.length,
            categories_meeting_target: result.rows.filter(r => r.meets_target).length,
            categories_needing_work: result.rows.filter(r => !r.meets_target).length,
            current_expected_score: expectedScore,
            gap_to_target: 80 - expectedScore
          }
        }
      });

    } catch (error) {
      console.error('分析用户缺口失败:', error);
      res.status(500).json({
        success: false,
        message: '分析用户缺口失败',
        error: error.message
      });
    }
  });

  return router;
};

/**
 * 计算预期得分
 */
function calculateExpectedScore(examCategoryStats) {
  let totalWeight = 0;
  let earnedWeight = 0;

  const weights = {
    '密码应用与安全性评估实务综合': 30,
    '密码技术基础及相关标准': 20,
    '密码产品原理、应用及相关标准': 20,
    '密评理论、技术及相关标准': 20,
    '密码政策法规': 10
  };

  examCategoryStats.forEach(stat => {
    const weight = weights[stat.exam_category] || 10;
    const accuracy = stat.accuracy || 0;
    const coverage = stat.coverage || 0;

    // 考试得分 = 正确率 × 覆盖度 × 权重
    // 假设：覆盖度60%时，该部分题目可以全部答对
    const effectiveScore = Math.min(coverage / 0.6, 1) * accuracy;

    totalWeight += weight;
    earnedWeight += effectiveScore * weight;
  });

  return totalWeight > 0 ? (earnedWeight / totalWeight * 100) : 0;
}
