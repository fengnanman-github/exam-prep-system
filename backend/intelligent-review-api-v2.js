/**
 * 优化的智能复习API - 整合题库分析和80分目标策略
 */

const express = require('express');
const {
  EnhancedSuperMemo,
  KnowledgeMasteryEstimator
} = require('./intelligent-review-engine');
const {
  ReviewStrategy,
  OptimizedReviewGenerator
} = require('./optimized-review-engine');

module.exports = (pool) => {
  const router = express.Router();

  /**
   * GET /api/v2/intelligent-review/v2/dashboard/:userId
   * 获取优化的智能复习仪表板（针对80分目标）
   */
  router.get('/dashboard/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 1. 获取用户统计数据
      const userStatsQuery = `
        -- 用户各知识点统计
        WITH user_stats AS (
          SELECT
            q.law_category,
            q.tech_category,
            q.exam_category,
            COUNT(DISTINCT ph.question_id) as practiced_count,
            COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct_count,
            ROUND(AVG(
              CASE
                WHEN ph.is_correct THEN 1
                ELSE 0
              END
            ), 3) as accuracy,
            MAX(ph.practiced_at) as last_practiced_at
          FROM practice_history ph
          JOIN questions q ON ph.question_id = q.id
          WHERE ph.user_id = $1
          GROUP BY q.law_category, q.tech_category, q.exam_category
        ),
        category_totals AS (
          SELECT
            q.law_category,
            q.tech_category,
            q.exam_category,
            COUNT(*) as total_questions
          FROM questions q
          WHERE q.law_category IS NOT NULL
          GROUP BY q.law_category, q.tech_category, q.exam_category
        ),
        combined AS (
          SELECT
            us.law_category,
            us.tech_category,
            us.exam_category,
            us.practiced_count,
            us.correct_count,
            us.accuracy,
            COALESCE(ct.total_questions, 0) as total_questions,
            ROUND(us.practiced_count::numeric / NULLIF(COALESCE(ct.total_questions, 0), 0), 3) as coverage,
            -- 预期得分（针对该考试类别）
            CASE
              WHEN ct.exam_category IS NOT NULL THEN
                (SELECT AVG(
                  CASE
                    WHEN ph.is_correct THEN 1
                    ELSE 0
                  END
                ) FROM practice_history ph
                JOIN questions q2 ON ph.question_id = q2.id
                WHERE ph.user_id = $1 AND q2.exam_category = ct.exam_category
                )
              ELSE NULL
            END as category_accuracy
          FROM user_stats us
          FULL OUTER JOIN category_totals ct ON us.law_category = ct.law_category AND us.tech_category = ct.tech_category AND us.exam_category = ct.exam_category
        )
        SELECT
          *,
          -- 是否达到80分目标（正确率>=80% 且 覆盖度>=60%）
          CASE
            WHEN accuracy >= 0.8 AND coverage >= 0.6 THEN true
            ELSE false
          end as meets_target,
          -- 考试权重
          COALESCE(
            (SELECT weight FROM exam_weights ew WHERE ew.exam_category = combined.exam_category),
            10
          ) as exam_weight
        FROM combined
        ORDER BY meets_target ASC, exam_weight DESC, accuracy ASC
      `;
      const userStatsResult = await pool.query(userStatsQuery, [userId]);

      // 2. 获取待复习题目（结合优先级算法）
      const dueQuestionsQuery = `
        WITH question_priority AS (
          SELECT
            wa.*,
            q.law_category,
            q.tech_category,
            q.exam_category,
            EXTRACT(EPOCH FROM (wa.next_review_time - NOW())) / 86400 as days_until_review,
            -- 计算优先级分数
            CASE
              WHEN wa.next_review_time <= NOW() THEN 100
              WHEN wa.next_review_time <= NOW() + INTERVAL '3 days' THEN 80
              WHEN wa.next_review_time <= NOW() + INTERVAL '7 days' THEN 60
              ELSE 40
            END as priority_score
          FROM wrong_answers wa
          JOIN questions q ON wa.question_id = q.id
          WHERE wa.user_id = $1
            AND wa.next_review_time <= NOW() + INTERVAL '14 days'
        )
        SELECT
          qp.*
        FROM question_priority qp
        ORDER BY priority_score DESC, days_until_review ASC
        LIMIT 30
      `;
      const dueQuestionsResult = await pool.query(dueQuestionsQuery, [userId]);

      // 计算优化优先级分数（在JavaScript中）
      const dueQuestionsWithPriority = dueQuestionsResult.rows.map(q => ({
        ...q,
        optimized_priority: ReviewStrategy.calculatePriorityScore(
          {
            exam_category: q.exam_category,
            total_questions: 1,
            accuracy: q.mastery_level || 0
          },
          { totalQuestionsByCategory: {} }
        )
      })).sort((a, b) => b.optimized_priority - a.optimized_priority);

      // 3. 识别薄弱知识点（针对80分目标）
      const weakPointsQuery = `
        WITH category_analysis AS (
          SELECT
            q.law_category,
            q.tech_category,
            q.exam_category,
            COUNT(DISTINCT ph.question_id) as practice_count,
            ROUND(AVG(
              CASE WHEN ph.is_correct THEN 1 ELSE 0 END
            ), 3) as accuracy,
            COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
            COUNT(*) as total_count,
            -- 计算该类别在考试中的权重
            COALESCE(
              (SELECT weight FROM exam_weights ew WHERE ew.exam_category = q.exam_category),
              10
            ) as exam_weight
          FROM practice_history ph
          JOIN questions q ON ph.question_id = q.id
          WHERE ph.user_id = $1
          GROUP BY q.law_category, q.tech_category, q.exam_category
          HAVING COUNT(DISTINCT ph.question_id) >= 3
        )
        SELECT
          *,
          -- 是否需要优先复习
          CASE
            WHEN exam_weight >= 20 AND accuracy < 0.7 THEN true
            WHEN exam_weight >= 30 AND accuracy < 0.8 THEN true
            WHEN accuracy < 0.6 THEN true
            ELSE false
          end as is_priority
        FROM category_analysis
        WHERE accuracy < 0.8
        ORDER BY is_priority DESC, exam_weight DESC, accuracy ASC
        LIMIT 10
      `;
      const weakPointsResult = await pool.query(weakPointsQuery, [userId]);

      // 4. 获取考试类别统计
      const examCategoryStatsQuery = `
        WITH exam_accuracy AS (
          SELECT
            q.exam_category,
            COUNT(DISTINCT ph.question_id) as practiced_count,
            COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct_count,
            ROUND(AVG(
              CASE WHEN ph.is_correct THEN 1 ELSE 0 END
            ), 3) as accuracy
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
          ea.exam_category,
          ea.accuracy,
          et.total_count,
          ROUND(ea.practiced_count::numeric / NULLIF(et.total_count, 0), 3) as coverage,
          -- 计算该类别预期得分
          ROUND(
            LEAST(ea.practiced_count::numeric / NULLIF(et.total_count, 0) / 0.6, 1) *
            ea.accuracy *
            COALESCE(
              (SELECT weight FROM exam_weights ew WHERE ew.exam_category = ea.exam_category),
              10
            ),
            2
          ) / 10 as expected_score,
          -- 是否达到80分目标
          CASE
            WHEN ROUND(
              LEAST(ea.practiced_count::numeric / NULLIF(et.total_count, 0) / 0.6, 1) *
              ea.accuracy *
              COALESCE(
                (SELECT weight FROM exam_weights ew WHERE ew.exam_category = ea.exam_category),
                10
              ),
              2
            ) / 10 >= 0.8
          THEN true
          ELSE false
          end as meets_target
        FROM exam_accuracy ea
        FULL OUTER JOIN exam_totals et ON ea.exam_category = et.exam_category
        ORDER BY et.total_count DESC
      `;
      const examCategoryStatsResult = await pool.query(examCategoryStatsQuery, [userId]);

      // 5. 计算总体预期得分
      const scoreAnalysis = ReviewStrategy.calculateExpectedScore(examCategoryStatsResult.rows);

      // 6. 生成优化的复习计划
      const dailyPlan = ReviewStrategy.generateOptimizedPlan({
        dueReviews: dueQuestionsWithPriority,
        weakPoints: weakPointsResult.rows,
        corePoints: [], // 从题库分析中获取
        newQuestions: 0,
        learnedToday: 0,
        examCategoryStats: examCategoryStatsResult.rows
      }, 50);

      res.json({
        success: true,
        data: {
          // 用户当前状态
          current_score: scoreAnalysis.total_score,
          gap_to_target: scoreAnalysis.gap_to_target,
          meets_target: scoreAnalysis.meets_target,
          score_breakdown: scoreAnalysis.details,

          // 考试类别分析
          exam_category_stats: examCategoryStatsResult.rows,

          // 待复习题目（按优化优先级排序）
          due_questions: dueQuestionsWithPriority,

          // 薄弱知识点（按80分目标筛选）
          weak_points: weakPointsResult.rows,

          // 优化的复习计划
          daily_plan: dailyPlan,

          // 得分建议
          score_recommendations: scoreAnalysis.recommendations,

          // 学习策略建议
          strategy_recommendations: generateStrategyRecommendations(scoreAnalysis),

          // 个性化学习路径
          study_path: generateStudyPath(scoreAnalysis.details)
        }
      });

    } catch (error) {
      console.error('获取优化仪表板失败:', error);
      res.status(500).json({
        success: false,
        message: '获取优化仪表板失败',
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/intelligent-review/v2/high-frequency-points
   * 获取高频考点分析
   */
  router.get('/high-frequency-points', async (req, res) => {
    try {
      // 分析题库，识别高频考点
      const highFreqQuery = `
        WITH category_analysis AS (
          SELECT
            q.law_category,
            q.tech_category,
            q.exam_category,
            COUNT(*) as question_count,
            COUNT(DISTINCT q.document_name) as document_count,
            -- 题型权重（多选5分，单选3分，判断2分）
            AVG(
              CASE
                WHEN q.question_type = '多项选择题' THEN 5
                WHEN q.question_type = '单项选择题' THEN 3
                WHEN q.question_type = '判断题' THEN 2
                ELSE 3
              END
            ) as avg_weight
          FROM questions q
          WHERE q.law_category IS NOT NULL AND q.tech_category IS NOT NULL
          GROUP BY q.law_category, q.tech_category, q.exam_category
        )
        SELECT
          *,
          -- 重要性分数（综合题目数量、文档覆盖、题型难度）
          (question_count / (SELECT MAX(question_count) FROM category_analysis) * 0.4 +
           document_count / (SELECT MAX(document_count) FROM category_analysis) * 0.3 +
           avg_weight / (SELECT MAX(avg_weight) FROM category_analysis) * 0.3
          ) * 100 as importance_score
        FROM category_analysis
        ORDER BY importance_score DESC
      `;
      const result = await pool.query(highFreqQuery);

      // 识别核心考点（Top 20%）
      const threshold = 0.7;
      const corePoints = result.rows
        .filter(row => row.importance_score >= threshold * 100)
        .slice(0, 15)
        .map((row, index) => ({
          ...row,
          rank: index + 1,
          importance_score: parseFloat(row.importance_score.toFixed(2))
        }));

      res.json({
        success: true,
        data: {
          all_points: result.rows,
          core_points: corePoints,
          summary: {
            total_categories: result.rows.length,
            core_points_count: corePoints.length,
            threshold: threshold
          }
        }
      });

    } catch (error) {
      console.error('获取高频考点失败:', error);
      res.status(500).json({
        success: false,
        message: '获取高频考点失败',
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/intelligent-review/v2/score-analysis/:userId
   * 获取得分分析和80分路径建议
   */
  router.get('/score-analysis/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 获取用户在各考试类别的表现
      const userPerformanceQuery = `
        WITH exam_accuracy AS (
          SELECT
            q.exam_category,
            COUNT(DISTINCT ph.question_id) as practiced_count,
          COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct_count,
          ROUND(AVG(CASE WHEN ph.is_correct THEN 1 ELSE 0 END), 3) as accuracy
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
          ea.exam_category,
          COALESCE(ea.accuracy, 0) as accuracy,
          COALESCE(ea.practiced_count, 0) as practiced_count,
          et.total_count,
          ROUND(COALESCE(ea.practiced_count, 0)::numeric / NULLIF(et.total_count, 0), 3) as coverage,
          -- 权重
          COALESCE(
            (SELECT weight FROM exam_weights ew WHERE ew.exam_category = ea.exam_category),
            10
          ) as weight
        FROM exam_accuracy ea
        FULL OUTER JOIN exam_totals et ON ea.exam_category = et.exam_category
        ORDER BY et.total_count DESC
      `;
      const performanceResult = await pool.query(userPerformanceQuery, [userId]);

      // 计算预期得分和差距
      let totalWeight = 0;
      let earnedWeight = 0;
      const categoryScores = [];

      performanceResult.rows.forEach(row => {
        const weight = row.weight;
        const accuracy = row.accuracy;
        const coverage = row.coverage;

        // 有效得分模型
        const effectiveCoverage = Math.min(coverage / 0.6, 1);
        const categoryScore = effectiveCoverage * accuracy;
        const earnedScore = categoryScore * weight;

        totalWeight += weight;
        earnedWeight += earnedScore;

        categoryScores.push({
          exam_category: row.exam_category,
          weight: weight,
          accuracy: accuracy,
          coverage: coverage,
          effective_coverage: effectiveCoverage,
          category_score: categoryScore,
          earned_score: earnedScore,
          target_score: weight * 0.8, // 80%目标
          gap: (weight * 0.8) - earnedScore,
          gap_percent: ((weight * 0.8 - earnedScore) / weight * 100).toFixed(1),
          meets_target: categoryScore >= 0.8,
          needs_work: categoryScore < 0.8,
          priority: (weight * 0.8 - earnedScore) // 缺口越大，优先级越高
        });
      });

      const totalScore = totalWeight > 0 ? (earnedWeight / totalWeight * 100) : 0;
      const gapTo80 = 80 - totalScore;

      // 生成学习路径建议
      const studyPath = generateStudyPath(categoryScores);

      res.json({
        success: true,
        data: {
          current_score: parseFloat(totalScore.toFixed(1)),
          gap_to_target: parseFloat(gapTo80.toFixed(1)),
          meets_target: totalScore >= 80,
          category_scores: categoryScores.sort((a, b) => b.priority - a.priority),
          study_path: studyPath,
          summary: {
            total_weight: totalWeight,
            earned_weight: earnedWeight,
            categories_meeting_target: categoryScores.filter(c => c.meets_target).length,
            categories_needing_work: categoryScores.filter(c => c.needs_work).length
          }
        }
      });

    } catch (error) {
      console.error('得分分析失败:', error);
      res.status(500).json({
        success: false,
        message: '得分分析失败',
        error: error.message
      });
    }
  });

  return router;
};

/**
 * 生成学习路径建议
 */
function generateStudyPath(categoryScores) {
  const path = {
    phase: [],
    total_duration_days: 0,
    expected_score_after: 0
  };

  // 按缺口大小排序
  const sortedByGap = categoryScores
    .filter(c => c.needs_work)
    .sort((a, b) => b.priority - a.priority);

  // 第一阶段：补齐最大缺口（7天）
  const phase1Categories = sortedByGap.slice(0, 2);
  if (phase1Categories.length > 0) {
    path.phase.push({
      phase: 1,
      name: '第一阶段：重点突破',
      duration_days: 7,
      focus_areas: phase1Categories.map(c => c.exam_category),
      daily_questions: 50,
      target_score: phase1Categories.reduce((sum, c) => sum + c.gap, 0) * 0.7,
      description: `集中精力补齐${phase1Categories.map(c => c.exam_category).join('、')}的分数缺口`
    });
    path.total_duration_days += 7;
    path.expected_score_after += phase1Categories.reduce((sum, c) => sum + c.gap, 0) * 0.7;
  }

  // 第二阶段：巩固提升（7天）
  const phase2Categories = sortedByGap.slice(2, 4);
  if (phase2Categories.length > 0) {
    path.phase.push({
      phase: 2,
      name: '第二阶段：巩固提升',
      duration_days: 7,
      focus_areas: phase2Categories.map(c => c.exam_category),
      daily_questions: 40,
      target_score: phase2Categories.reduce((sum, c) => sum + c.gap, 0) * 0.8,
      description: `巩固${phase2Categories.map(c => c.exam_category).join('、')}，将正确率提升到85%+`
    });
    path.total_duration_days += 7;
    path.expected_score_after += phase2Categories.reduce((sum, c) => sum + c.gap, 0) * 0.8;
  }

  // 第三阶段：全面冲刺（5-7天）
  path.phase.push({
    phase: 3,
    name: '第三阶段：全面冲刺',
    duration_days: 7,
    focus_areas: categoryScores.map(c => c.exam_category),
    daily_questions: 60,
    target_score: 80,
    description: '全面复习，查漏补缺，模拟考试'
  });
  path.total_duration_days += 7;
  path.expected_score_after = 80;

  return path;
}

/**
 * 生成学习策略建议
 */
function generateStrategyRecommendations(scoreAnalysis) {
  const recommendations = [];

  if (!scoreAnalysis.meets_target) {
    const gap = scoreAnalysis.gap_to_target;

    // 根据差距大小给出建议
    if (gap > 20) {
      recommendations.push({
        priority: 'critical',
        title: '差距较大，需要集中突破',
        description: `当前距离80分目标还有${gap.toFixed(1)}分差距，建议每天练习60-80道题目`,
        actions: [
          '重点练习得分率最低的考试类别',
          '增加每日练习量到60道以上',
          '优先掌握高频考点'
        ]
      });
    } else if (gap > 10) {
      recommendations.push({
        priority: 'high',
        title: '稳步提升，重点突破',
        description: `距离80分目标还有${gap.toFixed(1)}分差距，建议每天练习50道题目`,
        actions: [
          '针对薄弱知识点专项练习',
          '保持每日50道练习量',
          '定期复习错题'
        ]
      });
    } else {
      recommendations.push({
        priority: 'medium',
        title: '接近目标，最后冲刺',
        description: `距离80分目标仅差${gap.toFixed(1)}分，保持稳定发挥`,
        actions: [
          '全面复习，查漏补缺',
          '重点复习不确定的题目',
          '模拟考试练习'
        ]
      });
    }

    // 分析得分细节，给出针对性建议
    const weakCategories = scoreAnalysis.details
      .filter(d => !d.meets_target)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 2);

    weakCategories.forEach(category => {
      recommendations.push({
        priority: 'high',
        title: `${category.category}需要加强`,
        description: `该部分权重${category.weight}%，当前得分率${(category.category_score * 100).toFixed(1)}%`,
        actions: [
          `增加${category.category}练习量`,
          `重点复习该类别错题`,
          `掌握该类别核心考点`
        ]
      });
    });
  } else {
    recommendations.push({
      priority: 'low',
      title: '已达到80分目标',
      description: '继续保持，争取更高分数',
      actions: [
        '保持当前学习节奏',
        '适当增加难题练习',
        '定期复习避免遗忘'
      ]
    });
  }

  return recommendations;
}

// 考试权重表
const exam_weights = {
  '密码应用与安全性评估实务综合': 30,
  '密码技术基础及相关标准': 20,
  '密码产品原理、应用及相关标准': 20,
  '密评理论、技术及相关标准': 20,
  '密码政策法规': 10
};
