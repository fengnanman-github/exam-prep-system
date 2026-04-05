require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const enhancedApi = require('./api-enhanced');
const smartReviewApi = require('./smart-review');
const smartPracticeApi = require('./smart-practice');
const spacedRepetitionApi = require('./spaced-repetition');
const practiceExtendedApi = require('./practice-extended');
const questionAdminApi = require('./question-admin-api');
const uncertainQuestionsApi = require('./uncertain-questions-api');
const authRouter = require('./auth/auth-router');
const authController = require('./auth/enhanced-auth-controller');
const { authenticateToken, requireAdmin } = require('./auth/auth-middleware');
const publicApi = require('./public-api');
const userManagementApi = require('./api/user-management-api');
const dataAnalyticsApi = require('./api/data-analytics-api');

// 监控和分析
const performanceMonitor = require('./middleware/performance-monitor');
const errorTracker = require('./middleware/error-tracker');
const monitoringApi = require('./monitoring-api');

// 安全中间件
const rateLimiter = require('./middleware/rate-limiter');
const {
  securityHeaders,
  corsMiddleware,
  inputValidation,
  httpsRedirect
} = require('./middleware/security-headers');
const {
  publicAccessControl,
  detectEnumerationAttack,
  securityLogging,
  validateRequestMethod,
  validateRequestHeaders
} = require('./middleware/public-access-control');

const app = express();
const PORT = process.env.PORT || 3000;

// 数据库配置
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'exam_db',
    user: process.env.DB_USER || 'exam_user',
    password: process.env.DB_PASSWORD || 'change_this_password'
});

// ========== 安全中间件配置 ==========

// 1. 安全Headers（必须在最前面）
// app.use(securityHeaders);

// 2. HTTPS重定向（仅生产环境）
// if (process.env.NODE_ENV === 'production') {
//   app.use(httpsRedirect);
// }

// 3. 请求方法验证
// app.use(validateRequestMethod);

// 4. 请求头验证
// app.use(validateRequestHeaders);

// 5. 输入验证
// app.use(inputValidation);

// 6. 速率限制（应用在特定路由上）
// app.use('/api/auth/login', rateLimiter.login());
// app.use('/api/auth/register', rateLimiter.passwordReset());
// app.use('/api', rateLimiter.general());

// 7. 枚举攻击检测
// app.use('/api/v2', detectEnumerationAttack);

// 8. 公开访问控制
// app.use('/api/v2', publicAccessControl);

// 9. 安全日志
// app.use(securityLogging);

// ========== 中间件配置 ==========

// CORS配置（保持向后兼容）
app.use(cors());

// 解析请求体
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 性能监控中间件
app.use(performanceMonitor.middleware());

// 公开API路由（无需认证）- 必须在所有路由之前
app.use('/api/v2/public', publicApi(pool));

// 请求日志中间件
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'exam-prep-backend',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 获取统计信息
app.get('/api/stats', async (req, res) => {
    try {
        const totalQuery = 'SELECT COUNT(*) as count FROM questions';
        const typeQuery = 'SELECT question_type, COUNT(*) as count FROM questions GROUP BY question_type';
        
        const [totalResult, typeResult] = await Promise.all([
            pool.query(totalQuery),
            pool.query(typeQuery)
        ]);
        
        const stats = {
            totalQuestions: parseInt(totalResult.rows[0].count),
            judgeQuestions: 0,
            singleChoice: 0,
            multiChoice: 0
        };
        
        typeResult.rows.forEach(row => {
            if (row.question_type === '判断题') stats.judgeQuestions = parseInt(row.count);
            else if (row.question_type === '单项选择题') stats.singleChoice = parseInt(row.count);
            else if (row.question_type === '多项选择题') stats.multiChoice = parseInt(row.count);
        });
        
        res.json(stats);
    } catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(500).json({ error: '获取统计信息失败' });
    }
});

