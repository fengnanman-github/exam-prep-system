/**
 * 智能练习算法
 * 基于用户练习历史智能推荐题目
 */

module.exports = (pool) => {
    const router = require('express').Router();

    /**
     * 智能推荐题目
     * GET /api/v2/practice/recommend/:userId
     * Query参数:
     *   - law_category: 法律法规分类（可选）
     *   - tech_category: 技术专业分类（可选）
     *   - difficulty: 难度（可选）
     *   - question_type: 题型（可选）
     *   - limit: 返回题目数量（默认10）
     *
     * 推荐策略：
     * 1. 优先推荐薄弱知识点（错误率高的）
     * 2. 其次推荐未做过的题目
     * 3. 最后推荐需要巩固的题目（很久没做的）
     */
    router.get('/practice/recommend/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const {
                law_category,
                tech_category,
                difficulty,
                question_type,
                limit = 10
            } = req.query;

            // 构建基础查询条件
            let whereConditions = ['q.id IS NOT NULL'];
            let params = [];
            let paramIndex = 1;

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

            if (difficulty) {
                whereConditions.push(`q.difficulty = $${paramIndex}`);
                params.push(difficulty);
                paramIndex++;
            }

            if (question_type) {
                whereConditions.push(`q.question_type = $${paramIndex}`);
                params.push(question_type);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            // 获取用户的练习统计，按知识点分组
            const statsQuery = `
                SELECT
                    ph.knowledge_point,
                    COUNT(*) as total_practices,
                    COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = false) as wrong_count,
                    MAX(ph.practiced_at) as last_practiced
                FROM practice_history ph
                JOIN questions q ON ph.question_id = q.id
                WHERE ph.user_id = $1
                    AND ph.knowledge_point IS NOT NULL
                    AND ph.knowledge_point != ''
                GROUP BY ph.knowledge_point
            `;
            const statsResult = await pool.query(statsQuery, [userId]);
            const knowledgeStats = {};
            statsResult.rows.forEach(row => {
                knowledgeStats[row.knowledge_point] = {
                    total_practices: parseInt(row.total_practices),
                    correct_count: parseInt(row.correct_count),
                    wrong_count: parseInt(row.wrong_count),
                    error_rate: parseInt(row.wrong_count) / parseInt(row.total_practices),
                    last_practiced: row.last_practiced
                };
            });

            // 策略1: 推荐薄弱知识点的未做题目（错误率>30%）
            const weakKnowledgePoints = Object.entries(knowledgeStats)
                .filter(([_, stats]) => stats.error_rate > 0.3)
                .sort((a, b) => b[1].error_rate - a[1].error_rate)
                .map(([kp]) => kp);

            let recommendedQuestions = [];
            const finalLimit = parseInt(limit);

            if (weakKnowledgePoints.length > 0) {
                const weakQuery = `
                    SELECT DISTINCT q.*,
                        0 as priority,
                        'weak' as recommend_reason
                    FROM questions q
                    LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $${paramIndex}
                    WHERE ${whereClause}
                        AND q.knowledge_point = ANY($${paramIndex + 1})
                        AND ph.id IS NULL
                    ORDER BY RANDOM()
                    LIMIT $${paramIndex + 2}
                `;
                params.push(userId, weakKnowledgePoints.slice(0, 5), finalLimit);
                const weakResult = await pool.query(weakQuery, params);
                recommendedQuestions = weakResult.rows.map(q => ({
                    ...q,
                    recommend_reason: '薄弱知识点练习',
                    priority: 1
                }));
            }

            // 策略2: 如果推荐不足，补充未做过的题目
            if (recommendedQuestions.length < finalLimit) {
                const remainingLimit = finalLimit - recommendedQuestions.length;
                const newQuestionIds = recommendedQuestions.map(q => q.id);
                const newQuery = `
                    SELECT q.*,
                        0 as priority,
                        'new' as recommend_reason
                    FROM questions q
                    LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                    WHERE ${whereClause}
                        AND ph.id IS NULL
                        ${newQuestionIds.length > 0 ? `AND q.id NOT IN (${newQuestionIds.map((_, i) => '$' + (paramIndex + 3 + i)).join(',')})` : ''}
                    ORDER BY RANDOM()
                    LIMIT $${paramIndex + 3 + newQuestionIds.length}
                `;
                const newParams = [userId, ...params.slice(1), remainingLimit];
                const newResult = await pool.query(newQuestionIds.length > 0 ?
                    newQuery.replace('$' + (paramIndex + 3 + newQuestionIds.length), '$' + (paramIndex + 3 + newQuestionIds.length))
                        : newQuery, newParams);
                recommendedQuestions = [
                    ...recommendedQuestions,
                    ...newResult.rows.map(q => ({
                        ...q,
                        recommend_reason: '新题练习',
                        priority: 2
                    }))
                ];
            }

            // 策略3: 如果还不够，推荐需要巩固的题目（7天以上未做且做对的题目）
            if (recommendedQuestions.length < finalLimit) {
                const remainingLimit = finalLimit - recommendedQuestions.length;
                const existingIds = recommendedQuestions.map(q => q.id);
                const reviewQuery = `
                    SELECT q.*,
                        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(ph.practiced_at))) as days_since_practice,
                        'review' as recommend_reason
                    FROM practice_history ph
                    JOIN questions q ON ph.question_id = q.id
                    WHERE ph.user_id = $1
                        AND ph.is_correct = true
                        AND ph.practiced_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
                        AND ${whereClause.replace(/q\./g, 'q.')}
                        ${existingIds.length > 0 ? `AND q.id NOT IN (${existingIds.map((_, i) => '$' + (paramIndex + 2 + i)).join(',')})` : ''}
                    GROUP BY q.id, ph.practiced_at
                    HAVING MAX(ph.practiced_at) < CURRENT_TIMESTAMP - INTERVAL '7 days'
                    ORDER BY MAX(ph.practiced_at) ASC
                    LIMIT $${paramIndex + 2 + existingIds.length}
                `;
                const reviewParams = [userId, ...params.slice(1), remainingLimit];
                const reviewResult = await pool.query(reviewQuery, reviewParams);
                recommendedQuestions = [
                    ...recommendedQuestions,
                    ...reviewResult.rows.map(q => ({
                        ...q,
                        recommend_reason: `巩固练习（${Math.floor(q.days_since_practice)}天未练）`,
                        priority: 3
                    }))
                ];
            }

            // 按优先级和推荐原因排序
            recommendedQuestions.sort((a, b) => a.priority - b.priority);

            res.json({
                total: recommendedQuestions.length,
                knowledge_stats: knowledgeStats,
                questions: recommendedQuestions.slice(0, finalLimit)
            });
        } catch (error) {
            console.error('智能推荐失败:', error);
            res.status(500).json({ error: '智能推荐失败' });
        }
    });

    /**
     * 获取答案提示
     * GET /api/v2/practice/hint/:questionId
     *
     * 返回逐步提示：
     * - level 1: 知识点提示
     * - level 2: 解题思路
     * - level 3: 部分答案（排除明显错误选项）
     * - level 4: 完整答案
     */
    router.get('/practice/hint/:questionId', async (req, res) => {
        try {
            const { questionId } = req.params;
            const { level = 1 } = req.query;

            const questionQuery = `
                SELECT q.*,
                       CASE
                           WHEN q.question_type = '判断题' THEN
                               CASE
                                   WHEN q.correct_answer = 'A' THEN '这是一道判断题，正确答案：正确'
                                   ELSE '这是一道判断题，正确答案：错误'
                               END
                           WHEN q.question_type = '单项选择题' THEN
                               '这是一道单选题，从A、B、C、D中选择一个最合适的答案'
                           WHEN q.question_type = '多项选择题' THEN
                               '这是一道多选题，有两个或两个以上正确答案'
                           ELSE '请仔细阅读题目'
                       END as question_type_hint
                FROM questions q
                WHERE q.id = $1
            `;
            const result = await pool.query(questionQuery, [questionId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: '题目不存在' });
            }

            const question = result.rows[0];
            const hintLevel = parseInt(level);

            let hint = {
                level: hintLevel,
                question_id: questionId,
                question_type: question.question_type
            };

            // Level 1: 知识点提示
            if (hintLevel >= 1) {
                hint.knowledge_point = question.knowledge_point || '本题无明确知识点标注';
                hint.knowledge_hint = `💡 考查知识点：${hint.knowledge_point}`;
            }

            // Level 2: 题型提示和解题思路
            if (hintLevel >= 2) {
                hint.type_hint = question.question_type_hint;
                hint.thinking_hint = getThinkingHint(question);
            }

            // Level 3: 部分答案提示
            if (hintLevel >= 3) {
                hint.partial_hint = getPartialHint(question);
            }

            // Level 4: 完整答案
            if (hintLevel >= 4) {
                hint.full_answer = question.correct_answer;
                hint.answer_explanation = getAnswerExplanation(question);
            }

            res.json(hint);
        } catch (error) {
            console.error('获取提示失败:', error);
            res.status(500).json({ error: '获取提示失败' });
        }
    });

    /**
     * 检查是否有新题
     * GET /api/v2/practice/check-new/:userId
     * Query参数: law_category, tech_category, difficulty, question_type
     */
    router.get('/practice/check-new/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const {
                law_category,
                tech_category,
                difficulty,
                question_type
            } = req.query;

            let whereConditions = ['q.id IS NOT NULL'];
            let params = [];
            let paramIndex = 2; // 从2开始，因为$1是userId

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

            if (difficulty) {
                whereConditions.push(`q.difficulty = $${paramIndex}`);
                params.push(difficulty);
                paramIndex++;
            }

            if (question_type) {
                whereConditions.push(`q.question_type = $${paramIndex}`);
                params.push(question_type);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            // 统计总题数
            const totalQuery = `
                SELECT COUNT(*) as count
                FROM questions q
                WHERE ${whereClause.replace(/\$\d+/g, (match) => {
                    // 将占位符索引减1，因为在这个查询中没有userId
                    return '$' + (parseInt(match.substring(1)) - 1);
                })}
            `;
            const totalParams = params.slice(); // 复制参数
            const totalResult = await pool.query(totalQuery, totalParams);
            const totalCount = parseInt(totalResult.rows[0].count);

            // 统计已做题数
            const practicedQuery = `
                SELECT COUNT(DISTINCT q.id) as count
                FROM questions q
                JOIN practice_history ph ON q.id = ph.question_id
                WHERE ph.user_id = $1
                    AND ${whereClause}
            `;
            const practicedResult = await pool.query(practicedQuery, [userId, ...params]);
            const practicedCount = parseInt(practicedResult.rows[0].count);

            const newCount = totalCount - practicedCount;
            const completionRate = totalCount > 0 ? (practicedCount / totalCount * 100).toFixed(1) : 0;

            // 如果没有新题，推荐其他分类
            let recommendations = [];
            if (newCount === 0) {
                const recommendQuery = `
                    SELECT
                        q.law_category,
                        q.tech_category,
                        COUNT(*) as total_count,
                        COUNT(DISTINCT CASE WHEN ph.id IS NULL THEN q.id END) as new_count
                    FROM questions q
                    LEFT JOIN practice_history ph ON q.id = ph.question_id AND ph.user_id = $1
                    WHERE q.law_category IS NOT NULL
                        AND q.tech_category IS NOT NULL
                        AND ph.id IS NULL
                    GROUP BY q.law_category, q.tech_category
                    HAVING COUNT(DISTINCT CASE WHEN ph.id IS NULL THEN q.id END) > 0
                    ORDER BY new_count DESC
                    LIMIT 5
                `;
                const recommendResult = await pool.query(recommendQuery, [userId]);
                recommendations = recommendResult.rows;
            }

            res.json({
                current_selection: {
                    law_category,
                    tech_category,
                    difficulty,
                    question_type
                },
                total_questions: totalCount,
                practiced_questions: practicedCount,
                new_questions: newCount,
                completion_rate: parseFloat(completionRate),
                has_new_questions: newCount > 0,
                recommendations: newCount === 0 ? recommendations : []
            });
        } catch (error) {
            console.error('检查新题失败:', error);
            res.status(500).json({ error: '检查新题失败' });
        }
    });

    return router;
};

