/**
 * 题目管理API模块
 * 提供题目列表查询、答案修改、存疑标记、修改日志等功能
 */

const express = require('express');
const router = express.Router();

/**
 * 权限验证中间件
 * 检查用户是否为管理员（JWT Token 验证已在 server.js 中完成）
 * 只作为额外的安全保障，主要验证在 server.js 的 requireAdmin 中间件
 */
function requireAdminKey(req, res, next) {
    // 如果请求头中有 API Key，验证它（用于向后兼容或外部调用）
    const apiKey = req.headers['x-admin-key'];
    const validKey = process.env.ADMIN_API_KEY || 'exam-admin-2026';

    // 如果有 API Key 且不匹配，拒绝访问
    if (apiKey && apiKey !== validKey) {
        return res.status(403).json({ error: '无效的管理员密钥' });
    }

    // 检查用户角色（由 JWT 认证中间件设置）
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }

    next();
}

/**
 * 答案格式验证函数
 * @param {string} answer - 待验证的答案
 * @returns {boolean} - 答案格式是否有效
 */
function validateAnswerFormat(answer) {
    if (!answer || typeof answer !== 'string') return false;

    const normalized = answer.toUpperCase().replace(/[^ABCD]/g, '');

    // 检查长度
    if (normalized.length < 1 || normalized.length > 4) return false;

    // 检查是否只包含ABCD
    if (!/^[ABCD]+$/.test(normalized)) return false;

    // 检查是否有重复字符
    if (new Set(normalized).size !== normalized.length) return false;

    return true;
}

// 应用权限验证中间件到所有管理路由
router.use(requireAdminKey);

/**
 * GET /api/v2/admin/questions
 * 获取题目列表（支持分页、筛选、搜索）
 */