// 获取随机题目
app.get('/api/questions/random', async (req, res) => {
    try {
        // 先获取题目总数
        const countQuery = 'SELECT COUNT(*) as count FROM questions';
        const countResult = await pool.query(countQuery);
        const totalCount = parseInt(countResult.rows[0].count);

        if (totalCount === 0) {
            return res.status(404).json({ error: '没有找到题目' });
        }

        // 生成随机偏移量
        const randomOffset = Math.floor(Math.random() * totalCount);

        // 使用OFFSET获取随机题目，比ORDER BY RANDOM()更高效
        const query = 'SELECT * FROM questions OFFSET $1 LIMIT 1';
        const result = await pool.query(query, [randomOffset]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: '没有找到题目' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('获取随机题目失败:', error);
        res.status(500).json({ error: '获取题目失败' });
    }
});

// 按题型获取题目
app.get('/api/questions/by-type/:type', async (req, res) => {
    try {
        const { type } = req.params;

        // 验证题型参数
        const validTypes = ['judge', 'single', 'multi', '判断题', '单项选择题', '多项选择题'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: '无效的题型参数',
                validTypes: ['judge', 'single', 'multi']
            });
        }

        // 映射前端类型到数据库类型
        const typeMapping = {
            'judge': '判断题',
            'single': '单项选择题',
            'multi': '多项选择题'
        };
        const dbType = typeMapping[type] || type;

        // 先获取该题型题目总数
        const countQuery = 'SELECT COUNT(*) as count FROM questions WHERE question_type = $1';
        const countResult = await pool.query(countQuery, [dbType]);
        const totalCount = parseInt(countResult.rows[0].count);

        if (totalCount === 0) {
            return res.status(404).json({ error: `没有找到${type}类型的题目` });
        }

        // 生成随机偏移量
        const randomOffset = Math.floor(Math.random() * totalCount);

        // 使用OFFSET获取随机题目
        const query = 'SELECT * FROM questions WHERE question_type = $1 OFFSET $2 LIMIT 1';
        const result = await pool.query(query, [dbType, randomOffset]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: `没有找到${type}类型的题目` });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('按题型获取题目失败:', error);
        res.status(500).json({ error: '获取题目失败' });
    }
});

// 获取题目总数
app.get('/api/questions/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM questions');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('获取题目总数失败:', error);
        res.status(500).json({ error: '获取题目总数失败' });
    }
});

// 获取题型分布
app.get('/api/questions/types', async (req, res) => {
    try {
        const result = await pool.query('SELECT question_type, COUNT(*) FROM questions GROUP BY question_type');
        res.json(result.rows);
    } catch (error) {
        console.error('获取题型分布失败:', error);
        res.status(500).json({ error: '获取题型分布失败' });
    }
});

// 系统信息
app.get('/api/system/info', (req, res) => {
    res.json({
        name: '密评备考系统',
        version: '1.0.0',
        description: '商用密码应用安全性评估备考系统',
        features: [
            '题库导入解析',
            '智能分组算法',
            '错题管理系统',
            '多种练习模式',
            '重点预测和学习建议'
        ],
        deployment: {
            frontend: 'http://localhost:18080',
            backend: 'http://localhost:13000',
            database: 'localhost:15432'
        }
    });
});

// 练习模式API
app.get('/api/practice/modes', (req, res) => {
    res.json([
        { id: 'random', name: '随机练习', description: '随机抽取题目练习' },
        { id: 'judge', name: '判断题练习', description: '专门练习判断题' },
        { id: 'single', name: '单选题练习', description: '专门练习单选题' },
        { id: 'multi', name: '多选题练习', description: '专门练习多选题' }
    ]);
});

// ==================== 错题管理API ====================

