/**
 * 基于遗忘曲线的间隔重复练习算法
 * Spaced Repetition System (SRS)
 */

module.exports = (pool) => {
    const router = require('express').Router();

    // 遗忘曲线配置（艾宾浩斯遗忘曲线）
    // key: 复习次数, value: 复习间隔（天）
    const FORGETTING_CURVE = {
        1: 1,      // 第1次复习：1天后
        2: 3,      // 第2次复习：3天后
        3: 7,      // 第3次复习：7天后
        4: 15,     // 第4次复习：15天后
        5: 30,     // 第5次复习：30天后
        6: 60,     // 第6次复习：60天后
        7: 120,    // 第7次复习：120天后
        default: 120
    };

    /**
     * 智能获取练习题目
     * GET /api/v2/practice/smart/:userId
     *
     * 算法逻辑：
     * 1. 优先级1（最高）：错误率 > 50% 的题目（急需复习）
     * 2. 优先级2：错误率 30%-50% 的题目
     * 3. 优先级3：到了复习时间的题目（基于遗忘曲线）
     * 4. 优先级4：掌握度 < 60% 的题目
     * 5. 优先级5：未做过的题目（新题）
     *
     * 查询参数：
     * - learning_path: 学习路径（可选）
     * - subcategory: 子类别（可选）
     * - limit: 返回题目数量（默认10）
     */
    router.get('/practice/smart/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { learning_path, subcategory, limit = 10 } = req.query;

            // 构建查询条件
            let whereConditions = ['q.id IS NOT NULL'];
            let params = [];
            let paramIndex = 1;

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

            const whereClause = whereConditions.join(' AND ');

            // 获取用户练习统计，包含最后一次练习时间
            const statsQuery = `
                SELECT
                    ph.question_id,
                    COUNT(*) as practice_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                    COUNT(*) FILTER (WHERE ph.is_correct = false) as wrong_count,
                    MAX(ph.practiced_at) as last_practiced,
                    -- 计算错误率
                    CASE
                        WHEN COUNT(*) > 0 THEN
                            COUNT(*) FILTER (WHERE ph.is_correct = false)::float / COUNT(*)
                        ELSE 0
                    END as error_rate,
                    -- 计算应该复习的间隔天数
                    CASE
                        WHEN COUNT(*) = 0 THEN 0
                        WHEN COUNT(*) <= 7 THEN
                            (ARRAY[0,1,3,7,15,30,60,120])[COUNT(*)::int]
                        ELSE 120
                    END as review_interval_days
                FROM practice_history ph
                JOIN questions q ON ph.question_id = q.id
                WHERE ph.user_id = $1
                    ${learning_path ? `AND q.learning_path = $${paramIndex}` : ''}
                    ${subcategory ? `AND q.knowledge_subcategory = $${paramIndex + (learning_path ? 1 : 0)}` : ''}
                GROUP BY ph.question_id
            `;

            const statsResult = await pool.query(statsQuery, [userId]);
            const practiceStats = {};
            statsResult.rows.forEach(row => {
                practiceStats[row.question_id] = {
                    practice_count: parseInt(row.practice_count),
                    correct_count: parseInt(row.correct_count),
                    wrong_count: parseInt(row.wrong_count),
                    error_rate: parseFloat(row.error_rate),
                    last_practiced: row.last_practiced,
                    review_interval_days: parseInt(row.review_interval_days)
                };
            });

            // 计算每道题的复习优先级
            const questionPriorities = [];
            for (const [questionId, stats] of Object.entries(practiceStats)) {
                const daysSincePractice = stats.last_practiced
                    ? Math.floor((Date.now() - new Date(stats.last_practiced).getTime()) / (1000 * 60 * 60 * 24))
                    : 999;

                const daysUntilReview = Math.max(0, stats.review_interval_days - daysSincePractice);
                const isOverdue = daysSincePractice >= stats.review_interval_days;

                let priority = 0;
                let reason = '';

                // 优先级判断
                if (stats.error_rate > 0.5) {
                    priority = 5;
                    reason = `错误率${(stats.error_rate * 100).toFixed(0)}%，急需复习`;
                } else if (stats.error_rate > 0.3) {
                    priority = 4;
                    reason = `错误率${(stats.error_rate * 100).toFixed(0)}%，建议复习`;
                } else if (isOverdue) {
                    if (daysUntilReview < -7) {
                        priority = 5;
                        reason = `已过期${Math.abs(daysUntilReview)}天`;
                    } else if (daysUntilReview < -3) {
                        priority = 4;
                        reason = `已过期${Math.abs(daysUntilReview)}天`;
                    } else {
                        priority = 3;
                        reason = '到了复习时间';
                    }
                } else if (stats.correct_count > 0 && stats.wrong_count === 0 && stats.practice_count >= 3) {
                    priority = 1;
                    reason = '已掌握';
                } else {
                    priority = 2;
                    reason = `${daysUntilReview}天后复习`;
                }

                questionPriorities.push({
                    question_id: parseInt(questionId),
                    priority,
                    reason,
                    stats
                });
            }

            // 按优先级排序，优先级相同的按错误率排序
            questionPriorities.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return b.stats.error_rate - a.stats.error_rate;
            });

            // 获取高优先级的题目（优先级3及以上）
            const highPriorityQuestionIds = questionPriorities
                .filter(qp => qp.priority >= 3)
                .slice(0, parseInt(limit))
                .map(qp => qp.question_id);

            let questions = [];

            if (highPriorityQuestionIds.length > 0) {
                // 获取高优先级题目详情
                const questionsQuery = `
                    SELECT *,
                           CASE
                               WHEN ph.practice_count IS NULL THEN 0
                               ELSE ph.practice_count
                           END as total_practices
                    FROM questions q
                    LEFT JOIN (
                        SELECT question_id, COUNT(*) as practice_count
                        FROM practice_history
                        WHERE user_id = $1
                        GROUP BY question_id
                    ) ph ON q.id = ph.question_id
                    WHERE q.id = ANY($2)
                    ORDER BY POSITION(id IN $2::int[])
                `;
                const questionsResult = await pool.query(questionsQuery, [userId, highPriorityQuestionIds]);
                questions = questionsResult.rows.map((q, index) => ({
                    ...q,
                    recommend_reason: questionPriorities[index].reason,
                    priority: questionPriorities[index].priority
                }));
            }

            // 如果高优先级题目不足，补充新题
            if (questions.length < parseInt(limit)) {
                const practicedIds = Object.keys(practiceStats).map(id => parseInt(id));
                const remainingLimit = parseInt(limit) - questions.length;

                const newQuestionsQuery = `
                    SELECT q.*, 0 as total_practices, '新题' as recommend_reason, 2 as priority
                    FROM questions q
                    WHERE ${whereClause}
                        ${practicedIds.length > 0 ? `AND q.id NOT IN (${practicedIds.map((_, i) => '$' + (paramIndex + 3 + i)).join(',')})` : ''}
                    ORDER BY RANDOM()
                    LIMIT $${paramIndex + 3 + practicedIds.length}
                `;

                try {
                    const newQuestionsResult = await pool.query(newQuestionsQuery, [
                        userId, ...params, remainingLimit
                    ]);
                    questions = [
                        ...questions,
                        ...newQuestionsResult.rows
                    ];
                } catch (error) {
                    console.error('获取新题失败:', error);
                }
            }

            res.json({
                total: questions.length,
                questions: questions.slice(0, parseInt(limit)),
                stats: {
                    total_practiced: Object.keys(practiceStats).length,
                    priority_distribution: {
                        urgent: questionPriorities.filter(qp => qp.priority === 5).length,
                        high: questionPriorities.filter(qp => qp.priority === 4).length,
                        medium: questionPriorities.filter(qp => qp.priority === 3).length,
                        low: questionPriorities.filter(qp => qp.priority <= 2).length
                    }
                }
            });
        } catch (error) {
            console.error('智能练习推荐失败:', error);
            res.status(500).json({ error: '智能练习推荐失败' });
        }
    });

    /**
     * 提交练习答案并更新复习计划
     * POST /api/v2/practice/submit-with-srs
     *
     * 基于答案正确性动态调整复习间隔：
     * - 答对：保持或增加复习间隔
     * - 答错：重置复习间隔，增加练习次数
     */
    router.post('/practice/submit-with-srs', async (req, res) => {
        try {
            const { user_id, question_id, user_answer, is_correct, time_spent } = req.body;

            // 获取该题目的练习历史
            const historyQuery = `
                SELECT
                    COUNT(*) as practice_count,
                    COUNT(*) FILTER (WHERE is_correct = true) as correct_count,
                    COUNT(*) FILTER (WHERE is_correct = false) as wrong_count,
                    MAX(practiced_at) as last_practiced
                FROM practice_history
                WHERE user_id = $1 AND question_id = $2
            `;
            const historyResult = await pool.query(historyQuery, [user_id, question_id]);
            const history = historyResult.rows[0];

            const practiceCount = parseInt(history.practice_count) || 0;
            const wrongCount = parseInt(history.wrong_count) || 0;

            // 计算新的复习间隔
            let nextReviewDays;
            let masteryLevel;

            if (is_correct) {
                // 答对了：根据练习次数增加间隔
                if (practiceCount < 7) {
                    nextReviewDays = FORGETTING_CURVE[practiceCount + 1] || FORGETTING_CURVE.default;
                } else {
                    nextReviewDays = FORGETTING_CURVE.default;
                }

                // 计算掌握度（0-1）
                const correctCount = parseInt(history.correct_count) || 0;
                masteryLevel = Math.min(0.95, 0.3 + (correctCount / (practiceCount || 1)) * 0.6);
            } else {
                // 答错了：重置为短期复习
                nextReviewDays = 1; // 明天再练
                masteryLevel = Math.max(0.1, (history.correct_count || 0) / (practiceCount || 1) * 0.5);
            }

            // 记录练习历史
            await pool.query(`
                INSERT INTO practice_history (user_id, question_id, user_answer, is_correct, time_spent, practiced_at, mastery_level)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
            `, [user_id, question_id, user_answer, is_correct, time_spent, masteryLevel]);

            // 更新或创建错题记录
            if (!is_correct) {
                await pool.query(`
                    INSERT INTO wrong_answers (user_id, question_id, wrong_count, next_review_time, mastery_level)
                    VALUES ($1, $2, 1, CURRENT_TIMESTAMP + INTERVAL '1 day', $3)
                    ON CONFLICT (user_id, question_id)
                    DO UPDATE SET
                        wrong_count = wrong_answers.wrong_count + 1,
                        next_review_time = CURRENT_TIMESTAMP + INTERVAL '1 day',
                        mastery_level = $3,
                        updated_at = CURRENT_TIMESTAMP
                `, [user_id, question_id, masteryLevel]);
            } else {
                // 答对了，检查是否需要从错题本移除
                const recentWrongCount = await pool.query(`
                    SELECT COUNT(*) FROM wrong_answers
                    WHERE user_id = $1 AND question_id = $2
                    AND practiced_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
                `, [user_id, question_id]);

                if (parseInt(recentWrongCount.rows[0].count) === 0) {
                    // 最近7天没有错，从错题本移除
                    await pool.query(`
                        DELETE FROM wrong_answers
                        WHERE user_id = $1 AND question_id = $2
                    `, [user_id, question_id]);
                }
            }

            res.json({
                success: true,
                next_review_days: nextReviewDays,
                mastery_level: masteryLevel,
                message: is_correct ?
                    `✅ 回答正确！${nextReviewDays}天后复习` :
                    `❌ 回答错误，明天再练一次`
            });
        } catch (error) {
            console.error('提交练习失败:', error);
            res.status(500).json({ error: '提交练习失败' });
        }
    });

    /**
     * 获取今日复习计划
     * GET /api/v2/practice/daily-plan/:userId
     */
    router.get('/practice/daily-plan/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            // 获取今日需要复习的题目
            const planQuery = `
                SELECT
                    q.id,
                    q.question_text,
                    q.question_type,
                    q.learning_path,
                    q.knowledge_subcategory,
                    ph.practice_count,
                    ph.correct_count,
                    ph.wrong_count,
                    ph.last_practiced,
                    ph.error_rate,
                    CASE
                        WHEN ph.last_practiced IS NULL THEN 'new'
                        WHEN ph.error_rate > 0.5 THEN 'urgent'
                        WHEN ph.error_rate > 0.3 THEN 'review'
                        WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ph.last_practiced)) >= COALESCE(ph.review_interval_days, 999) THEN 'due'
                        ELSE 'later'
                    END as review_status
                FROM (
                    SELECT
                        ph.question_id,
                        COUNT(*) as practice_count,
                        COUNT(*) FILTER (WHERE ph.is_correct = true) as correct_count,
                        COUNT(*) FILTER (WHERE ph.is_correct = false) as wrong_count,
                        MAX(ph.practiced_at) as last_practiced,
                        CASE
                            WHEN COUNT(*) > 0 THEN
                                COUNT(*) FILTER (WHERE ph.is_correct = false)::float / COUNT(*)
                            ELSE 0
                        END as error_rate,
                        CASE
                            WHEN COUNT(*) = 0 THEN 0
                            WHEN COUNT(*) <= 7 THEN
                                (ARRAY[0,1,3,7,15,30,60,120])[COUNT(*)::int]
                            ELSE 120
                        END as review_interval_days
                    FROM practice_history ph
                    WHERE ph.user_id = $1
                    GROUP BY ph.question_id
                ) ph
                JOIN questions q ON ph.question_id = q.id
                WHERE ph.last_practiced IS NOT NULL
                ORDER BY
                    CASE ph.error_rate WHEN 0 THEN 0 ELSE 1 END,  -- 无错误的放后面
                    ph.error_rate DESC,
                    ph.last_practiced ASC
                LIMIT 50
            `;

            const planResult = await pool.query(planQuery, [userId]);

            // 分类统计
            const stats = {
                urgent: 0,      // 急需复习（错误率>50%）
                review: 0,      // 需要复习（错误率30-50%）
                due: 0,         // 到期复习
                mastered: 0,    // 已掌握
                new: 0          // 新题（未练习）
            };

            planResult.rows.forEach(row => {
                if (row.review_status === 'urgent') stats.urgent++;
                else if (row.review_status === 'review') stats.review++;
                else if (row.review_status === 'due') stats.due++;
                else if (row.review_status === 'new') stats.new++;
                else stats.mastered++;
            });

            res.json({
                date: new Date().toISOString().split('T')[0],
                total_questions: planResult.rows.length,
                stats,
                questions: planResult.rows
            });
        } catch (error) {
            console.error('获取复习计划失败:', error);
            res.status(500).json({ error: '获取复习计划失败' });
        }
    });

    return router;
};