router.get('/questions', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const {
            page = 1,
            limit = 50,
            category,
            question_type,
            is_doubtful,
            doubt_resolved,
            search_keyword
        } = req.query;

        // 构建查询条件
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (is_doubtful !== undefined) {
            conditions.push(`is_doubtful = $${paramIndex++}`);
            params.push(is_doubtful === 'true');
        }

        if (doubt_resolved !== undefined) {
            conditions.push(`doubt_resolved = $${paramIndex++}`);
            params.push(doubt_resolved === 'true');
        }

        if (question_type) {
            conditions.push(`question_type = $${paramIndex++}`);
            params.push(question_type);
        }

        if (category) {
            conditions.push(`category = $${paramIndex++}`);
            params.push(category);
        }

        if (search_keyword) {
            conditions.push(`(question_text ILIKE $${paramIndex++} OR question_no::text ILIKE $${paramIndex++})`);
            params.push(`%${search_keyword}%`, `%${search_keyword}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT
                id, question_no, question_type, question_text,
                correct_answer, category, difficulty,
                is_doubtful, doubt_reason, doubt_resolved,
                doubt_reported_at, doubt_resolved_at
            FROM questions
            ${whereClause}
            ORDER BY
                is_doubtful DESC, doubt_resolved ASC,
                question_no::int ASC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        // 获取总数
        const countQuery = `SELECT COUNT(*) FROM questions ${whereClause}`;

        const [result, countResult] = await Promise.all([
            client.query(query, params),
            client.query(countQuery, params.slice(0, -2))
        ]);

        res.json({
            questions: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('获取题目列表失败:', error);
        res.status(500).json({ error: '获取题目列表失败' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/v2/admin/questions/:id
 * 获取单个题目详情（包含修改历史）
 */
router.get('/questions/:id', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { id } = req.params;

        const query = `
            SELECT
                q.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', afl.id,
                            'old_answer', afl.old_answer,
                            'new_answer', afl.new_answer,
                            'fix_reason', afl.fix_reason,
                            'fixed_by', afl.fixed_by,
                            'fixed_at', afl.fixed_at
                        )
                        ORDER BY afl.fixed_at DESC
                    ) FILTER (WHERE afl.id IS NOT NULL),
                    '[]'
                ) as fix_history
            FROM questions q
            LEFT JOIN answer_fix_log afl ON q.id = afl.question_id
            WHERE q.id = $1
            GROUP BY q.id
        `;

        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '题目不存在' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('获取题目详情失败:', error);
        res.status(500).json({ error: '获取题目详情失败' });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/v2/admin/questions/:id/answer
 * 更新题目答案
 */
router.put('/questions/:id/answer', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { id } = req.params;
        const {
            correct_answer,
            fix_reason,
            fixed_by,
            resolve_doubt = false
        } = req.body;

        // 参数验证
        if (!correct_answer || !fixed_by) {
            return res.status(400).json({
                error: '缺少必要参数',
                required: ['correct_answer', 'fixed_by']
            });
        }

        // 验证答案格式
        if (!validateAnswerFormat(correct_answer)) {
            return res.status(400).json({
                error: '答案格式无效',
                format: '单选: A/B/C/D, 多选: AB/ACD/ABCD, 判断: A/B'
            });
        }

        await client.query('BEGIN');

        // 获取当前题目信息
        const currentQuery = 'SELECT * FROM questions WHERE id = $1';
        const currentResult = await client.query(currentQuery, [id]);

        if (currentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: '题目不存在' });
        }

        const currentQuestion = currentResult.rows[0];

        // 如果答案没有变化
        if (currentQuestion.correct_answer === correct_answer) {
            await client.query('ROLLBACK');
            return res.json({
                message: '答案未变化',
                question: currentQuestion
            });
        }

        // 更新答案
        const updateQuery = `
            UPDATE questions
            SET correct_answer = $1,
                is_doubtful = $2,
                doubt_resolved = $3,
                doubt_resolved_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE doubt_resolved_at END,
                doubt_resolved_by = CASE WHEN $3 THEN $4 ELSE doubt_resolved_by END
            WHERE id = $5
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
            correct_answer,
            resolve_doubt ? false : currentQuestion.is_doubtful,
            resolve_doubt,
            fixed_by,
            id
        ]);

        // 记录修改日志
        const logQuery = `
            INSERT INTO answer_fix_log (
                question_id, question_no, old_answer, new_answer,
                fix_reason, fixed_by, is_doubtful,
                old_is_doubtful, new_is_doubtful
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        await client.query(logQuery, [
            id,
            currentQuestion.question_no,
            currentQuestion.correct_answer,
            correct_answer,
            fix_reason || '管理员手动修改',
            fixed_by,
            currentQuestion.is_doubtful,
            currentQuestion.is_doubtful,
            resolve_doubt ? false : currentQuestion.is_doubtful
        ]);

        await client.query('COMMIT');

        res.json({
            message: '答案更新成功',
            question: updateResult.rows[0],
            previous_answer: currentQuestion.correct_answer
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('更新答案失败:', error);
        res.status(500).json({ error: '更新答案失败' });
    } finally {
        client.release();
    }
});

/**
 * POST /api/v2/admin/questions/:id/doubt
 * 标记题目为存疑
 */
router.post('/questions/:id/doubt', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { id } = req.params;
        const { doubt_reason, reported_by, suggested_answer } = req.body;

        if (!doubt_reason || !reported_by) {
            return res.status(400).json({
                error: '缺少必要参数',
                required: ['doubt_reason', 'reported_by']
            });
        }

        const query = `
            UPDATE questions
            SET is_doubtful = TRUE,
                doubt_reason = $1,
                doubt_reported_by = $2,
                doubt_reported_at = CURRENT_TIMESTAMP,
                doubt_resolved = FALSE,
                doubt_resolved_at = NULL,
                doubt_resolved_by = NULL
            WHERE id = $3
            RETURNING *
        `;

        const result = await client.query(query, [doubt_reason, reported_by, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '题目不存在' });
        }

        // 如果有建议答案且格式正确，记录到存疑报告表
        if (suggested_answer && validateAnswerFormat(suggested_answer)) {
            await client.query(`
                INSERT INTO question_doubt_reports
                (question_id, question_no, reported_by, doubt_reason, suggested_answer)
                VALUES ($1, (SELECT question_no FROM questions WHERE id = $1), $2, $3, $4)
            `, [id, reported_by, doubt_reason, suggested_answer]);
        }

        res.json({
            message: '已标记为存疑',
            question: result.rows[0]
        });

    } catch (error) {
        console.error('标记存疑失败:', error);
        res.status(500).json({ error: '标记存疑失败' });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/v2/admin/questions/:id/doubt
 * 取消存疑标记（解决存疑）
 */
router.delete('/questions/:id/doubt', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { id } = req.params;
        const { resolved_by, resolve_notes } = req.body;

        if (!resolved_by) {
            return res.status(400).json({ error: '缺少解决人信息' });
        }

        const query = `
            UPDATE questions
            SET is_doubtful = FALSE,
                doubt_resolved = TRUE,
                doubt_resolved_at = CURRENT_TIMESTAMP,
                doubt_resolved_by = $1,
                doubt_reason = CASE
                    WHEN $2 != '' THEN doubt_reason || ' | 解决: ' || $2
                    ELSE doubt_reason
                END
            WHERE id = $3
            RETURNING *
        `;

        const result = await client.query(query, [resolved_by, resolve_notes || '', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '题目不存在' });
        }

        res.json({
            message: '存疑已解决',
            question: result.rows[0]
        });

    } catch (error) {
        console.error('取消存疑失败:', error);
        res.status(500).json({ error: '取消存疑失败' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/v2/admin/fix-log
 * 获取修改日志列表
 */
router.get('/fix-log', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const { page = 1, limit = 50, question_id, fixed_by } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (question_id) {
            conditions.push(`afl.question_id = $${paramIndex++}`);
            params.push(question_id);
        }

        if (fixed_by) {
            conditions.push(`afl.fixed_by ILIKE $${paramIndex++}`);
            params.push(`%${fixed_by}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT
                afl.*,
                q.question_no,
                q.question_text,
                q.question_type,
                q.is_doubtful
            FROM answer_fix_log afl
            JOIN questions q ON afl.question_id = q.id
            ${whereClause}
            ORDER BY afl.fixed_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const result = await client.query(query, params);

        // 获取总数
        const countQuery = `SELECT COUNT(*) FROM answer_fix_log afl ${whereClause}`;
        const countResult = await client.query(countQuery, params.slice(0, -2));

        res.json({
            logs: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('获取修改日志失败:', error);
        res.status(500).json({ error: '获取修改日志失败' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/v2/admin/fix-log/stats
 * 获取修改统计信息
 */
router.get('/fix-log/stats', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const queries = {
            total_fixes: 'SELECT COUNT(*) FROM answer_fix_log',
            today_fixes: 'SELECT COUNT(*) FROM answer_fix_log WHERE DATE(fixed_at) = CURRENT_DATE',
            top_modifiers: `
                SELECT fixed_by, COUNT(*) as fix_count
                FROM answer_fix_log
                GROUP BY fixed_by
                ORDER BY fix_count DESC
                LIMIT 10
            `,
            doubtful_count: 'SELECT COUNT(*) FROM questions WHERE is_doubtful = TRUE AND doubt_resolved = FALSE',
            recent_fixes: `
                SELECT afl.*, q.question_no
                FROM answer_fix_log afl
                JOIN questions q ON afl.question_id = q.id
                ORDER BY afl.fixed_at DESC
                LIMIT 10
            `
        };

        const [
            totalResult,
            todayResult,
            topResult,
            doubtfulResult,
            recentResult
        ] = await Promise.all([
            client.query(queries.total_fixes),
            client.query(queries.today_fixes),
            client.query(queries.top_modifiers),
            client.query(queries.doubtful_count),
            client.query(queries.recent_fixes)
        ]);

        res.json({
            statistics: {
                total_fixes: parseInt(totalResult.rows[0].count),
                today_fixes: parseInt(todayResult.rows[0].count),
                doubtful_count: parseInt(doubtfulResult.rows[0].count)
            },
            top_modifiers: topResult.rows,
            recent_fixes: recentResult.rows
        });

    } catch (error) {
        console.error('获取统计失败:', error);
        res.status(500).json({ error: '获取统计失败' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/v2/admin/categories
 * 获取所有题目分类（用于筛选器）
 */
router.get('/categories', async (req, res) => {
    const client = await router.pool.connect();

    try {
        const query = `
            SELECT DISTINCT category
            FROM questions
            WHERE category IS NOT NULL
            ORDER BY category
        `;

        const result = await client.query(query);

        res.json(result.rows.map(row => row.category));

    } catch (error) {
        console.error('获取分类失败:', error);
        res.status(500).json({ error: '获取分类失败' });
    } finally {
        client.release();
    }
});

// ==================== 管理员配置管理API ====================
const { getInstance: getConfigManager } = require('./unified-core/admin-config');

/**
 * GET /api/v2/admin/system-config
 * 获取系统配置（无需权限）仅用于配置健康检查
 */
router.get('/system-config/health', async (req, res) => {
    try {
        const result = await router.pool.query(`
            SELECT COUNT(*) as config_count
            FROM admin_config
            WHERE is_active = true
        `);

        res.json({
            success: true,
            status: 'healthy',
            config_count: parseInt(result.rows[0].config_count),
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            error: '配置健康检查失败',
            details: error.message
        });
    }
});

/**
 * GET /api/v2/admin/system-config
 * 获取所有配置
 */
router.get('/system-config', async (req, res) => {
    try {
        const configManager = getConfigManager(router.pool);
        const configs = await configManager.getAllConfigs();

        res.json({
            success: true,
            configs,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('获取配置失败:', error);
        res.status(500).json({
            error: '获取配置失败',
            details: error.message
        });
    }
});

/**
 * PUT /api/v2/admin/system-config/:key
 * 更新配置
 */
router.put('/system-config/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value, reason } = req.body;

        if (value === undefined) {
            return res.status(400).json({
                error: '缺少value参数'
            });
        }

        const configManager = getConfigManager(router.pool);
        const result = await configManager.setConfig(
            key,
            value,
            req.user.username,
            reason
        );

        res.json({
            success: true,
            ...result,
            message: '配置已更新'
        });
    } catch (error) {
        console.error(`更新配置 ${req.params.key} 失败:`, error);
        res.status(500).json({
            error: '更新配置失败',
            details: error.message
        });
    }
});

/**
 * POST /api/v2/admin/system-config/batch
 * 批量更新配置
 */
router.post('/system-config/batch', async (req, res) => {
    try {
        const { configs, reason } = req.body;

        if (!configs || typeof configs !== 'object') {
            return res.status(400).json({
                error: '缺少configs参数或格式错误'
            });
        }

        const configManager = getConfigManager(router.pool);
        const result = await configManager.setConfigs(
            configs,
            req.user.username,
            reason || '批量更新'
        );

        res.json({
            success: true,
            ...result,
            message: `成功更新 ${result.updated} 项配置`
        });
    } catch (error) {
        console.error('批量更新配置失败:', error);
        res.status(500).json({
            error: '批量更新配置失败',
            details: error.message
        });
    }
});

/**
 * GET /api/v2/admin/question-scopes
 * 获取所有题目范围配置
 */
router.get('/question-scopes', async (req, res) => {
    try {
        const configManager = getConfigManager(router.pool);
        const scopes = {
            practice: await configManager.getQuestionScope('practice_question_scope'),
            category: await configManager.getQuestionScope('category_question_scope'),
            exam_category: await configManager.getQuestionScope('exam_category_scope'),
            document: await configManager.getQuestionScope('document_question_scope'),
            random: await configManager.getQuestionScope('random_question_scope')
        };

        res.json({
            success: true,
            scopes,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('获取题目范围失败:', error);
        res.status(500).json({
            error: '获取题目范围失败',
            details: error.message
        });
    }
});

/**
 * PUT /api/v2/admin/question-scope/:type
 * 更新题目范围配置
 */
router.put('/question-scope/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const config = req.body;

        // 验证类型
        const validTypes = ['practice', 'category', 'exam_category', 'document', 'random'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: '无效的题目范围类型',
                validTypes
            });
        }

        // 映射到配置键
        const keyMap = {
            practice: 'practice_question_scope',
            category: 'category_question_scope',
            exam_category: 'exam_category_scope',
            document: 'document_question_scope',
            random: 'random_question_scope'
        };

        const configManager = getConfigManager(router.pool);
        const result = await configManager.setConfig(
            keyMap[type],
            config,
            req.user.username,
            '更新题目范围配置'
        );

        res.json({
            success: true,
            type,
            config: result.value,
            message: `${type} 题目范围已更新`
        });
    } catch (error) {
        console.error(`更新题目范围失败:`, error);
        res.status(500).json({
            error: '更新题目范围失败',
            details: error.message
        });
    }
});

/**
 * GET /api/v2/admin/document-scopes
 * 获取所有文档范围配置
 */
router.get('/document-scopes', async (req, res) => {
    try {
        const configManager = getConfigManager(router.pool);
        const scopes = {
            practice: await configManager.getDocumentScope('practice_document_scope'),
            review: await configManager.getDocumentScope('review_document_scope')
        };

        res.json({
            success: true,
            scopes,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('获取文档范围失败:', error);
        res.status(500).json({
            error: '获取文档范围失败',
            details: error.message
        });
    }
});

/**
 * PUT /api/v2/admin/document-scope/:type
 * 更新文档范围配置
 */
router.put('/document-scope/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const config = req.body;

        // 验证类型
        const validTypes = ['practice', 'review'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: '无效的文档范围类型',
                validTypes
            });
        }

        // 映射到配置键
        const keyMap = {
            practice: 'practice_document_scope',
            review: 'review_document_scope'
        };

        const configManager = getConfigManager(router.pool);
        const result = await configManager.setConfig(
            keyMap[type],
            config,
            req.user.username,
            '更新文档范围配置'
        );

        res.json({
            success: true,
            type,
            config: result.value,
            message: `${type} 文档范围已更新`
        });
    } catch (error) {
        console.error(`更新文档范围失败:`, error);
        res.status(500).json({
            error: '更新文档范围失败',
            details: error.message
        });
    }
});

module.exports = (pool) => {
    // 将数据库连接池附加到路由器
    router.pool = pool;
    return router;
};