// 获取用户错题统计
app.get('/api/wrong-answers/:userId/stats', async (req, res) => {
    try {
        const { userId } = req.params;

        // 验证用户ID
        if (!userId || userId.length > 100) {
            return res.status(400).json({ error: '无效的用户ID' });
        }

        const statsQuery = `
            SELECT
                COUNT(*) as total_wrong,
                SUM(wrong_count) as total_errors,
                COUNT(*) FILTER (WHERE next_review_time <= CURRENT_TIMESTAMP) as need_review
            FROM wrong_answers
            WHERE user_id = $1
        `;

        const result = await pool.query(statsQuery, [userId]);
        const stats = result.rows[0];

        res.json({
            total_wrong: parseInt(stats.total_wrong) || 0,
            total_errors: parseInt(stats.total_errors) || 0,
            need_review: parseInt(stats.need_review) || 0
        });
    } catch (error) {
        console.error('获取错题统计失败:', error);
        res.status(500).json({ error: '获取错题统计失败' });
    }
});

// 获取用户错题列表
app.get('/api/wrong-answers/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || userId.length > 100) {
            return res.status(400).json({ error: '无效的用户ID' });
        }

        const query = `
            SELECT
                wa.id,
                wa.user_id,
                wa.question_id,
                wa.wrong_count,
                wa.next_review_time,
                q.question_no,
                q.question_type,
                q.question_text,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_answer
            FROM wrong_answers wa
            JOIN questions q ON wa.question_id = q.id
            WHERE wa.user_id = $1
            ORDER BY wa.next_review_time ASC
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('获取错题列表失败:', error);
        res.status(500).json({ error: '获取错题列表失败' });
    }
});

// 获取待复习题目
app.get('/api/wrong-answers/:userId/review', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || userId.length > 100) {
            return res.status(400).json({ error: '无效的用户ID' });
        }

        const query = `
            SELECT
                wa.id,
                wa.user_id,
                wa.question_id,
                wa.wrong_count,
                wa.next_review_time,
                q.question_no,
                q.question_type,
                q.question_text,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_answer
            FROM wrong_answers wa
            JOIN questions q ON wa.question_id = q.id
            WHERE wa.user_id = $1 AND wa.next_review_time <= CURRENT_TIMESTAMP
            ORDER BY wa.next_review_time ASC
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('获取复习题目失败:', error);
        res.status(500).json({ error: '获取复习题目失败' });
    }
});

// 记录错题
app.post('/api/wrong-answers', async (req, res) => {
    try {
        const { question_id, user_id } = req.body;

        // 参数验证
        if (!question_id || !user_id) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        if (!Number.isInteger(question_id) || question_id <= 0) {
            return res.status(400).json({ error: '无效的题目ID' });
        }

        if (user_id.length > 100) {
            return res.status(400).json({ error: '无效的用户ID' });
        }

        // 使用 UPSERT (ON CONFLICT) 处理已存在的记录
        const query = `
            INSERT INTO wrong_answers (user_id, question_id, wrong_count, next_review_time)
            VALUES ($1, $2, 1, CURRENT_TIMESTAMP + INTERVAL '1 day')
            ON CONFLICT (user_id, question_id)
            DO UPDATE SET
                wrong_count = wrong_answers.wrong_count + 1,
                next_review_time = CURRENT_TIMESTAMP + INTERVAL '1 day',
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await pool.query(query, [user_id, question_id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('记录错题失败:', error);
        if (error.code === '23503') {
            return res.status(400).json({ error: '题目不存在' });
        }
        res.status(500).json({ error: '记录错题失败' });
    }
});

// 删除错题（标记为已掌握）
app.delete('/api/wrong-answers/:userId/:questionId', async (req, res) => {
    try {
        const { userId, questionId } = req.params;

        if (!userId || userId.length > 100) {
            return res.status(400).json({ error: '无效的用户ID' });
        }

        const questionIdNum = parseInt(questionId);
        if (!questionIdNum || questionIdNum <= 0) {
            return res.status(400).json({ error: '无效的题目ID' });
        }

        const query = `
            DELETE FROM wrong_answers
            WHERE user_id = $1 AND question_id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [userId, questionIdNum]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '错题记录不存在' });
        }

        res.json({ message: '错题已删除', data: result.rows[0] });
    } catch (error) {
        console.error('删除错题失败:', error);
        res.status(500).json({ error: '删除错题失败' });
    }
});

