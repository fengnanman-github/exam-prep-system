/**
 * 智能推荐API
 * 根据密评考试要求和用户掌握程度，提供智能练习推荐
 */

const { calculateAllPriorities, calculateTypePriority, generateDailyPlan, EXAM_CATEGORIES, QUESTION_TYPES } = require('./smart-priority-algorithm');

module.exports = (pool) => {
  const router = require('express').Router();

  /**
   * GET /api/v2/smart/recommendations/:userId
   * 获取智能推荐（今日练习计划、优先级分类等）
   */
  router.get('/recommendations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { time_available = 30 } = req.query;

      // 获取用户统一统计
      const statsResult = await pool.query(`
        SELECT * FROM (
          SELECT
            'overall' as type,
            NULL as category,
            NULL as question_type,
            COUNT(*) as total,
            COUNT(DISTINCT ph.question_id) as practiced,
            COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct
          FROM questions
          LEFT JOIN (
            SELECT DISTINCT question_id, is_correct
            FROM practice_history
            WHERE user_id = $1
          ) ph ON id = ph.question_id

          UNION ALL

          SELECT
            'by_law_category' as type,
            law_category as category,
            NULL as question_type,
            COUNT(*) as total,
            COUNT(DISTINCT ph.question_id) as practiced,
            COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct
          FROM questions
          LEFT JOIN (
            SELECT DISTINCT question_id, is_correct
            FROM practice_history
            WHERE user_id = $1
          ) ph ON id = ph.question_id
          WHERE law_category IS NOT NULL
          GROUP BY law_category

          UNION ALL

          SELECT
            'by_type' as type,
            NULL as category,
            question_type,
            COUNT(*) as total,
            COUNT(DISTINCT ph.question_id) as practiced,
            COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct
          FROM questions
          LEFT JOIN (
            SELECT DISTINCT question_id, is_correct
            FROM practice_history
            WHERE user_id = $1
          ) ph ON id = ph.question_id
          GROUP BY question_type
        ) subq
        ORDER BY type, category
      `, [userId]);

      const stats = statsResult.rows;

      // 构建统计对象
      const userStats = {
        by_law_category: stats.filter(s => s.type === 'by_law_category').map(s => ({
          category: s.category,
          total: parseInt(s.total),
          practiced: parseInt(s.practiced),
          correct: parseInt(s.correct)
        })),
        by_type: {
          '单项选择题': stats.find(s => s.type === 'by_type' && s.question_type === '单项选择题'),
          '多项选择题': stats.find(s => s.type === 'by_type' && s.question_type === '多项选择题'),
          '判断题': stats.find(s => s.type === 'by_type' && s.question_type === '判断题')
        }
      };

      // 计算分类优先级
      const categoryPriorities = calculateAllPriorities(userStats.by_law_category);

      // 计算题型优先级
      const typePriorities = calculateTypePriority({
        '单项选择题': userStats.by_type['单项选择题'] || {},
        '多项选择题': userStats.by_type['多项选择题'] || {},
        '判断题': userStats.by_type['判断题'] || {}
      });

      // 生成今日练习计划
      const dailyPlan = generateDailyPlan(userStats, parseInt(time_available));

      // 确定重点推荐
      const topRecommendation = categoryPriorities[0] || null;

      res.json({
        success: true,
        user_id: userId,
        daily_plan: dailyPlan,
        category_priorities: categoryPriorities,
        type_priorities: typePriorities,
        top_recommendation: topRecommendation,
        exam_config: {
          categories: EXAM_CATEGORIES,
          question_types: QUESTION_TYPES
        }
      });

    } catch (error) {
      console.error('获取智能推荐失败:', error);
      res.status(500).json({ error: '获取智能推荐失败' });
    }
  });

  /**
   * GET /api/v2/smart/next-question/:userId
   * 智能推荐下一道题目
   */
  router.get('/next-question/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { exclude_practiced = 'false', limit = 1 } = req.query;

      // 获取用户统计和优先级
      const statsResult = await pool.query(`
        SELECT
          law_category,
          COUNT(*) as total,
          COUNT(DISTINCT ph.question_id) as practiced,
          COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct
        FROM questions q
        LEFT JOIN (
          SELECT DISTINCT question_id, is_correct
          FROM practice_history
          WHERE user_id = $1
        ) ph ON q.id = ph.question_id
        WHERE q.law_category IS NOT NULL
        GROUP BY q.law_category
      `, [userId]);

      const categoryStats = statsResult.rows;
      const priorities = calculateAllPriorities(categoryStats);

      // 找出优先级最高的分类
      const topCategory = priorities[0];
      if (!topCategory) {
        // 如果无法确定优先级，返回随机题目
        const randomResult = await pool.query(`
          SELECT * FROM questions
          ORDER BY RANDOM()
          LIMIT $1
        `, [parseInt(limit)]);
        return res.json(randomResult.rows);
      }

      // 从高优先级分类中选择题目
      let query = `
        SELECT q.*,
               EXISTS (
                 SELECT 1 FROM practice_history ph
                 WHERE ph.question_id = q.id AND ph.user_id = $1
               ) as is_practiced
        FROM questions q
        WHERE q.law_category = $2
      `;

      const params = [userId, topCategory.category];

      if (exclude_practiced === 'true') {
        query += ` AND NOT EXISTS (
          SELECT 1 FROM practice_history ph
          WHERE ph.question_id = q.id AND ph.user_id = $3
        )`;
        params.push(userId);
      }

      query += ` ORDER BY RANDOM() LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));

      const result = await pool.query(query, params);

      // 添加推荐原因
      const questions = result.rows.map(q => ({
        ...q,
        recommendation_reason: `这是${topCategory.exam_category}的题目，占考试${topCategory.exam_weight * 100}%，当前掌握度${topCategory.mastery_level}%`,
        priority_level: topCategory.level,
        exam_category: topCategory.exam_category
      }));

      res.json(questions);

    } catch (error) {
      console.error('推荐题目失败:', error);
      res.status(500).json({ error: '推荐题目失败' });
    }
  });

  /**
   * GET /api/v2/smart/priority-stats/:userId
   * 获取优先级统计（用于前端显示）
   */
  router.get('/priority-stats/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 获取分类统计（包含考试分类）
      const result = await pool.query(`
        SELECT
          q.law_category as category,
          q.exam_category,
          COUNT(*) as total,
          COUNT(DISTINCT ph.question_id) as practiced,
          COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) as correct,
          ROUND(
            100.0 * COUNT(DISTINCT ph.question_id) FILTER (WHERE ph.is_correct = true) /
            NULLIF(COUNT(DISTINCT ph.question_id), 0),
            1
          ) as accuracy_rate
        FROM questions q
        LEFT JOIN (
          SELECT DISTINCT question_id, is_correct
          FROM practice_history
          WHERE user_id = $1
        ) ph ON q.id = ph.question_id
        WHERE q.law_category IS NOT NULL
        GROUP BY q.law_category, q.exam_category
        ORDER BY q.law_category
      `, [userId]);

      const categoryStats = result.rows;

      // 计算优先级
      const priorities = calculateAllPriorities(categoryStats);

      res.json({
        success: true,
        priorities: priorities,
        total_categories: priorities.length,
        high_priority_count: priorities.filter(p => p.level === 'high' || p.level === 'critical').length
      });

    } catch (error) {
      console.error('获取优先级统计失败:', error);
      res.status(500).json({ error: '获取优先级统计失败' });
    }
  });

  return router;
};
