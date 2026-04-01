/**
 * 考试分类标注API
 * 为题目标注考试分类（密码政策法规、密码技术基础等）
 */

const { inferExamCategoryFromQuestion, EXAM_CATEGORIES } = require('./exam-config');

module.exports = (pool) => {
  const router = require('express').Router();

  /**
   * 添加 exam_category 字段到数据库
   */
  async function setupExamCategoryField() {
    try {
      // 添加字段
      await pool.query(`
        ALTER TABLE questions
        ADD COLUMN IF NOT EXISTS exam_category VARCHAR(100)
      `);

      // 创建索引
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_questions_exam_category
        ON questions(exam_category)
      `);

      return true;
    } catch (error) {
      console.error('设置 exam_category 字段失败:', error);
      return false;
    }
  }

  /**
   * POST /api/v2/admin/label-exam-category
   * 为所有题目标注考试分类（需要管理员权限）
   */
  router.post('/label-exam-category', async (req, res) => {
    try {
      // 确保字段存在
      await setupExamCategoryField();

      // 获取所有未标注的题目
      const result = await pool.query(`
        SELECT id, question_text, original_document, law_category, tech_category
        FROM questions
        WHERE exam_category IS NULL
      `);

      const questions = result.rows;

      if (questions.length === 0) {
        return res.json({
          success: true,
          message: '所有题目已标注完成',
          stats: { total: 0, labeled: 0 }
        });
      }

      // 统计各分类的标注数量
      const stats = {};
      for (const cat of Object.keys(EXAM_CATEGORIES)) {
        stats[cat] = 0;
      }

      // 为每道题目推断考试分类
      for (const question of questions) {
        const category = inferExamCategoryFromQuestion(
          question.question_text,
          question.law_category,
          question.tech_category
        );

        if (category) {
          await pool.query(`
            UPDATE questions
            SET exam_category = $1
            WHERE id = $2
          `, [category, question.id]);

          stats[category]++;
        }
      }

      // 返回统计结果
      res.json({
        success: true,
        message: `成功标注 ${questions.length} 道题目`,
        stats: {
          total: questions.length,
          labeled: questions.length,
          by_category: stats
        }
      });

    } catch (error) {
      console.error('标注考试分类失败:', error);
      res.status(500).json({
        success: false,
        error: '标注考试分类失败'
      });
    }
  });

  /**
   * GET /api/v2/exam-categories
   * 获取所有考试分类配置
   */
  router.get('/exam-categories', (req, res) => {
    res.json(EXAM_CATEGORIES);
  });

  /**
   * GET /api/v2/exam-categories/stats
   * 获取各考试分类的题目统计
   */
  router.get('/exam-categories/stats', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          exam_category,
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE question_type = '单项选择题') as single_count,
          COUNT(*) FILTER (WHERE question_type = '多项选择题') as multi_count,
          COUNT(*) FILTER (WHERE question_type = '判断题') as judge_count
        FROM questions
        WHERE exam_category IS NOT NULL
        GROUP BY exam_category
        ORDER BY exam_category
      `);

      res.json(result.rows);
    } catch (error) {
      console.error('获取考试分类统计失败:', error);
      res.status(500).json({ error: '获取考试分类统计失败' });
    }
  });

  /**
   * POST /api/v2/exam/generate
   * 生成模拟试卷（按考试要求组卷）
   */
  router.post('/exam/generate', async (req, res) => {
    try {
      const { user_id } = req.body;

      // TODO: 实现按比例组卷逻辑
      // 单选60题(30分) + 多选60题(60分) + 判断20题(10分) = 140题(100分)
      // 按考核内容比例：密码政策法规10%、技术基础20%、产品应用20%、密评理论20%、实务综合30%

      res.json({
        success: true,
        message: '模拟试卷生成功能开发中...',
        exam_config: {
          total_questions: 140,
          total_score: 100,
          time_limit: 90,  // 90分钟
          distribution: {
            '单项选择题': { count: 60, score: 0.5, total: 30 },
            '多项选择题': { count: 60, score: 1.0, total: 60 },
            '判断题': { count: 20, score: 0.5, total: 10 }
          }
        }
      });

    } catch (error) {
      console.error('生成模拟试卷失败:', error);
      res.status(500).json({ error: '生成模拟试卷失败' });
    }
  });

  return router;
};