// =====================================================
// 增强功能API路由
// =====================================================
app.use('/api/v2', enhancedApi(pool));

// 智能复习API路由
app.use('/api/v2', smartReviewApi(pool));

// 智能练习API路由
app.use('/api/v2', smartPracticeApi(pool));

// 间隔重复练习API路由（遗忘曲线）
app.use('/api/v2', spacedRepetitionApi(pool));

// 练习扩展功能API路由（笔记、统计等）
app.use('/api/v2', practiceExtendedApi(pool));

// 认证路由（注册、登录等）
app.use('/api/auth', authRouter(pool));

// 题目管理API路由（答案修改、存疑标记等）- 需要管理员权限
app.use('/api/v2/admin', authenticateToken, requireAdmin, questionAdminApi(pool));

// 不确定题目API路由
// 用户管理API（需要管理员权限）
app.use('/api/v2/admin', authenticateToken, requireAdmin, userManagementApi);

// 数据分析API（需要管理员权限）
app.use('/api/v2/admin/analytics', authenticateToken, requireAdmin, dataAnalyticsApi);

// 邮箱验证端点（公开）
app.get('/api/auth/verify-email', (req, res) => authController.verifyEmail(pool, req, res));

app.use('/api/v2/uncertain', uncertainQuestionsApi(pool));

// 文档复习API路由
const documentReviewApi = require('./document-review-api');
app.use('/api/v2/documents', documentReviewApi(pool));

// 书名号标注API路由
const bookTitleLabeler = require('./book-title-labeler');
app.use('/api/v2/documents', bookTitleLabeler(pool));

// 统一统计API路由
const unifiedStatsApi = require('./unified-stats-api');
app.use('/api/v2/stats', unifiedStatsApi(pool));

// 学习进度API路由
const learningProgressApi = require('./learning-progress-api');
app.use('/api/v2/progress', learningProgressApi(pool));

	// 智能复习API路由（增强版）
	const intelligentReviewApi = require('./intelligent-review-api');
	app.use('/api/v2/intelligent-review', intelligentReviewApi(pool));


	// 题库分析API路由（80分目标优化）
	const questionBankAnalysisApi = require('./question-bank-analysis');
	app.use('/api/v2/analysis', questionBankAnalysisApi(pool));

	// 智能复习API路由v2（80分目标优化）
	const intelligentReviewApiV2 = require('./intelligent-review-api-v2');
	app.use('/api/v2/intelligent-review/v2', intelligentReviewApiV2(pool));
// 智能推荐API路由
const smartRecommendationApi = require('./smart-recommendation-api');
app.use('/api/v2/smart', smartRecommendationApi(pool));

// 监控和分析API路由
app.use('/api/v2/monitoring', monitoringApi(pool));

// 功能扩展API路由（成就、提醒、导出）
const extendedFeaturesApi = require('./extended-features-api');
app.use('/api/v2', extendedFeaturesApi(pool));

// 数据扩充API路由（统计、质量检查、扩充建议）
const dataExpansionApi = require('./data-expansion-api');
app.use('/api/v2/data', dataExpansionApi(pool));

// 增强智能推荐API路由（自动化功能）
const smartRecommendationEnhancedApi = require('./unified-core/smart-recommendation-enhanced');
app.use('/api/v2/smart-enhanced', smartRecommendationEnhancedApi(pool));

// ==================== 统一核心逻辑API路由 (v2.0.0) ====================
// 统一状态API
const unifiedStateRouter = require('./unified-core/unified-state');
app.use('/api/v2/unified', unifiedStateRouter(pool));

// 统一练习API
const unifiedPracticeRouter = require('./unified-core/unified-practice');
app.use('/api/v2/unified', unifiedPracticeRouter(pool));

