/**
 * 数据分析工具
 * 提供题库数据统计、分析和质量检查功能
 */

class DataAnalytics {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * 获取题库统计概览
     */
    async getQuestionStatsOverview() {
        // 总体统计
        const overallResult = await this.pool.query(`
            SELECT
                COUNT(*) as total_questions,
                COUNT(DISTINCT question_type) as unique_types,
                COUNT(DISTINCT category) as unique_categories,
                COUNT(DISTINCT exam_category) as unique_exam_categories
            FROM questions
        `);

        // 按题型统计
        const typeResult = await this.pool.query(`
            SELECT
                question_type,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
            FROM questions
            GROUP BY question_type
            ORDER BY count DESC
        `);

        // 按知识点统计
        const categoryResult = await this.pool.query(`
            SELECT
                category,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
            FROM questions
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
        `);

        // 按考试类别统计
        const examCategoryResult = await this.pool.query(`
            SELECT
                exam_category,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
            FROM questions
            WHERE exam_category IS NOT NULL
            GROUP BY exam_category
            ORDER BY count DESC
        `);

        return {
            overview: overallResult.rows[0],
            byType: typeResult.rows,
            byCategory: categoryResult.rows,
            byExamCategory: examCategoryResult.rows
        };
    }

    /**
     * 检查数据质量问题
     */
    async checkDataQuality() {
        const issues = [];

        // 1. 检查缺少题目的题目
        const missingTextResult = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM questions
            WHERE question_text IS NULL OR question_text = ''
        `);
        if (parseInt(missingTextResult.rows[0].count) > 0) {
            issues.push({
                type: 'missing_text',
                severity: 'critical',
                count: parseInt(missingTextResult.rows[0].count),
                message: '缺少题目文本的题目数量'
            });
        }

        // 2. 检查缺少答案的题目
        const missingAnswerResult = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM questions
            WHERE correct_answer IS NULL OR correct_answer = ''
        `);
        if (parseInt(missingAnswerResult.rows[0].count) > 0) {
            issues.push({
                type: 'missing_answer',
                severity: 'critical',
                count: parseInt(missingAnswerResult.rows[0].count),
                message: '缺少正确答案的题目数量'
            });
        }

