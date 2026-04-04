/**
 * 增强功能扩展 API
 * 支持错题笔记、题目统计、仅未练习等高级功能
 */

module.exports = (pool) => {
    const router = require('express').Router();

    // ========================================
    // 1. 错题笔记功能
    // ========================================

    /**
     * 添加或更新错题笔记
     * POST /api/v2/notes
     */
    router.post('/notes', async (req, res) => {
        try {
            const { user_id, question_id, note } = req.body;

            if (!user_id || !question_id || !note) {
                return res.status(400).json({ error: '缺少必要参数' });
            }

            const result = await pool.query(`
                INSERT INTO wrong_notes (user_id, question_id, note)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, question_id)
                DO UPDATE SET
                    note = $3,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [user_id, question_id, note]);

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('保存笔记失败:', error);
            res.status(500).json({ error: '保存笔记失败' });
        }
    });

    /**
     * 获取错题笔记
     * GET /api/v2/notes/:userId/:questionId
     */
    router.get('/notes/:userId/:questionId', async (req, res) => {
        try {
            const { userId, questionId } = req.params;

            const result = await pool.query(`
                SELECT id, user_id, question_id, note, created_at, updated_at
                FROM wrong_notes
                WHERE user_id = $1 AND question_id = $2
            `, [userId, questionId]);

            if (result.rows.length === 0) {
                return res.json({ note: null });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('获取笔记失败:', error);
            res.status(500).json({ error: '获取笔记失败' });
        }
    });

    /**
     * 获取用户所有笔记
     * GET /api/v2/notes/:userId
     */
    router.get('/notes/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const result = await pool.query(`
                SELECT
                    wn.id,
                    wn.question_id,
                    wn.note,
                    wn.created_at,
                    wn.updated_at,
                    q.question_text,
                    q.learning_path,
                    q.knowledge_subcategory,
                    q.question_type,
                    q.correct_answer
                FROM wrong_notes wn
                JOIN questions q ON wn.question_id = q.id
                WHERE wn.user_id = $1
                ORDER BY wn.updated_at DESC
            `, [userId]);

            res.json(result.rows);
        } catch (error) {
            console.error('获取笔记列表失败:', error);
            res.status(500).json({ error: '获取笔记列表失败' });
        }
    });

    /**
     * 删除笔记
     * DELETE /api/v2/notes/:userId/:questionId
     */
    router.delete('/notes/:userId/:questionId', async (req, res) => {
        try {
            const { userId, questionId } = req.params;

            const result = await pool.query(`
                DELETE FROM wrong_notes
                WHERE user_id = $1 AND question_id = $2
                RETURNING *
            `, [userId, questionId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: '笔记不存在' });
            }

            res.json({ message: '笔记已删除', data: result.rows[0] });
        } catch (error) {
            console.error('删除笔记失败:', error);
            res.status(500).json({ error: '删除笔记失败' });
        }
    });

    // ========================================
    // 2. 练习统计和进度
    // ========================================

    /**
     * 获取分类练习统计
     * GET /api/v2/practice/stats/:userId
     * Query: law_category, tech_category, learning_path, subcategory
     */
    router.get('/practice/stats/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { law_category, tech_category, learning_path, subcategory } = req.query;

            let whereClause = 'q.id IS NOT NULL';
            let params = [userId];
            let paramIndex = 2;  // userId 是 $1，所以从 $2 开始

            // 支持旧版分类系统
            if (law_category) {
                whereClause += ` AND q.law_category = $${paramIndex}`;
                params.push(law_category);
                paramIndex++;
            }

            if (tech_category) {
                whereClause += ` AND q.tech_category = $${paramIndex}`;
                params.push(tech_category);
                paramIndex++;
            }

            // 支持新版学习路径系统
            if (learning_path) {
                whereClause += ` AND q.learning_path = $${paramIndex}`;
                params.push(learning_path);
                paramIndex++;
            }

            if (subcategory) {
                whereClause += ` AND q.knowledge_subcategory = $${paramIndex}`;
                params.push(subcategory);
                paramIndex++;
            }

            // 获取总题数和已做数量
            const statsQuery = `
                SELECT
                    COUNT(*) as total_count,
                    COUNT(DISTINCT CASE WHEN ph.id IS NOT NULL THEN q.id END) as practiced_count,
                    COUNT(*) - COUNT(DISTINCT CASE WHEN ph.id IS NOT NULL THEN q.id END) as remaining_count,
                    COUNT(*) FILTER (WHERE ph.id IS NOT NULL AND ph.is_correct = true) as correct_count,
                    COUNT(*) FILTER (WHERE ph.id IS NOT NULL AND ph.is_correct = false) as wrong_count
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                WHERE ${whereClause}
            `;

            const result = await pool.query(statsQuery, params);
            const stats = result.rows[0];

            res.json({
                law_category: law_category || null,
                tech_category: tech_category || null,
                learning_path: learning_path || null,
                subcategory: subcategory || null,
                total_count: parseInt(stats.total_count),
                practiced_count: parseInt(stats.practiced_count),
                remaining_count: parseInt(stats.remaining_count),
                correct_count: parseInt(stats.correct_count),
                wrong_count: parseInt(stats.wrong_count),
                completion_rate: stats.total_count > 0
                    ? Math.round((stats.practiced_count / stats.total_count) * 100) / 100
                    : 0,
                accuracy_rate: stats.practiced_count > 0
                    ? Math.round((stats.correct_count / stats.practiced_count) * 100) / 100
                    : 0
            });
        } catch (error) {
            console.error('获取练习统计失败:', error);
            res.status(500).json({ error: '获取练习统计失败' });
        }
    });

    /**
     * 获取所有学习路径的统计（用于首页显示）
     * GET /api/v2/practice/all-stats/:userId
     */
    router.get('/practice/all-stats/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    q.learning_path,
                    COUNT(*) as total_count,
                    COUNT(DISTINCT CASE WHEN ph.id IS NOT NULL THEN q.id END) as practiced_count,
                    COUNT(*) - COUNT(DISTINCT CASE WHEN ph.id IS NOT NULL THEN q.id END) as remaining_count,
                    COALESCE(SUM(CASE WHEN ph.is_correct = true THEN 1 ELSE 0 END), 0) as correct_count,
                    COALESCE(SUM(CASE WHEN ph.is_correct = false THEN 1 ELSE 0 END), 0) as wrong_count,
                    COALESCE(COUNT(CASE WHEN ph.id IS NOT NULL THEN 1 END), 0) as total_attempts
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                WHERE q.learning_path IS NOT NULL
                GROUP BY q.learning_path
                ORDER BY learning_path
            `;

            const result = await pool.query(query, [userId]);

            // 添加图标信息
            const icons = {
                '法律法规': '⚖️',
                '技术标准': '📋',
                '应用实务': '💼',
                '综合知识': '🎯'
            };

            res.json(result.rows.map(row => ({
                ...row,
                icon: icons[row.learning_path] || '📚',
                total_count: parseInt(row.total_count),
                practiced_count: parseInt(row.practiced_count),
                remaining_count: parseInt(row.remaining_count),
                correct_count: parseInt(row.correct_count),
                wrong_count: parseInt(row.wrong_count),
                total_attempts: parseInt(row.total_attempts)
            })));
        } catch (error) {
            console.error('获取所有统计失败:', error);
            res.status(500).json({ error: '获取所有统计失败' });
        }
    });

    /**
     * 获取练习题目（支持多种模式）
     * GET /api/v2/questions
     * Query: user_id, learning_path, exclude_practiced, wrong_only, limit
     */
    router.get('/questions', async (req, res) => {
        try {
            const { user_id, learning_path, exclude_practiced, wrong_only, limit = 50 } = req.query;

            if (!user_id) {
                return res.status(400).json({ error: '缺少用户ID' });
            }

            let query = `
                SELECT q.*
                FROM questions q
            `;
            let conditions = [];
            let params = [];
            let paramIndex = 1;

            // 错题模式：只返回该用户答错的题目
            if (wrong_only === 'true') {
                query = `
                    SELECT DISTINCT q.*
                    FROM questions q
                    INNER JOIN practice_history ph ON q.id = ph.question_id
                    WHERE ph.user_id = $1 AND ph.is_correct = false
                `;
                params.push(user_id);
                paramIndex = 2;

                if (learning_path) {
                    query += ` AND q.learning_path = $2`;
                    params.push(learning_path);
                    paramIndex = 3;
                }
            } else if (exclude_practiced === 'true') {
                // 新题模式：只返回未练习过的题目
                conditions.push(`q.id NOT IN (SELECT question_id FROM practice_history WHERE user_id = $1)`);
                params.push(user_id);
                paramIndex = 2;

                if (learning_path) {
                    conditions.push(`q.learning_path = $2`);
                    params.push(learning_path);
                    paramIndex = 3;
                }
            } else {
                // 全部题目：返回所有题目（优先未练习的，再随机）
                query = `
                    SELECT q.*,
                           CASE WHEN ph.id IS NULL THEN 0 ELSE 1 END as practiced_order
                    FROM questions q
                    LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                `;
                params.push(user_id);
                paramIndex = 2;

                if (learning_path) {
                    conditions.push(`q.learning_path = $2`);
                    params.push(learning_path);
                    paramIndex = 3;
                }
            }

            // 添加条件到查询
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            // 排序和限制
            if (exclude_practiced !== 'true' && wrong_only !== 'true') {
                query += ` ORDER BY practiced_order ASC, RANDOM()`;
            } else {
                query += ` ORDER BY RANDOM()`;
            }

            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(limit) || 50);

            const result = await pool.query(query, params);

            res.json(result.rows);
        } catch (error) {
            console.error('获取练习题目失败:', error);
            res.status(500).json({ error: '获取练习题目失败' });
        }
    });

    // ========================================
    // 3. 增强的题目推荐（仅未练习）
    // ========================================

    /**
     * 获取单个未练习的题目（用于练习模式）
     * GET /api/v2/questions/unpracticed-single/:userId
     * Query: law_category, tech_category, learning_path, subcategory, difficulty, type
     */
    router.get('/questions/unpracticed-single/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { law_category, tech_category, learning_path, subcategory, difficulty, type } = req.query;

            let whereConditions = ['q.id NOT IN (SELECT question_id FROM practice_history WHERE user_id = $1)'];
            let params = [userId];
            let paramIndex = 2;

            // 支持旧版分类系统
            if (law_category) {
                whereConditions.push(`q.law_category = $${paramIndex}`);
                params.push(law_category);
                paramIndex++;
            }

            if (tech_category) {
                whereConditions.push(`q.tech_category = $${paramIndex}`);
                params.push(tech_category);
                paramIndex++;
            }

            // 支持新版学习路径系统
            if (learning_path) {
                whereConditions.push(`q.learning_path = $${paramIndex}`);
                params.push(learning_path);
                paramIndex++;
            }

            if (subcategory) {
                whereConditions.push(`q.knowledge_subcategory = $${paramIndex}`);
                params.push(subcategory);
                paramIndex++;
            }

            if (difficulty) {
                whereConditions.push(`q.difficulty = $${paramIndex}`);
                params.push(difficulty);
                paramIndex++;
            }

            if (type) {
                // 映射题型到数据库字段（支持中文和英文）
                const typeMap = {
                    'judge': '判断题',
                    'single': '单项选择题',
                    'multi': '多项选择题',
                    // 直接支持中文名称
                    '判断题': '判断题',
                    '单选题': '单项选择题',
                    '多选题': '多项选择题'
                };
                if (typeMap[type]) {
                    whereConditions.push(`q.question_type = $${paramIndex}`);
                    params.push(typeMap[type]);
                    paramIndex++;
                }
            }

            const whereClause = whereConditions.join(' AND ');

            // 使用 OFFSET 方式获取随机题目
            const countQuery = `
                SELECT COUNT(*) as count
                FROM questions q
                WHERE ${whereClause}
            `;
            const countResult = await pool.query(countQuery, params);
            const totalCount = parseInt(countResult.rows[0].count);

            if (totalCount === 0) {
                return res.status(404).json({ error: '没有找到未练习的题目' });
            }

            const randomOffset = Math.floor(Math.random() * totalCount);

            const query = `
                SELECT q.*
                FROM questions q
                WHERE ${whereClause}
                OFFSET $${paramIndex} LIMIT 1
            `;

            params.push(randomOffset);
            const result = await pool.query(query, params);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: '没有找到未练习的题目' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('获取未练习题目失败:', error);
            res.status(500).json({ error: '获取未练习题目失败' });
        }
    });

    /**
     * 获取未练习的题目列表（用于批量获取）
     * GET /api/v2/questions/unpracticed/:userId
     * Query: learning_path, subcategory, difficulty, limit
     */
    router.get('/questions/unpracticed/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { learning_path, subcategory, difficulty, limit = 10 } = req.query;

            let whereConditions = ['q.id NOT IN (SELECT question_id FROM practice_history WHERE user_id = $1)'];
            let params = [userId];
            let paramIndex = 2;

            if (learning_path) {
                whereConditions.push(`q.learning_path = $${paramIndex}`);
                params.push(learning_path);
                paramIndex++;
            }

            if (subcategory) {
                whereConditions.push(`q.knowledge_subcategory = $${paramIndex}`);
                params.push(subcategory);
                paramIndex++;
            }

            if (difficulty) {
                whereConditions.push(`q.difficulty = $${paramIndex}`);
                params.push(difficulty);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            const query = `
                SELECT q.*
                FROM questions q
                WHERE ${whereClause}
                ORDER BY RANDOM()
                LIMIT $${paramIndex}
            `;

            params.push(parseInt(limit));
            const result = await pool.query(query, params);

            res.json({
                total: result.rows.length,
                questions: result.rows,
                note: '仅显示未练习过的题目'
            });
        } catch (error) {
            console.error('获取未练习题目失败:', error);
            res.status(500).json({ error: '获取未练习题目失败' });
        }
    });

    /**
     * 检查是否有未练习的题目
     * GET /api/v2/questions/check-unpracticed/:userId
     */
    router.get('/questions/check-unpracticed/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { learning_path, subcategory } = req.query;

            let whereClause = 'q.id IS NOT NULL';
            let params = [];
            let paramIndex = 1;

            if (learning_path) {
                whereClause += ` AND q.learning_path = $${paramIndex}`;
                params.push(learning_path);
                paramIndex++;
            }

            if (subcategory) {
                whereClause += ` AND q.knowledge_subcategory = $${paramIndex}`;
                params.push(subcategory);
                paramIndex++;
            }

            const query = `
                SELECT
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (
                        q.id NOT IN (SELECT question_id FROM practice_history WHERE user_id = $1)
                    ) as unpracticed_count,
                    COUNT(*) FILTER (
                        q.id IN (SELECT question_id FROM practice_history WHERE user_id = $1)
                    ) as practiced_count
                FROM questions q
                WHERE ${whereClause}
            `;

            const result = await pool.query(query, [userId, ...params]);
            const stats = result.rows[0];

            res.json({
                has_unpracticed: parseInt(stats.unpracticed_count) > 0,
                total_count: parseInt(stats.total_count),
                unpracticed_count: parseInt(stats.unpracticed_count),
                practiced_count: parseInt(stats.practiced_count)
            });
        } catch (error) {
            console.error('检查未练习题目失败:', error);
            res.status(500).json({ error: '检查未练习题目失败' });
        }
    });

    /**
     * 获取用户错题列表（用于专项练习快捷选择）
     * GET /api/v2/wrong-answers/:userId
     */
    router.get('/wrong-answers/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    wa.question_id,
                    q.question_no,
                    wa.wrong_count,
                    wa.next_review_time
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

    /**
     * 获取用户收藏列表（用于专项练习快捷选择）
     * GET /api/v2/favorites/:userId
     */
    router.get('/favorites/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    fq.question_id,
                    q.question_no,
                    fq.created_at
                FROM favorite_questions fq
                JOIN questions q ON fq.question_id = q.id
                WHERE fq.user_id = $1
                ORDER BY fq.created_at DESC
            `;

            const result = await pool.query(query, [userId]);

            res.json({
                favorites: result.rows,
                total: result.rows.length
            });
        } catch (error) {
            console.error('获取收藏列表失败:', error);
            res.status(500).json({ error: '获取收藏列表失败' });
        }
    });

    return router;
};