// 题目搜索API
const questionSearchApi = require('./question-search-api');
app.use('/api/questions', questionSearchApi);

// 版本管理API
const { getInstance: getVersionManager } = require('./unified-core/version-manager');
const versionManager = getVersionManager(pool);

// 初始化版本管理器
versionManager.initialize().catch(err => {
    console.error('初始化版本管理器失败:', err);
});

// 获取版本配置
app.get('/api/v2/version/config', async (req, res) => {
    try {
        const userId = req.query.user_id;
        const config = versionManager.getConfig();

        // 获取功能启用状态
        const featuresStatus = userId
            ? await versionManager.getAllFeaturesStatus(userId)
            : config.features;

        res.json({
            version: config.current,
            features: featuresStatus,
            legacy: config.legacy
        });
    } catch (error) {
        console.error('获取版本配置失败:', error);
        res.status(500).json({ error: '获取版本配置失败' });
    }
});

// 切换版本（需要管理员权限）
app.post('/api/v2/version/switch', async (req, res) => {
    try {
        const { version } = req.body;
        const result = await versionManager.switchVersion(version);
        res.json(result);
    } catch (error) {
        console.error('切换版本失败:', error);
        res.status(500).json({ error: '切换版本失败' });
    }
});

// 管理员员配置API已整合到question-admin-api中

// 设置功能开关（需要管理员权限）
app.post('/api/v2/version/feature/:feature', async (req, res) => {
    try {
        const { feature } = req.params;
        const { is_enabled, enabled_for_users, enabled_percentage } = req.body;
        const result = await versionManager.setFeature(feature, {
            is_enabled,
            enabled_for_users,
            enabled_percentage
        });
        res.json(result);
    } catch (error) {
        console.error('设置功能开关失败:', error);
        res.status(500).json({ error: '设置功能开关失败' });
    }
});

// ==================== 考试分类标注（临时端点）====================
// 考试分类定义
const EXAM_CATEGORIES = {
  '密码政策法规': {
    weight: 0.10,
    keywords: ['密码法', '商用密码管理条例', '法律法规', '政策', '规定'],
    color: '#ef4444',
    icon: '⚖️'
  },
  '密码技术基础及相关标准': {
    weight: 0.20,
    keywords: ['算法', '协议', 'SM2', 'SM3', 'SM4', 'SM9', '密码算法', '技术基础'],
    color: '#3b82f6',
    icon: '🔐'
  },
  '密码产品原理、应用及相关标准': {
    weight: 0.20,
    keywords: ['产品', '应用', '模块', '芯片', '密码机', 'SSL', 'VPN'],
    color: '#8b5cf6',
    icon: '🛡️'
  },
  '密评理论、技术及相关标准': {
    weight: 0.20,
    keywords: ['密评', '评估', '标准', '规范', '指引', '技术要求', 'GB/T'],
    color: '#f59e0b',
    icon: '📋'
  },
  '密码应用与安全性评估实务综合': {
    weight: 0.30,
    keywords: ['应用', '实务', '案例', '实施', '部署', '系统集成'],
    color: '#10b981',
    icon: '💼'
  }
};