        // 3. 检查缺少分类的题目
        const missingCategoryResult = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM questions
            WHERE category IS NULL OR category = ''
        `);
        if (parseInt(missingCategoryResult.rows[0].count) > 0) {
            issues.push({
                type: 'missing_category',
                severity: 'warning',
                count: parseInt(missingCategoryResult.rows[0].count),
                message: '缺少知识点分类的题目数量'
            });
        }

        // 4. 检查缺少考试分类的题目
        const missingExamCategoryResult = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM questions
            WHERE exam_category IS NULL OR exam_category = ''
        `);
        if (parseInt(missingExamCategoryResult.rows[0].count) > 0) {
            issues.push({
                type: 'missing_exam_category',
                severity: 'warning',
                count: parseInt(missingExamCategoryResult.rows[0].count),
                message: '缺少考试分类的题目数量'
            });
        }

        // 5. 检查缺少选项的题目（选择题）
        const missingOptionsResult = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM questions
            WHERE question_type IN ('单项选择题', '多项选择题')
              AND (option_a IS NULL OR option_b IS NULL OR option_c IS NULL OR option_d IS NULL)
        `);
        if (parseInt(missingOptionsResult.rows[0].count) > 0) {
            issues.push({
                type: 'missing_options',
                severity: 'error',
                count: parseInt(missingOptionsResult.rows[0].count),
                message: '缺少选项的选择题数量'
            });
        }

        // 6. 检查重复题目
        const duplicateResult = await this.pool.query(`
            SELECT question_text, COUNT(*) as count
            FROM questions
            WHERE question_text IS NOT NULL AND question_text != ''
            GROUP BY question_text
            HAVING COUNT(*) > 1
        `);
        if (duplicateResult.rows.length > 0) {
            issues.push({
                type: 'duplicate_questions',
                severity: 'warning',
                count: duplicateResult.rows.length,
                message: '重复的题目数量'
            });
        }

        return {
            totalIssues: issues.length,
            criticalIssues: issues.filter(i => i.severity === 'critical').length,
            issues
        };
    }

    /**
     * 分析题目覆盖率
     */
    async analyzeCoverage(userId) {
        // 分析用户对各知识点的覆盖情况
        const result = await this.pool.query(`
            SELECT
                q.category,
                COUNT(*) as total_count,
                COUNT(DISTINCT ph.question_id) as practiced_count,
                ROUND(COUNT(DISTINCT ph.question_id) * 100.0 / COUNT(*), 1) as coverage_rate
            FROM questions q
            LEFT JOIN practice_history ph ON ph.question_id = q.id AND ph.user_id = $1
            WHERE q.category IS NOT NULL
            GROUP BY q.category
            ORDER BY coverage_rate ASC, total_count DESC
        `, [userId]);

        return {
            userId,
            categories: result.rows,
            overallCoverage: result.rows.length > 0 ?
                Math.round(result.rows.reduce((sum, r) => sum + parseFloat(r.coverage_rate || 0), 0) / result.rows.length) : 0
        };
    }

    /**
     * 生成数据扩充建议
     */
    async generateExpansionRecommendations() {
        const recommendations = [];

        // 1. 分析题库分布
        const stats = await this.getQuestionStatsOverview();

        // 检查题型分布是否均衡
        const typeDistribution = stats.byType;
        const maxTypeCount = parseInt(typeDistribution[0]?.count || 0);
        const minTypeCount = parseInt(typeDistribution[typeDistribution.length - 1]?.count || 0);

        if (maxTypeCount > minTypeCount * 3) {
            recommendations.push({
                type: 'question_type_balance',
                priority: 'high',
                message: '题型分布不均衡，建议增加较少题型的题目数量',
                details: {
                    maxType: typeDistribution[0],
                    minType: typeDistribution[typeDistribution.length - 1]
                }
            });
        }

        // 检查知识点分布是否均衡
        const categoryDistribution = stats.byCategory;
        if (categoryDistribution.length > 0) {
            const maxCategoryCount = parseInt(categoryDistribution[0]?.count || 0);
            const minCategoryCount = parseInt(categoryDistribution[categoryDistribution.length - 1]?.count || 0);

            if (maxCategoryCount > minCategoryCount * 5) {
                recommendations.push({
                    type: 'category_balance',
                    priority: 'medium',
                    message: '知识点分布不均衡，建议增加较少知识点的题目数量',
                    details: {
                        maxCategory: categoryDistribution[0],
                        minCategory: categoryDistribution[categoryDistribution.length - 1]
                    }
                });
            }
        }

        // 2. 检查缺少答案解析的题目
        const missingExplanationResult = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM questions
            WHERE explanation IS NULL OR explanation = ''
        `);
        const missingExplanationCount = parseInt(missingExplanationResult.rows[0].count);
        if (missingExplanationCount > 0) {
            recommendations.push({
                type: 'add_explanations',
                priority: 'medium',
                message: `有 ${missingExplanationCount} 道题目缺少答案解析，建议补充`,
                details: { count: missingExplanationCount }
            });
        }

        // 3. 检查缺少难度的题目
        const missingDifficultyResult = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM questions
            WHERE difficulty IS NULL
        `);
        const missingDifficultyCount = parseInt(missingDifficultyResult.rows[0].count);
        if (missingDifficultyCount > 0) {
            recommendations.push({
                type: 'add_difficulty',
                priority: 'low',
                message: `有 ${missingDifficultyCount} 道题目缺少难度标识，建议标注`,
                details: { count: missingDifficultyCount }
            });
        }

        return recommendations;
    }

    /**
     * 获取学习资源推荐
     */
    async getResourceRecommendations(userId) {
        // 分析用户薄弱环节
        const weakAreas = await this.getWeakAreas(userId);

        // 基于薄弱环节推荐学习资源
        const recommendations = [];

        for (const area of weakAreas.slice(0, 3)) {
            // 根据知识点推荐相关文档
            const docResult = await this.pool.query(`
                SELECT id, title, category, file_path
                FROM documents
                WHERE category = $1 OR title LIKE '%' || $1 || '%'
                LIMIT 3
            `, [area.category]);

            if (docResult.rows.length > 0) {
                recommendations.push({
                    type: 'document',
                    category: area.category,
                    accuracy: area.accuracy,
                    resources: docResult.rows
                });
            }
        }

        return recommendations;
    }

    /**
     * 获取用户薄弱环节
     */
    async getWeakAreas(userId) {
        const result = await this.pool.query(`
            SELECT
                q.category,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE ph.is_correct = true) * 100.0 / COUNT(*) as accuracy
            FROM practice_history ph
            JOIN questions q ON ph.question_id = q.id
            WHERE ph.user_id = $1
            GROUP BY q.category
            HAVING COUNT(*) >= 5
            ORDER BY accuracy ASC
            LIMIT 5
        `, [userId]);

        return result.rows;
    }

    /**
     * 生成模拟考试
     */
    async generateMockExam(config = {}) {
        const {
            totalQuestions = 100,
            distribution = {
                singleChoice: 0.4,
                multiChoice: 0.3,
                judgment: 0.3
            },
            categories = [],
            difficulty = 'mixed'
        } = config;

        const questions = [];

        // 生成单选题
        const singleChoiceCount = Math.round(totalQuestions * distribution.singleChoice);
        if (singleChoiceCount > 0) {
            const singleResult = await this.pool.query(`
                SELECT id
                FROM questions
                WHERE question_type = '单项选择题'
                ${categories.length > 0 ? 'AND category = ANY($1)' : ''}
                ${difficulty !== 'mixed' ? 'AND difficulty = $2' : ''}
                ORDER BY RANDOM()
                LIMIT $3
            `, categories.length > 0 ? [categories, difficulty, singleChoiceCount] : [difficulty, singleChoiceCount]);
            questions.push(...singleResult.rows);
        }

        // 生成多选题
        const multiChoiceCount = Math.round(totalQuestions * distribution.multiChoice);
        if (multiChoiceCount > 0) {
            const multiResult = await this.pool.query(`
                SELECT id
                FROM questions
                WHERE question_type = '多项选择题'
                ${categories.length > 0 ? 'AND category = ANY($1)' : ''}
                ${difficulty !== 'mixed' ? 'AND difficulty = $2' : ''}
                ORDER BY RANDOM()
                LIMIT $3
            `, categories.length > 0 ? [categories, difficulty, multiChoiceCount] : [difficulty, multiChoiceCount]);
            questions.push(...multiResult.rows);
        }

        // 生成判断题
        const judgmentCount = Math.round(totalQuestions * distribution.judgment);
        if (judgmentCount > 0) {
            const judgmentResult = await this.pool.query(`
                SELECT id
                FROM questions
                WHERE question_type = '判断题'
                ${categories.length > 0 ? 'AND category = ANY($1)' : ''}
                ${difficulty !== 'mixed' ? 'AND difficulty = $2' : ''}
                ORDER BY RANDOM()
                LIMIT $3
            `, categories.length > 0 ? [categories, difficulty, judgmentCount] : [difficulty, judgmentCount]);
            questions.push(...judgmentResult.rows);
        }

        return {
            config,
            totalQuestions: questions.length,
            questionIds: questions.map(q => q.id),
            distribution: {
                singleChoice: singleChoiceCount,
                multiChoice: multiChoiceCount,
                judgment: judgmentCount
            }
        };
    }
}

module.exports = DataAnalytics;
