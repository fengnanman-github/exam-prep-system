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
const { authenticateToken, requireAdmin } = require('./auth/auth-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// 数据库配置
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'exam_db',
    user: process.env.DB_USER || 'exam_user',
    password: process.env.DB_PASSWORD || 'exam_pass123'
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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
app.use('/api/v2/uncertain', uncertainQuestionsApi(pool));

// 404处理
app.use((req, res) => {
    res.status(404).json({
        error: '接口不存在',
        path: req.path
    });
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 密评备考系统后端服务已启动`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/health`);
    console.log(`📚 数据库连接: ${pool.options.host}:${pool.options.port}/${pool.options.database}`);
});