// 推断考试分类
function inferExamCategory(text, lawCategory, techCategory) {
  if (!text) return '密码应用与安全性评估实务综合';

  const lowerText = text.toLowerCase();

  for (const [category, config] of Object.entries(EXAM_CATEGORIES)) {
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // 根据现有分类推断
  if (lawCategory) {
    if (lawCategory.includes('密码法') || lawCategory.includes('条例')) {
      return '密码政策法规';
    }
  }

  return '密码应用与安全性评估实务综合';
}

// 标注考试分类API（临时开放，无需认证）
app.post('/api/v2/label-exam-category', async (req, res) => {
  try {
    // 添加字段
    await pool.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS exam_category VARCHAR(100)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_questions_exam_category
      ON questions(exam_category)
    `);

    // 获取未标注的题目
    const result = await pool.query(`
      SELECT id, question_text, law_category, tech_category
      FROM questions
      WHERE exam_category IS NULL
      LIMIT 1000
    `);

    const questions = result.rows;
    const stats = {};

    for (const cat of Object.keys(EXAM_CATEGORIES)) {
      stats[cat] = 0;
    }

    // 标注
    for (const question of questions) {
      const category = inferExamCategory(
        question.question_text,
        question.law_category,
        question.tech_category
      );

      await pool.query(`
        UPDATE questions
        SET exam_category = $1
        WHERE id = $2
      `, [category, question.id]);

      stats[category]++;
    }

    res.json({
      success: true,
      message: `成功标注 ${questions.length} 道题目`,
      stats
    });

  } catch (error) {
    console.error('标注失败:', error);
    res.status(500).json({ error: '标注失败' });
  }
});

// 获取考试分类列表
app.get('/api/v2/questions/exam-categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT exam_category
      FROM questions
      WHERE exam_category IS NOT NULL
      ORDER BY exam_category
    `);

    const categories = result.rows.map(row => row.exam_category);
    res.json({ categories });
  } catch (error) {
    console.error('获取考试分类失败:', error);
    res.status(500).json({ error: '获取考试分类失败' });
  }
});

// 获取考试分类统计
app.get('/api/v2/exam-categories/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        exam_category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE question_type = '单项选择题') as single_choice,
        COUNT(*) FILTER (WHERE question_type = '多项选择题') as multi_choice,
        COUNT(*) FILTER (WHERE question_type = '判断题') as judgment
      FROM questions
      WHERE exam_category IS NOT NULL
      GROUP BY exam_category
      ORDER BY exam_category
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// ==================== 智能推荐API ====================

// 考试分类配置
const SMART_EXAM_CATEGORIES = {
  '密码政策法规': { weight: 0.10, color: '#ef4444', icon: '⚖️' },
  '密码技术基础及相关标准': { weight: 0.20, color: '#3b82f6', icon: '🔐' },
  '密码产品原理、应用及相关标准': { weight: 0.20, color: '#8b5cf6', icon: '🛡️' },
  '密评理论、技术及相关标准': { weight: 0.20, color: '#f59e0b', icon: '📋' },
  '密码应用与安全性评估实务综合': { weight: 0.30, color: '#10b981', icon: '💼' }
};

/**
 * GET /api/v2/smart/priority-stats/:userId
 * 获取优先级统计
 */
app.get('/api/v2/smart/priority-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT
        q.law_category as category,
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

    const categoryStats = result.rows;

    // 计算优先级
    const priorities = categoryStats.map(stat => {
      const total = parseInt(stat.total) || 0;
      const practiced = parseInt(stat.practiced) || 0;
      const correct = parseInt(stat.correct) || 0;

      // 掌握程度
      const practice_ratio = total > 0 ? (practiced / total) : 0;
      const accuracy = practiced > 0 ? (correct / practiced) : 0;
      const mastery_level = (practice_ratio * 0.6) + (accuracy * 0.4);

      // 匹配考试分类
      let examCategory = '密码应用与安全性评估实务综合';
      for (const [key, config] of Object.entries(SMART_EXAM_CATEGORIES)) {
        if (stat.category.includes('密码法') || stat.category.includes('条例')) {
          if (key === '密码政策法规') examCategory = key;
        } else if (stat.category.includes('算法') || stat.category.includes('SM')) {
          if (key === '密码技术基础及相关标准') examCategory = key;
        } else if (stat.category.includes('产品') || stat.category.includes('应用')) {
          if (key === '密码产品原理、应用及相关标准') examCategory = key;
        } else if (stat.category.includes('密评') || stat.category.includes('评估')) {
          if (key === '密评理论、技术及相关标准') examCategory = key;
        }
      }

      const config = SMART_EXAM_CATEGORIES[examCategory];
      const base_priority = config.weight * (1 - mastery_level);
      const priority_score = Math.round(base_priority * 1000) / 1000;

      let level = 'low';
      if (priority_score >= 0.15) level = 'critical';
      else if (priority_score >= 0.10) level = 'high';
      else if (priority_score >= 0.05) level = 'medium';

      return {
        category: stat.category,
        exam_category: examCategory,
        total,
        practiced,
        correct,
        practice_ratio: Math.round(practice_ratio * 100),
        accuracy: Math.round(accuracy * 100),
        mastery_level: Math.round(mastery_level * 100),
        priority_score,
        level,
        exam_weight: config.weight,
        icon: config.icon,
        color: config.color
      };
    });

    // 按优先级排序
    priorities.sort((a, b) => b.priority_score - a.priority_score);

    res.json({
      success: true,
      priorities,
      total_categories: priorities.length,
      high_priority_count: priorities.filter(p => p.level === 'high' || p.level === 'critical').length
    });

  } catch (error) {
    console.error('获取优先级统计失败:', error);
    res.status(500).json({ error: '获取优先级统计失败' });
  }
});

