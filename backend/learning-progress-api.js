/**
 * 学习进度API - 科学化学习进度系统
 * 参考业界最佳实践：Duolingo、Anki、Coursera、Khan Academy
 */

const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  /**
   * GET /api/v2/progress/summary/:userId
   * 获取用户学习总览（Dashboard数据）
   */
  router.get('/summary/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 1. 基础统计
      const baseStatsQuery = `
        SELECT
          COUNT(DISTINCT question_id) as practiced_questions,
          COUNT(DISTINCT question_id) FILTER (WHERE is_correct = true) as correct_answers,
          COUNT(DISTINCT question_id) FILTER (WHERE is_correct = false) as wrong_answers,
          ROUND(
            COUNT(DISTINCT question_id) FILTER (WHERE is_correct = true)::numeric /
            NULLIF(COUNT(DISTINCT question_id), 0), 4
          ) as accuracy_rate
        FROM practice_history
        WHERE user_id = $1
      `;
      const baseStatsResult = await pool.query(baseStatsQuery, [userId]);
      const baseStats = baseStatsResult.rows[0];

      // 2. 连续学习天数（Streak）
      const streakQuery = `
        WITH daily_records AS (
          SELECT DISTINCT DATE(practiced_at) as practice_date
          FROM practice_history
          WHERE user_id = $1
          ORDER BY practice_date DESC
        ),
        streak_calculation AS (
          SELECT
            practice_date,
            practice_date - (ROW_NUMBER() OVER (ORDER BY practice_date DESC))::integer * INTERVAL '1 day' as streak_group
          FROM daily_records
        )
        SELECT
          COUNT(*) as current_streak,
          (SELECT COUNT(*) + 1 FROM streak_calculation WHERE practice_date > CURRENT_DATE - INTERVAL '30 days') as best_streak
        FROM streak_calculation
        WHERE streak_group = (SELECT streak_group FROM streak_calculation ORDER BY practice_date DESC LIMIT 1)
      `;
      const streakResult = await pool.query(streakQuery, [userId]);
      const streak = streakResult.rows[0];

      // 3. 本周学习天数
      const weekStatsQuery = `
        SELECT
          COUNT(DISTINCT DATE(practiced_at)) as week_days,
          COUNT(DISTINCT question_id) as week_questions,
          COUNT(DISTINCT question_id) FILTER (WHERE is_correct = true) as week_correct
        FROM practice_history
        WHERE user_id = $1
          AND practiced_at >= DATE_TRUNC('week', CURRENT_DATE)
      `;
      const weekStatsResult = await pool.query(weekStatsQuery, [userId]);
      const weekStats = weekStatsResult.rows[0];

      // 4. XP经验值计算
      const xpQuery = `
        SELECT
          COALESCE(SUM(
            CASE
              WHEN is_correct = true THEN 10
              ELSE 5
            END
          ), 0) as total_xp
        FROM practice_history
        WHERE user_id = $1
      `;
      const xpResult = await pool.query(xpQuery, [userId]);
      const xp = xpResult.rows[0].total_xp;

      // 计算等级
      const level = Math.floor(xp / 1000) + 1;
      const xpInCurrentLevel = xp % 1000;
      const xpToNextLevel = 1000 - xpInCurrentLevel;

      // 5. 今日学习记录
      const todayStatsQuery = `
        SELECT
          COUNT(DISTINCT question_id) as today_questions,
          COUNT(DISTINCT question_id) FILTER (WHERE is_correct = true) as today_correct
        FROM practice_history
        WHERE user_id = $1
          AND DATE(practiced_at) = CURRENT_DATE
      `;
      const todayStatsResult = await pool.query(todayStatsQuery, [userId]);
      const todayStats = todayStatsResult.rows[0];

      // 6. 题库总数
      const totalQuestionsQuery = `SELECT COUNT(*) as total FROM questions`;
      const totalResult = await pool.query(totalQuestionsQuery);
      const totalQuestions = parseInt(totalResult.rows[0].total);

      // 组装返回数据
      const summary = {
        // 基础统计
        total_practiced: parseInt(baseStats.practiced_questions) || 0,
        total_correct: parseInt(baseStats.correct_answers) || 0,
        total_wrong: parseInt(baseStats.wrong_answers) || 0,
        accuracy_rate: parseFloat(baseStats.accuracy_rate) || 0,

        // 连续学习
        current_streak: parseInt(streak.current_streak) || 0,
        best_streak: parseInt(streak.best_streak) || 1,

        // 本周统计
        week_days: parseInt(weekStats.week_days) || 0,
        week_questions: parseInt(weekStats.week_questions) || 0,
        week_correct: parseInt(weekStats.week_correct) || 0,

        // 今日统计
        today_questions: parseInt(todayStats.today_questions) || 0,
        today_correct: parseInt(todayStats.today_correct) || 0,

        // XP系统
        total_xp: xp,
        current_level: level,
        xp_in_current_level: xpInCurrentLevel,
        xp_to_next_level: xpToNextLevel,

        // 进度
        total_questions: totalQuestions,
        completion_rate: ((parseInt(baseStats.practiced_questions) || 0) / totalQuestions * 100).toFixed(2)
      };

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('获取学习总览失败:', error);
      res.status(500).json({
        success: false,
        message: '获取学习总览失败',
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/progress/calendar/:userId
   * 获取学习日历数据
   */
  router.get('/calendar/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { month, year } = req.query;

      // 获取指定月份的学习记录
      const calendarQuery = `
        SELECT
          DATE(practiced_at) as practice_date,
          COUNT(DISTINCT question_id) as questions_count,
          COUNT(DISTINCT question_id) FILTER (WHERE is_correct = true) as correct_count,
          COUNT(DISTINCT question_id) FILTER (WHERE is_correct = false) as wrong_count
        FROM practice_history
        WHERE user_id = $1
          AND practiced_at >= DATE_TRUNC('month', $2::date)
          AND practiced_at < DATE_TRUNC('month', $2::date) + INTERVAL '1 month'
        GROUP BY DATE(practiced_at)
        ORDER BY practice_date
      `;

      const date = year && month ? `${year}-${month.padStart(2, '0')}-01` : new Date().toISOString();
      const result = await pool.query(calendarQuery, [userId, date]);

      res.json({
        success: true,
        data: result.rows,
        month: year && month ? parseInt(month) : new Date().getMonth() + 1,
        year: year && month ? parseInt(year) : new Date().getFullYear()
      });

    } catch (error) {
      console.error('获取学习日历失败:', error);
      res.status(500).json({
        success: false,
        message: '获取学习日历失败',
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/progress/achievements/:userId
   * 获取用户成就和徽章
   */
  router.get('/achievements/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 获取用户统计数据
      const statsQuery = `
        SELECT
          COUNT(DISTINCT DATE(practiced_at)) as total_days,
          COUNT(DISTINCT question_id) as total_questions,
          ROUND(
            COUNT(DISTINCT question_id) FILTER (WHERE is_correct = true)::numeric /
            NULLIF(COUNT(DISTINCT question_id), 0), 4
          ) as accuracy_rate,
          (SELECT COUNT(*) FROM practice_history WHERE user_id = $1 AND is_correct = true
           AND id > (
             SELECT COALESCE(MAX(id), 0) FROM practice_history WHERE user_id = $1 AND is_correct = false
           )) as current_correct_streak
        FROM practice_history
        WHERE user_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [userId]);
      const stats = statsResult.rows[0];

      // 计算徽章
      const badges = [];

      // 学习类徽章
      if (stats.total_questions >= 1) badges.push({ id: 'first_practice', name: '初学者', icon: '🌱', category: 'learning' });
      if (stats.total_days >= 7) badges.push({ id: 'week_learner', name: '勤学者', icon: '📚', category: 'learning' });
      if (stats.total_days >= 30) badges.push({ id: 'month_learner', name: '坚持者', icon: '💪', category: 'learning' });

      // 技能类徽章
      if (stats.accuracy_rate >= 0.8) badges.push({ id: 'high_accuracy', name: '神射手', icon: '🎯', category: 'skill' });
      if (stats.current_correct_streak >= 50) badges.push({ id: 'streak_50', name: '连对50', icon: '🔥', category: 'skill' });
      if (stats.total_questions >= 1000) badges.push({ id: 'thousand_questions', name: '千题斩', icon: '🧠', category: 'skill' });

      // 去重
      const uniqueBadges = badges.filter((badge, index, self) =>
        index === self.findIndex((t) => t.id === badge.id)
      );

      res.json({
        success: true,
        data: {
          badges: uniqueBadges,
          total_badges: uniqueBadges.length,
          stats: {
            total_days: parseInt(stats.total_days) || 0,
            total_questions: parseInt(stats.total_questions) || 0,
            accuracy_rate: parseFloat(stats.accuracy_rate) || 0,
            current_correct_streak: parseInt(stats.current_correct_streak) || 0
          }
        }
      });

    } catch (error) {
      console.error('获取成就失败:', error);
      res.status(500).json({
        success: false,
        message: '获取成就失败',
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/progress/recommendations/:userId
   * 获取智能学习推荐
   */
  router.get('/recommendations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const recommendations = [];

      // 1. 今日待复习（基于SuperMemo）
      const dueReviewQuery = `
        SELECT COUNT(*) as count
        FROM supermemo_data
        WHERE user_id = $1 AND next_review_time <= NOW()
      `;
      const dueReviewResult = await pool.query(dueReviewQuery, [userId]);
      const dueReviewCount = parseInt(dueReviewResult.rows[0].count);

      if (dueReviewCount > 0) {
        recommendations.push({
          type: 'review',
          priority: 1,
          title: '复习提醒',
          description: `今日有 ${dueReviewCount} 道题目需要复习`,
          action: '开始复习',
          action_type: 'smart_review',
          count: dueReviewCount
        });
      }

      // 2. 即将遗忘（7天内到期）
      const upcomingReviewQuery = `
        SELECT COUNT(*) as count
        FROM supermemo_data
        WHERE user_id = $1
          AND next_review_time BETWEEN NOW() AND (NOW() + INTERVAL '7 days')
      `;
      const upcomingReviewResult = await pool.query(upcomingReviewQuery, [userId]);
      const upcomingReviewCount = parseInt(upcomingReviewResult.rows[0].count);

      if (upcomingReviewCount > 0) {
        recommendations.push({
          type: 'upcoming',
          priority: 2,
          title: '即将遗忘',
          description: `未来7天内有 ${upcomingReviewCount} 道题目到期`,
          action: '提前复习',
          action_type: 'smart_review',
          count: upcomingReviewCount
        });
      }

      // 3. 薄弱知识点（正确率<60%的分类）
      const weakCategoryQuery = `
        SELECT
          law_category,
          COUNT(*) as total,
          COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct,
          ROUND(
            COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true)::numeric /
            NULLIF(COUNT(DISTINCT ph.question_id), 0), 2
          ) as accuracy
        FROM questions q
        JOIN practice_history ph ON q.id = ph.question_id
        WHERE ph.user_id = $1
          AND q.law_category IS NOT NULL
        GROUP BY law_category
        HAVING COUNT(DISTINCT ph.question_id) >= 10
          AND ROUND(
            COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true)::numeric /
            NULLIF(COUNT(DISTINCT ph.question_id), 0), 2
          ) < 0.6
        ORDER BY accuracy ASC
        LIMIT 3
      `;
      const weakCategoryResult = await pool.query(weakCategoryQuery, [userId]);

      weakCategoryResult.rows.forEach(category => {
        recommendations.push({
          type: 'weak',
          priority: 3,
          title: '薄弱知识点',
          description: `${category.law_category} 正确率仅 ${(category.accuracy * 100).toFixed(0)}%`,
          action: '重点练习',
          action_type: 'category_practice',
          category: category.law_category
        });
      });

      // 4. 连续学习提醒
      const streakCheckQuery = `
        SELECT EXISTS(
          SELECT 1 FROM practice_history
          WHERE user_id = $1
          AND DATE(practiced_at) = CURRENT_DATE
        ) as has_practiced_today
      `;
      const streakCheckResult = await pool.query(streakCheckQuery, [userId]);
      const hasPracticedToday = streakCheckResult.rows[0].has_practiced_today;

      if (!hasPracticedToday) {
        recommendations.push({
          type: 'streak',
          priority: 4,
          title: '保持连续',
          description: '今天还未练习，保持学习连续性',
          action: '开始练习',
          action_type: 'practice'
        });
      }

      // 5. 新题探索
      const newQuestionQuery = `
        SELECT COUNT(*) as count
        FROM questions q
        LEFT JOIN (
          SELECT DISTINCT question_id FROM practice_history WHERE user_id = $1
        ) ph ON q.id = ph.question_id
        WHERE ph.question_id IS NULL
      `;
      const newQuestionResult = await pool.query(newQuestionQuery, [userId]);
      const newQuestionCount = parseInt(newQuestionResult.rows[0].count);

      if (newQuestionCount > 0) {
        recommendations.push({
          type: 'explore',
          priority: 5,
          title: '探索新题',
          description: `还有 ${newQuestionCount} 道题目未练习`,
          action: '开始练习',
          action_type: 'practice'
        });
      }

      res.json({
        success: true,
        data: recommendations.sort((a, b) => a.priority - b.priority)
      });

    } catch (error) {
      console.error('获取推荐失败:', error);
      res.status(500).json({
        success: false,
        message: '获取推荐失败',
        error: error.message
      });
    }
  });

  return router;
};
