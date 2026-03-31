/**
 * 密评备考系统增强API
 * 包含：分类练习、历史记录、进度统计、智能复习、模拟考试、成绩导出等功能
 */

const express = require('express');

module.exports = (pool) => {
    const router = express.Router();

    // =====================================================
    // 1. 分类相关API
    // =====================================================

    // 获取所有分类（旧版，保持兼容性）
    router.get('/categories', async (req, res) => {
        try {
            const query = `
                SELECT
                    category,
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (WHERE difficulty = 'easy') as easy_count,
                    COUNT(*) FILTER (WHERE difficulty = 'medium') as medium_count,
                    COUNT(*) FILTER (WHERE difficulty = 'hard') as hard_count
                FROM questions
                WHERE category IS NOT NULL
                GROUP BY category
                ORDER BY category
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error('获取分类列表失败:', error);
            res.status(500).json({ error: '获取分类列表失败' });
        }
    });

    // 获取两级分类体系
    router.get('/categories/v2', async (req, res) => {
        try {
            const query = `
                SELECT
                    law_category,
                    tech_category,
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (WHERE difficulty = 'easy') as easy_count,
                    COUNT(*) FILTER (WHERE difficulty = 'medium') as medium_count,
                    COUNT(*) FILTER (WHERE difficulty = 'hard') as hard_count
                FROM questions
                WHERE law_category IS NOT NULL AND tech_category IS NOT NULL
                GROUP BY law_category, tech_category
                ORDER BY law_category, tech_category
            `;
            const result = await pool.query(query);

            // 组织成层级结构
            const categories = {};
            result.rows.forEach(row => {
                if (!categories[row.law_category]) {
                    categories[row.law_category] = {
                        law_category: row.law_category,
                        total_count: 0,
                        tech_categories: []
                    };
                }
                categories[row.law_category].total_count += row.total_count;
                categories[row.law_category].tech_categories.push(row);
            });

            // 转换为数组并排序
            const categoryArray = Object.values(categories).sort((a, b) =>
                b.total_count - a.total_count
            );

            res.json(categoryArray);
        } catch (error) {
            console.error('获取两级分类列表失败:', error);
            res.status(500).json({ error: '获取分类列表失败' });
        }
    });

    // 获取法律法规大类列表
    router.get('/categories/law', async (req, res) => {
        try {
            const query = `
                SELECT
                    law_category,
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (WHERE difficulty = 'easy') as easy_count,
                    COUNT(*) FILTER (WHERE difficulty = 'medium') as medium_count,
                    COUNT(*) FILTER (WHERE difficulty = 'hard') as hard_count
                FROM questions
                WHERE law_category IS NOT NULL
                GROUP BY law_category
                ORDER BY total_count DESC
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error('获取法律法规分类失败:', error);
            res.status(500).json({ error: '获取分类列表失败' });
        }
    });

    // 获取技术专业类别列表
    router.get('/categories/tech', async (req, res) => {
        try {
            const query = `
                SELECT
                    tech_category,
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (WHERE difficulty = 'easy') as easy_count,
                    COUNT(*) FILTER (WHERE difficulty = 'medium') as medium_count,
                    COUNT(*) FILTER (WHERE difficulty = 'hard') as hard_count
                FROM questions
                WHERE tech_category IS NOT NULL
                GROUP BY tech_category
                ORDER BY total_count DESC
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error('获取技术分类失败:', error);
            res.status(500).json({ error: '获取分类列表失败' });
        }
    });

    // 获取学习路径分类（新分类体系）
    router.get('/categories/learning-paths', async (req, res) => {
        try {
            const query = `
                SELECT
                    learning_path as category,
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (WHERE difficulty = 'easy') as easy_count,
                    COUNT(*) FILTER (WHERE difficulty = 'medium') as medium_count,
                    COUNT(*) FILTER (WHERE difficulty = 'hard') as hard_count
                FROM questions
                WHERE learning_path IS NOT NULL
                GROUP BY learning_path
                ORDER BY total_count DESC
            `;
            const result = await pool.query(query);

            // 添加图标和描述
            const pathInfo = {
                '法律法规': { icon: '⚖️', description: '密码相关法律法规和政策文件' },
                '技术标准': { icon: '📋', description: '密码技术标准和规范' },
                '应用实务': { icon: '💼', description: '密码应用实践和案例分析' },
                '综合知识': { icon: '🎯', description: '跨领域综合知识' }
            };

            const withInfo = result.rows.map(row => ({
                ...row,
                ...pathInfo[row.category] || { icon: '📚', description: '' }
            }));

            res.json(withInfo);
        } catch (error) {
            console.error('获取学习路径失败:', error);
            res.status(500).json({ error: '获取学习路径列表失败' });
        }
    });

    // 获取知识子类别
    router.get('/categories/subcategories', async (req, res) => {
        try {
            const { learning_path } = req.query;

            let query = `
                SELECT
                    knowledge_subcategory as subcategory,
                    learning_path,
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (WHERE difficulty = 'easy') as easy_count,
                    COUNT(*) FILTER (WHERE difficulty = 'medium') as medium_count,
                    COUNT(*) FILTER (WHERE difficulty = 'hard') as hard_count
                FROM questions
                WHERE knowledge_subcategory IS NOT NULL
            `;

            const params = [];
            if (learning_path) {
                query += ` AND learning_path = $1 GROUP BY knowledge_subcategory, learning_path`;
                params.push(learning_path);
            } else {
                query += ` GROUP BY knowledge_subcategory, learning_path`;
            }

            query += ` ORDER BY total_count DESC`;

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('获取子类别失败:', error);
            res.status(500).json({ error: '获取子类别列表失败' });
        }
    });

    // 按分类获取题目（支持新旧两种分类方式）
    router.get('/questions/category/:category', async (req, res) => {
        try {
            const { category } = req.params;
            const { difficulty, limit = 10, type = 'old' } = req.query;

            let query, params;

            if (type === 'law') {
                // 按法律法规大类查询
                query = 'SELECT * FROM questions WHERE law_category = $1';
                params = [category];
            } else if (type === 'tech') {
                // 按技术专业类别查询
                query = 'SELECT * FROM questions WHERE tech_category = $1';
                params = [category];
            } else {
                // 旧版查询方式（保持兼容性）
                query = 'SELECT * FROM questions WHERE category = $1';
                params = [category];
            }

            if (difficulty) {
                query += ' AND difficulty = $' + (params.length + 1);
                params.push(difficulty);
            }

            query += ` ORDER BY RANDOM() LIMIT ${parseInt(limit)}`;

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('按分类获取题目失败:', error);
            res.status(500).json({ error: '获取题目失败' });
        }
    });

    // 按两级分类获取题目
    router.get('/questions/two-level', async (req, res) => {
        try {
            const { law_category, tech_category, difficulty, limit = 10 } = req.query;

            let conditions = [];
            let params = [];
            let paramIndex = 1;

            // 构建查询条件
            if (law_category) {
                conditions.push(`law_category = $${paramIndex}`);
                params.push(law_category);
                paramIndex++;
            }

            if (tech_category) {
                conditions.push(`tech_category = $${paramIndex}`);
                params.push(tech_category);
                paramIndex++;
            }

            if (difficulty) {
                conditions.push(`difficulty = $${paramIndex}`);
                params.push(difficulty);
                paramIndex++;
            }

            let query = 'SELECT * FROM questions';
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ` ORDER BY RANDOM() LIMIT ${parseInt(limit)}`;

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('按两级分类获取题目失败:', error);
            res.status(500).json({ error: '获取题目失败' });
        }
    });

    // 获取分类统计
    router.get('/stats/category/:category', async (req, res) => {
        try {
            const { category } = req.params;
            const userId = req.query.user_id || 'exam_user_001';

            const query = `
                SELECT
                    COUNT(*) as total_questions,
                    COUNT(DISTINCT ph.question_id) as practiced_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                    ROUND(
                        CASE
                            WHEN COUNT(DISTINCT ph.question_id) > 0 THEN
                                100.0 * COUNT(*) FILTER (WHERE ph.is_correct = true) / COUNT(DISTINCT ph.question_id)
                            ELSE 0
                        END, 2
                    ) as accuracy_rate
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $2
                WHERE q.category = $1
            `;
            const result = await pool.query(query, [category, userId]);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('获取分类统计失败:', error);
            res.status(500).json({ error: '获取统计信息失败' });
        }
    });

    // 获取练习题目（支持多条件筛选）
    router.get('/questions/practice', async (req, res) => {
        try {
            const { user_id, category, law_category, tech_category, difficulty, type } = req.query;

            // 构建查询条件
            let conditions = [];
            let params = [];
            let paramIndex = 1;

            // 基础查询：优先选择未练习或错误的题目
            let query = `
                SELECT q.*,
                       COALESCE(ph.is_correct, true) as not_practiced_or_wrong,
                       COUNT(ph.id) OVER () as practice_count
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $${paramIndex}
                WHERE 1=1
            `;
            params.push(user_id || 'exam_user_001');
            paramIndex++;

            // 旧版分类筛选（保持兼容性）
            if (category && !law_category && !tech_category) {
                conditions.push(`q.category = $${paramIndex}`);
                params.push(category);
                paramIndex++;
            }

            // 两级分类筛选
            if (law_category) {
                conditions.push(`q.law_category = $${paramIndex}`);
                params.push(law_category);
                paramIndex++;
            }

            if (tech_category) {
                conditions.push(`q.tech_category = $${paramIndex}`);
                params.push(tech_category);
                paramIndex++;
            }

            // 难度筛选
            if (difficulty) {
                conditions.push(`q.difficulty = $${paramIndex}`);
                params.push(difficulty);
                paramIndex++;
            }

            // 题型筛选
            if (type && type !== 'random') {
                const typeMapping = {
                    '判断题': '判断题',
                    '单选题': '单项选择题',
                    '多选题': '多项选择题'
                };
                const questionType = typeMapping[type] || type;
                conditions.push(`q.question_type = $${paramIndex}`);
                params.push(questionType);
                paramIndex++;
            }

            // 添加筛选条件
            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }

            // 排序：优先未练习，其次错误题目，最后随机
            query += `
                ORDER BY
                    CASE WHEN ph.id IS NULL THEN 0 ELSE 1 END,
                    CASE WHEN ph.is_correct = false THEN 0 ELSE 1 END,
                    RANDOM()
                LIMIT 1
            `;

            const result = await pool.query(query, params);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: '没有找到符合条件的题目' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('获取练习题目失败:', error);
            res.status(500).json({ error: '获取题目失败' });
        }
    });

    // =====================================================
    // 2. 练习历史记录API
    // =====================================================

    // 记录练习历史
    router.post('/practice/history', async (req, res) => {
        try {
            const { user_id, question_id, user_answer, is_correct, time_spent, practice_mode } = req.body;

            if (!user_id || !question_id || !user_answer || typeof is_correct !== 'boolean') {
                return res.status(400).json({ error: '缺少必要参数' });
            }

            const query = `
                INSERT INTO practice_history (user_id, question_id, user_answer, is_correct, time_spent, practice_mode)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const result = await pool.query(query, [
                user_id,
                question_id,
                user_answer,
                is_correct,
                time_spent || null,
                practice_mode || 'random'
            ]);

            // 如果答错，同时记录到错题本
            if (!is_correct) {
                const wrongQuery = `
                    INSERT INTO wrong_answers (user_id, question_id, wrong_count, next_review_time)
                    VALUES ($1, $2, 1, CURRENT_TIMESTAMP + INTERVAL '1 day')
                    ON CONFLICT (user_id, question_id)
                    DO UPDATE SET
                        wrong_count = wrong_answers.wrong_count + 1,
                        next_review_time = CURRENT_TIMESTAMP + INTERVAL '1 day',
                        review_count = wrong_answers.review_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `;
                await pool.query(wrongQuery, [user_id, question_id]);
            }

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('记录练习历史失败:', error);
            res.status(500).json({ error: '记录失败' });
        }
    });

    // 获取练习历史
    router.get('/practice/history/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { limit = 50, offset = 0, mode } = req.query;

            let query = `
                SELECT
                    ph.*,
                    q.question_no,
                    q.question_type,
                    q.question_text,
                    q.category,
                    q.correct_answer
                FROM practice_history ph
                JOIN questions q ON ph.question_id = q.id
                WHERE ph.user_id = $1
            `;
            const params = [userId];

            if (mode) {
                query += ' AND ph.practice_mode = $2';
                params.push(mode);
            }

            query += ' ORDER BY ph.practiced_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
            params.push(parseInt(limit), parseInt(offset));

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('获取练习历史失败:', error);
            res.status(500).json({ error: '获取练习历史失败' });
        }
    });

    // =====================================================
    // 3. 学习进度统计API
    // =====================================================

    // 获取用户总体进度
    router.get('/progress/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    up.*,
                    (SELECT COUNT(*) FROM questions) as total_questions,
                    (SELECT COUNT(DISTINCT question_id) FROM practice_history WHERE user_id = $1) as unique_practiced
                FROM user_progress up
                WHERE up.user_id = $1
            `;
            const result = await pool.query(query, [userId]);

            if (result.rows.length === 0) {
                // 如果没有记录，返回初始值
                const totalQuestions = await pool.query('SELECT COUNT(*) FROM questions');
                res.json({
                    user_id: userId,
                    total_practiced: 0,
                    total_correct: 0,
                    total_wrong: 0,
                    current_streak: 0,
                    best_streak: 0,
                    practice_days: 0,
                    total_questions: parseInt(totalQuestions.rows[0].count),
                    unique_practiced: 0
                });
            } else {
                res.json(result.rows[0]);
            }
        } catch (error) {
            console.error('获取用户进度失败:', error);
            res.status(500).json({ error: '获取进度失败' });
        }
    });

    // 获取分类进度
    router.get('/progress/:userId/category', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    q.category,
                    COUNT(*) as total_count,
                    COUNT(DISTINCT ph.question_id) as practiced_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                    ROUND(
                        100.0 * COUNT(*) FILTER (WHERE ph.is_correct = true) / NULLIF(COUNT(DISTINCT ph.question_id), 0),
                        2
                    ) as accuracy_rate
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                WHERE q.category IS NOT NULL
                GROUP BY q.category
                ORDER BY category
            `;
            const result = await pool.query(query, [userId]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取分类进度失败:', error);
            res.status(500).json({ error: '获取分类进度失败' });
        }
    });

    // 获取两级分类进度统计
    router.get('/progress/:userId/two-level', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    q.law_category,
                    q.tech_category,
                    COUNT(*) as total_count,
                    COUNT(DISTINCT ph.question_id) as practiced_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                    ROUND(
                        100.0 * COUNT(*) FILTER (WHERE ph.is_correct = true) / NULLIF(COUNT(DISTINCT ph.question_id), 0),
                        2
                    ) as accuracy_rate
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                WHERE q.law_category IS NOT NULL AND q.tech_category IS NOT NULL
                GROUP BY q.law_category, q.tech_category
                ORDER BY q.law_category, q.tech_category
            `;
            const result = await pool.query(query, [userId]);

            // 组织成层级结构
            const lawMap = {};
            result.rows.forEach(row => {
                if (!lawMap[row.law_category]) {
                    lawMap[row.law_category] = {
                        law_category: row.law_category,
                        total_count: 0,
                        practiced_count: 0,
                        correct_count: 0,
                        tech_categories: []
                    };
                }
                const lawCat = lawMap[row.law_category];
                lawCat.total_count += parseInt(row.total_count);
                lawCat.practiced_count += parseInt(row.practiced_count);
                lawCat.correct_count += parseInt(row.correct_count);
                lawCat.tech_categories.push(row);
            });

            // 计算每个法律大类的准确率
            Object.values(lawMap).forEach(lawCat => {
                lawCat.accuracy_rate = lawCat.practiced_count > 0
                    ? parseFloat((100.0 * lawCat.correct_count / lawCat.practiced_count).toFixed(2))
                    : 0;
            });

            res.json(Object.values(lawMap));
        } catch (error) {
            console.error('获取两级分类进度失败:', error);
            res.status(500).json({ error: '获取两级分类进度失败' });
        }
    });

    // 获取法律法规大类进度
    router.get('/progress/:userId/law', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    q.law_category,
                    COUNT(*) as total_count,
                    COUNT(DISTINCT ph.question_id) as practiced_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                    ROUND(
                        100.0 * COUNT(*) FILTER (WHERE ph.is_correct = true) / NULLIF(COUNT(DISTINCT ph.question_id), 0),
                        2
                    ) as accuracy_rate
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                WHERE q.law_category IS NOT NULL
                GROUP BY q.law_category
                ORDER BY law_category
            `;
            const result = await pool.query(query, [userId]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取法律法规进度失败:', error);
            res.status(500).json({ error: '获取法律法规进度失败' });
        }
    });

    // 获取技术专业类别进度
    router.get('/progress/:userId/tech', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    q.tech_category,
                    COUNT(*) as total_count,
                    COUNT(DISTINCT ph.question_id) as practiced_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                    ROUND(
                        100.0 * COUNT(*) FILTER (WHERE ph.is_correct = true) / NULLIF(COUNT(DISTINCT ph.question_id), 0),
                        2
                    ) as accuracy_rate
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                WHERE q.tech_category IS NOT NULL
                GROUP BY q.tech_category
                ORDER BY tech_category
            `;
            const result = await pool.query(query, [userId]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取技术类别进度失败:', error);
            res.status(500).json({ error: '获取技术类别进度失败' });
        }
    });

    // 获取学习路径进度（新分类体系）
    router.get('/progress/:userId/learning-paths', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    q.learning_path,
                    COUNT(*) as total_count,
                    COUNT(DISTINCT ph.question_id) as practiced_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                    ROUND(
                        100.0 * COUNT(DISTINCT ph.question_id) / NULLIF(COUNT(*), 0),
                        2
                    ) as completion_rate,
                    ROUND(
                        100.0 * COUNT(*) FILTER (WHERE ph.is_correct = true) / NULLIF(COUNT(DISTINCT ph.question_id), 0),
                        2
                    ) as accuracy_rate
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                WHERE q.learning_path IS NOT NULL
                GROUP BY q.learning_path
                ORDER BY completion_rate DESC
            `;
            const result = await pool.query(query, [userId]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取学习路径进度失败:', error);
            res.status(500).json({ error: '获取学习路径进度失败' });
        }
    });

    // 获取学习曲线数据（最近7天）
    router.get('/progress/:userId/chart', async (req, res) => {
        try {
            const { userId } = req.params;
            const { days = 7 } = req.query;

            const query = `
                SELECT
                    DATE(practiced_at) as date,
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (WHERE is_correct = true) as correct_count,
                    ROUND(AVG(time_spent), 2) as avg_time
                FROM practice_history
                WHERE user_id = $1
                    AND practiced_at >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY DATE(practiced_at)
                ORDER BY date
            `;
            const result = await pool.query(query, [userId]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取学习曲线失败:', error);
            res.status(500).json({ error: '获取学习曲线失败' });
        }
    });

    // =====================================================
    // 4. 模拟考试API
    // =====================================================

    // 创建考试
    router.post('/exam', async (req, res) => {
        try {
            const { user_id, exam_name, config } = req.body;

            // 根据配置抽取题目
            let finalQuery = 'SELECT id FROM questions WHERE 1=1';
            const params = [];

            // 支持两级分类配置
            if (config) {
                if (config.law_categories && config.law_categories.length > 0) {
                    const lawConditions = config.law_categories.map((cat, index) => {
                        params.push(cat);
                        return `$${params.length}`;
                    }).join(', ');
                    finalQuery += ` AND law_category = ANY(ARRAY[${lawConditions}])`;
                }

                if (config.tech_categories && config.tech_categories.length > 0) {
                    const techConditions = config.tech_categories.map((cat, index) => {
                        params.push(cat);
                        return `$${params.length}`;
                    }).join(', ');
                    finalQuery += ` AND tech_category = ANY(ARRAY[${techConditions}])`;
                }

                // 兼容旧的单级分类配置
                if (config.categories && config.categories.length > 0) {
                    const categoryConditions = config.categories.map((cat, index) => {
                        params.push(cat.category);
                        return `$${params.length}`;
                    }).join(', ');
                    finalQuery += ` AND category = ANY(ARRAY[${categoryConditions}])`;
                }
            }

            finalQuery += ` ORDER BY RANDOM() LIMIT ${config ? config.total_questions || 20 : 20}`;

            const questionsResult = await pool.query(finalQuery, params);
            const questionIds = questionsResult.rows.map(r => r.id);

            // 创建考试记录
            const examQuery = `
                INSERT INTO exam_records (user_id, exam_name, total_questions, exam_config)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const examResult = await pool.query(examQuery, [
                user_id || 'exam_user_001',
                exam_name || '模拟考试',
                questionIds.length,
                JSON.stringify(config || {})
            ]);

            res.status(201).json({
                exam: examResult.rows[0],
                questions: questionIds
            });
        } catch (error) {
            console.error('创建考试失败:', error);
            res.status(500).json({ error: '创建考试失败' });
        }
    });

    // 提交考试答案
    router.post('/exam/:examId/submit', async (req, res) => {
        try {
            const { examId } = req.params;
            const { answers, time_spent } = req.body;

            if (!answers || !Array.isArray(answers)) {
                return res.status(400).json({ error: '答案格式错误' });
            }

            // 获取考试信息
            const examQuery = 'SELECT * FROM exam_records WHERE id = $1';
            const examResult = await pool.query(examQuery, [examId]);

            if (examResult.rows.length === 0) {
                return res.status(404).json({ error: '考试不存在' });
            }

            const exam = examResult.rows[0];

            // 批量获取正确答案并批改
            const questionIds = answers.map(a => a.question_id);
            const questionsQuery = `SELECT id, correct_answer FROM questions WHERE id = ANY($1)`;
            const questionsResult = await pool.query(questionsQuery, [questionIds]);

            const answerMap = new Map(questionsResult.rows.map(q => [q.id, q.correct_answer]));

            let correctCount = 0;
            const processedAnswers = answers.map(answer => {
                const isCorrect = answer.user_answer === answerMap.get(answer.question_id);
                if (isCorrect) correctCount++;
                return {
                    question_id: answer.question_id,
                    user_answer: answer.user_answer,
                    correct_answer: answerMap.get(answer.question_id),
                    is_correct: isCorrect
                };
            });

            const score = (correctCount / answers.length) * 100;

            // 更新考试记录
            const updateQuery = `
                UPDATE exam_records
                SET correct_count = $1,
                    wrong_count = $2,
                    score = $3,
                    time_spent = $4,
                    answers = $5,
                    finished_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *
            `;
            const updateResult = await pool.query(updateQuery, [
                correctCount,
                answers.length - correctCount,
                score,
                time_spent,
                JSON.stringify(processedAnswers),
                examId
            ]);

            // 记录练习历史
            for (const answer of processedAnswers) {
                await pool.query(`
                    INSERT INTO practice_history (user_id, question_id, user_answer, is_correct, practice_mode)
                    VALUES ($1, $2, $3, $4, 'exam')
                `, [exam.user_id, answer.question_id, answer.user_answer, answer.is_correct]);
            }

            res.json({
                exam: updateResult.rows[0],
                answers: processedAnswers,
                summary: {
                    total: answers.length,
                    correct: correctCount,
                    wrong: answers.length - correctCount,
                    score: score
                }
            });
        } catch (error) {
            console.error('提交考试失败:', error);
            res.status(500).json({ error: '提交考试失败' });
        }
    });

    // 获取考试记录
    router.get('/exam/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { limit = 10 } = req.query;

            const query = `
                SELECT
                    id,
                    exam_name,
                    total_questions,
                    correct_count,
                    wrong_count,
                    score,
                    time_spent,
                    started_at,
                    finished_at
                FROM exam_records
                WHERE user_id = $1 AND finished_at IS NOT NULL
                ORDER BY started_at DESC
                LIMIT $2
            `;
            const result = await pool.query(query, [userId, parseInt(limit)]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取考试记录失败:', error);
            res.status(500).json({ error: '获取考试记录失败' });
        }
    });

    // =====================================================
    // 5. 题目收藏API
    // =====================================================

    // 添加收藏
    router.post('/favorite', async (req, res) => {
        try {
            const { user_id, question_id, notes } = req.body;

            const query = `
                INSERT INTO favorite_questions (user_id, question_id, notes)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, question_id) DO UPDATE SET
                    notes = EXCLUDED.notes
                RETURNING *
            `;
            const result = await pool.query(query, [user_id, question_id, notes || null]);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('添加收藏失败:', error);
            res.status(500).json({ error: '添加收藏失败' });
        }
    });

    // 获取收藏列表
    router.get('/favorite/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const query = `
                SELECT
                    fq.*,
                    q.question_no,
                    q.question_type,
                    q.category,
                    q.question_text,
                    q.option_a,
                    q.option_b,
                    q.option_c,
                    q.option_d,
                    q.correct_answer
                FROM favorite_questions fq
                JOIN questions q ON fq.question_id = q.id
                WHERE fq.user_id = $1
                ORDER BY fq.created_at DESC
            `;
            const result = await pool.query(query, [userId]);
            res.json(result.rows);
        } catch (error) {
            console.error('获取收藏列表失败:', error);
            res.status(500).json({ error: '获取收藏列表失败' });
        }
    });

    // 删除收藏
    router.delete('/favorite/:userId/:questionId', async (req, res) => {
        try {
            const { userId, questionId } = req.params;

            const query = `DELETE FROM favorite_questions WHERE user_id = $1 AND question_id = $2 RETURNING *`;
            const result = await pool.query(query, [userId, questionId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: '收藏记录不存在' });
            }

            res.json({ message: '删除成功' });
        } catch (error) {
            console.error('删除收藏失败:', error);
            res.status(500).json({ error: '删除收藏失败' });
        }
    });

    // =====================================================
    // 6. 成绩导出API
    // =====================================================

    // 导出学习报告
    router.get('/export/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { format = 'json' } = req.query;

            // 获取用户进度
            const progressQuery = `
                SELECT *,
                    (SELECT COUNT(*) FROM questions) as total_questions,
                    (SELECT COUNT(DISTINCT question_id) FROM practice_history WHERE user_id = $1) as unique_practiced
                FROM user_progress WHERE user_id = $1
            `;
            const progressResult = await pool.query(progressQuery, [userId]);
            const progress = progressResult.rows[0] || {};

            // 获取分类进度
            const categoryQuery = `
                SELECT
                    q.category,
                    COUNT(*) as total_count,
                    COUNT(DISTINCT ph.question_id) as practiced_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                    ROUND(100.0 * COUNT(*) FILTER (WHERE ph.is_correct = true) / NULLIF(COUNT(DISTINCT ph.question_id), 0), 2) as accuracy_rate
                FROM questions q
                LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                WHERE q.category IS NOT NULL
                GROUP BY q.category
            `;
            const categoryResult = await pool.query(categoryQuery, [userId]);

            // 获取考试记录
            const examQuery = `
                SELECT * FROM exam_records
                WHERE user_id = $1 AND finished_at IS NOT NULL
                ORDER BY started_at DESC LIMIT 10
            `;
            const examResult = await pool.query(examQuery, [userId]);

            const report = {
                user_id: userId,
                generated_at: new Date().toISOString(),
                progress: progress,
                category_progress: categoryResult.rows,
                exam_history: examResult.rows
            };

            if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=study_report_${userId}_${Date.now()}.json`);
                res.json(report);
            } else {
                res.json(report);
            }
        } catch (error) {
            console.error('导出报告失败:', error);
            res.status(500).json({ error: '导出报告失败' });
        }
    });

    return router;
};