/**
 * GET /api/v2/smart/recommendations/:userId
 * 获取今日推荐
 */
app.get('/api/v2/smart/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { time_available = 30 } = req.query;

    // 获取优先级统计
    const priorityResult = await pool.query(`
      SELECT
        q.law_category as category,
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

    const categoryStats = priorityResult.rows;

    // 简化优先级计算
    const priorities = categoryStats.map(stat => {
      const total = parseInt(stat.total) || 0;
      const practiced = parseInt(stat.practiced) || 0;
      const practice_ratio = total > 0 ? practiced / total : 0;

      let examCategory = '密码应用与安全性评估实务综合';
      let examWeight = 0.30;
      let icon = '💼';

      if (stat.category.includes('密码法') || stat.category.includes('条例')) {
        examCategory = '密码政策法规';
        examWeight = 0.10;
        icon = '⚖️';
      } else if (stat.category.includes('算法') || stat.category.includes('SM')) {
        examCategory = '密码技术基础及相关标准';
        examWeight = 0.20;
        icon = '🔐';
      } else if (stat.category.includes('密评') || stat.category.includes('评估')) {
        examCategory = '密评理论、技术及相关标准';
        examWeight = 0.20;
        icon = '📋';
      }

      const priority_score = examWeight * (1 - practice_ratio);

      return {
        category: stat.category,
        exam_category: examCategory,
        exam_weight: examWeight,
        priority_score,
        icon,
        total,
        practiced,
        practice_ratio: Math.round(practice_ratio * 100)
      };
    });

    priorities.sort((a, b) => b.priority_score - a.priority_score);

    // 今日推荐
    const totalQuestions = Math.floor(parseInt(time_available) / 0.6);
    const topCategory = priorities[0];

    res.json({
      success: true,
      user_id: userId,
      time_available: parseInt(time_available),
      estimated_questions: totalQuestions,
      focus_area: topCategory ? {
        category: topCategory.category,
        exam_category: topCategory.exam_category,
        reason: `占考试${topCategory.exam_weight * 100}%，当前练习度${topCategory.practice_ratio}%`
      } : null,
      top_recommendations: priorities.slice(0, 3).map(p => ({
        category: p.category,
        exam_category: p.exam_category,
        priority_score: Math.round(p.priority_score * 1000) / 1000,
        recommended_count: Math.ceil(totalQuestions / 3),
        reason: `练习度${p.practice_ratio}%`
      }))
    });

  } catch (error) {
    console.error('获取推荐失败:', error);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        error: '接口不存在',
        path: req.path
    });
});

// 全局错误处理（使用错误追踪器）
app.use(errorTracker.middleware());

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 密评备考系统后端服务已启动`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/health`);
    console.log(`📚 数据库连接: ${pool.options.host}:${pool.options.port}/${pool.options.database}`);
});