/**
 * 获取解题思路提示
 */
function getThinkingHint(question) {
    const hints = {
        '判断题': '判断题需要仔细阅读题目，注意绝对性词语（如"必须"、"一定"、"所有"等）',
        '单项选择题': '单选题只有一个最佳答案，排除明显错误选项，在剩余选项中选择最合适的',
        '多项选择题': '多选题有两个或两个以上正确答案，选择所有符合题意的选项'
    };

    let hint = hints[question.question_type] || '请仔细审题，逐项分析';

    if (question.knowledge_point) {
        hint += `\n📖 结合知识点：${question.knowledge_point}`;
    }

    return hint;
}

/**
 * 获取部分答案提示
 */
function getPartialHint(question) {
    if (question.question_type === '判断题') {
        return {
            type: '判断',
            hint: '判断题只有正确和错误两个选项，根据题干陈述是否符合相关法规来判断'
        };
    }

    if (question.question_type === '单项选择题') {
        return {
            type: '单选',
            hint: '单选题只有一个正确答案，建议使用排除法'
        };
    }

    if (question.question_type === '多项选择题') {
        const correctCount = question.correct_answer.length;
        return {
            type: '多选',
            hint: `这道多选题有 ${correctCount} 个正确答案`,
            options: ['A', 'B', 'C', 'D'].map(opt => ({
                option: opt,
                is_correct: question.correct_answer.includes(opt)
            }))
        };
    }

    return { type: '未知', hint: '请仔细审题' };
}

/**
 * 获取答案解释
 */
function getAnswerExplanation(question) {
    let explanation = `正确答案是：${question.correct_answer}`;

    if (question.question_type === '判断题') {
        explanation += question.correct_answer === 'A' ? '（正确）' : '（错误）';
    }

    if (question.knowledge_point) {
        explanation += `\n🎯 考查知识点：${question.knowledge_point}`;
    }

    return explanation;
}
