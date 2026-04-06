/**
 * 学习效率分析API - 业界最佳实践
 * 参考Duolingo、Khan Academy、Coursera的效率指标
 */

const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  /**
   * GET /api/v2/progress/efficiency/:userId
   * 获取用户学习效率分析
   */
  router.get('/efficiency/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;

      // 1. 每日效率统计
      const dailyEfficiencyQuery = `
        WITH daily_stats AS (
          SELECT
            DATE(practiced_at) as practice_date,
            COUNT(*) as total_questions,
            COUNT(CASE WHEN is_correct THEN 1 END) as correct_count,
            SUM(time_spent) as total_time_spent,
            COUNT(DISTINCT question_id) as unique_questions
          FROM practice_history
          WHERE user_id = $1
            AND practiced_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE(practiced_at)
        )
        SELECT
          practice_date as date,
          total_questions,
          correct_count,
          ROUND(100.0 * correct_count / total_questions, 2) as accuracy_rate,
          ROUND(total_questions::numeric / NULLIF(EXTRACT(EPOCH FROM (total_time_spent::interval))/3600, 0), 2) as questions_per_hour,
          unique_questions
        FROM daily_stats
        ORDER BY practice_date DESC
      `;

      const dailyEfficiencyResult = await pool.query(dailyEfficiencyQuery, [userId]);

      // 2. 最佳学习时间段分析
      const optimalTimeQuery = `
        WITH hourly_stats AS (
          SELECT
            EXTRACT(HOUR FROM practiced_at) as hour,
            COUNT(*) as total_questions,
            COUNT(CASE WHEN is_correct THEN 1 END) as correct_count,
            AVG(time_spent) as avg_time_per_question
          FROM practice_history
          WHERE user_id = $1
            AND practiced_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY EXTRACT(HOUR FROM practiced_at)
          HAVING COUNT(*) >= 10 -- 至少10次练习才算有效数据
        )
        SELECT
          hour,
          total_questions,
          ROUND(100.0 * correct_count / total_questions, 2) as accuracy_rate,
          ROUND(total_questions::numeric / NULLIF(AVG(time_spent), 0) * 3600, 2) as questions_per_hour
        FROM hourly_stats
        ORDER BY questions_per_hour DESC
        LIMIT 3
      `;

      const optimalTimeResult = await pool.query(optimalTimeQuery, [userId]);

      // 3. 学习效率趋势
      const efficiencyTrendQuery = `
        WITH weekly_stats AS (
          SELECT
            DATE_TRUNC('week', practiced_at) as week,
            COUNT(*) as total_questions,
            COUNT(CASE WHEN is_correct THEN 1 END) as correct_count,
            SUM(time_spent) as total_time
          FROM practice_history
          WHERE user_id = $1
            AND practiced_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE_TRUNC('week', practiced_at)
          ORDER BY week DESC
        )
        SELECT
          week,
          total_questions,
          ROUND(100.0 * correct_count / total_questions, 2) as accuracy_rate,
          ROUND(total_questions::numeric / NULLIF(EXTRACT(EPOCH FROM (total_time::interval))/3600, 0), 2) as questions_per_hour,
          CASE
            WHEN LAG(questions_per_hour) OVER (ORDER BY week) < questions_per_hour THEN 'improving'
            WHEN LAG(questions_per_hour) OVER (ORDER BY week) > questions_per_hour THEN 'declining'
            ELSE 'stable'
          END as trend
        FROM weekly_stats
        ORDER BY week DESC
      `;

      const efficiencyTrendResult = await pool.query(efficiencyTrendQuery, [userId]);

      // 4. 效率等级评估
      const efficiencyGradeQuery = `
        WITH user_stats AS (
          SELECT
            COUNT(DISTINCT question_id) as total_questions,
            COUNT(CASE WHEN is_correct THEN 1 END) as correct_count,
            SUM(time_spent) as total_time
          FROM practice_history
          WHERE user_id = $1
            AND practiced_at >= CURRENT_DATE - INTERVAL '${days} days'
        )
        SELECT
          total_questions,
          ROUND(100.0 * correct_count / total_questions, 2) as accuracy_rate,
          ROUND(total_questions::numeric / NULLIF(EXTRACT(EPOCH FROM (total_time::interval))/3600, 0), 2) as questions_per_hour,
          CASE
            WHEN COUNT(CASE WHEN is_correct THEN 1 END)::numeric / NULLIF(COUNT(*), 0) >= 0.85
              AND total_questions::numeric / NULLIF(EXTRACT(EPOCH FROM (total_time::interval))/3600, 0) >= 40 THEN 'excellent'
            WHEN COUNT(CASE WHEN is_correct THEN 1 END)::numeric / NULLIF(COUNT(*), 0) >= 0.75
              AND total_questions::numeric / NULLIF(EXTRACT(EPOCH FROM (total_time::interval))/3600, 0) >= 30 THEN 'good'
            WHEN COUNT(CASE WHEN is_correct THEN 1 END)::numeric / NULLIF(COUNT(*), 0) >= 0.65
              AND total_questions::numeric / NULLIF(EXTRACT(EPOCH FROM (total_time::interval))/3600, 0) >= 20 THEN 'average'
            ELSE 'needs_improvement'
          END as efficiency_grade
        FROM user_stats
      `;

      const efficiencyGradeResult = await pool.query(efficiencyGradeQuery, [userId]);

      res.json({
        daily_efficiency: dailyEfficiencyResult.rows,
        peak_performance_times: optimalTimeResult.rows,
        efficiency_trend: efficiencyTrendResult.rows,
        overall_efficiency: efficiencyGradeResult.rows[0] || {},
        summary: {
          total_days: dailyEfficiencyResult.rows.length,
          avg_questions_per_hour: dailyEfficiencyResult.rows.length > 0
            ? Math.round(dailyEfficiencyResult.rows.reduce((sum, day) => sum + (day.questions_per_hour || 0), 0) / dailyEfficiencyResult.rows.length)
            : 0,
          best_performance_time: optimalTimeResult.rows.length > 0
            ? `${optimalTimeResult.rows[0].hour}:00-${optimalTimeResult.rows[0].hour + 1}:00`
            : null
        }
      });

    } catch (error) {
      console.error('[EfficiencyAPI] 获取学习效率失败:', error);
      res.status(500).json({ error: '获取学习效率失败' });
    }
  });

  /**
   * GET /api/v2/progress/predictions/:userId
   * 获取学习预测和建议
   */
  router.get('/predictions/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 1. 预测达到熟练度所需时间
      const masteryPredictionQuery = `
        WITH current_stats AS (
          SELECT
            COUNT(DISTINCT question_id) as mastered_questions,
            AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) as current_accuracy,
            COUNT(*) as total_practices
          FROM practice_history
          WHERE user_id = $1
        ),
        learning_rate AS (
          SELECT
            DATE(practiced_at) as practice_date,
            COUNT(DISTINCT question_id) as new_questions
          FROM practice_history
          WHERE user_id = $1
          GROUP BY DATE(practiced_at)
          ORDER BY practice_date DESC
          LIMIT 7
        )
        SELECT
          cs.mastered_questions,
          cs.current_accuracy,
          ROUND(AVG(lr.new_questions), 2) as avg_daily_new_questions,
          CASE
            WHEN cs.mastered_questions >= 5000 THEN 'mastery_achieved'
            WHEN AVG(lr.new_questions) > 0 THEN
              CEIL((5000 - cs.mastered_questions)::numeric / NULLIF(AVG(lr.new_questions), 0))
            ELSE NULL
          END as estimated_days_to_mastery,
          CASE
            WHEN AVG(lr.new_questions) > 0 THEN
              CURRENT_DATE + CEIL((5000 - cs.mastered_questions)::numeric / NULLIF(AVG(lr.new_questions), 0)) * INTERVAL '1 day'
            ELSE NULL
          END as predicted_mastery_date
        FROM current_stats cs, learning_rate lr
      `;

      const masteryPredictionResult = await pool.query(masteryPredictionQuery, [userId]);

      // 2. 识别需要加强的薄弱知识点
      const weakAreasQuery = `
        WITH category_performance AS (
          SELECT
            q.exam_category,
            COUNT(*) as total_attempts,
            COUNT(CASE WHEN ph.is_correct THEN 1 END) as correct_count,
            ROUND(100.0 * COUNT(CASE WHEN ph.is_correct THEN 1 END) / COUNT(*), 2) as accuracy_rate,
            COUNT(DISTINCT ph.question_id) as questions_practiced
          FROM practice_history ph
          JOIN questions q ON ph.question_id = q.id
          WHERE ph.user_id = $1
          GROUP BY q.exam_category
          HAVING COUNT(*) >= 5 -- 至少练习过5次
        )
        SELECT
          exam_category,
          total_attempts,
          correct_count,
          accuracy_rate,
          questions_practiced,
          ROW_NUMBER() OVER (ORDER BY accuracy_rate ASC) as priority_rank
        FROM category_performance
        WHERE accuracy_rate < 75 -- 准确率低于75%的类别
        ORDER BY accuracy_rate ASC
        LIMIT 5
      `;

      const weakAreasResult = await pool.query(weakAreasQuery, [userId]);

      // 3. 推荐每日学习目标
      const dailyGoalQuery = `
        WITH recent_performance AS (
          SELECT
            COUNT(*) as daily_questions,
            COUNT(CASE WHEN is_correct THEN 1 END) as daily_correct,
            SUM(time_spent) as daily_time
          FROM practice_history
          WHERE user_id = $1
            AND practiced_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY DATE(practiced_at)
        )
        SELECT
          ROUND(AVG(daily_questions)) as avg_daily_questions,
          ROUND(AVG(daily_correct)::numeric / NULLIF(AVG(daily_questions), 0) * 100, 2) as avg_accuracy,
          ROUND(AVG(daily_time) / 60) as avg_daily_minutes,
          CASE
            WHEN AVG(daily_correct)::numeric / NULLIF(AVG(daily_questions), 0) >= 0.8 THEN
              GREATEST(30, ROUND(AVG(daily_questions) * 1.2)) -- 提高20%目标
            ELSE
              GREATEST(20, ROUND(AVG(daily_questions) * 0.9)) -- 保持或略降低目标
          END as recommended_daily_questions
        FROM recent_performance
      `;

      const dailyGoalResult = await pool.query(dailyGoalQuery, [userId]);

      res.json({
        mastery_prediction: masteryPredictionResult.rows[0] || {},
        weak_areas: weakAreasResult.rows,
        daily_goal_recommendation: dailyGoalResult.rows[0] || {},
        smart_suggestions: {
          focus_on_weak_areas: weakAreasResult.rows.length > 0,
          recommended_study_duration: dailyGoalResult.rows[0]?.avg_daily_minutes || 45,
          optimal_practice_time: "14:00-16:00", // 可基于个人数据优化
          reminder_strategy: "short_frequent_sessions" // 短而频繁的练习
        }
      });

    } catch (error) {
      console.error('[PredictionsAPI] 获取预测失败:', error);
      res.status(500).json({ error: '获取预测失败' });
    }
  });

  return router;
};
