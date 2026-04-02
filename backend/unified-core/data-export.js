/**
 * 数据导出功能
 * 支持导出用户学习数据为各种格式
 */

class DataExport {
    constructor(pool) {
        this.pool = pool;
        this.supportedFormats = ['json', 'csv', 'xlsx'];
        this.exportTypes = {
            practice_history: '练习历史',
            wrong_answers: '错题记录',
            favorite_questions: '收藏题目',
            statistics: '学习统计',
            all: '全部数据'
        };
    }

    /**
     * 导出用户数据
     */
    async exportUserData(userId, exportType, format = 'json') {
        if (!this.supportedFormats.includes(format)) {
            throw new Error(`不支持的格式: ${format}`);
        }

        if (!this.exportTypes[exportType]) {
            throw new Error(`不支持的导出类型: ${exportType}`);
        }

        let data;
        switch (exportType) {
            case 'practice_history':
                data = await this.getPracticeHistory(userId);
                break;
            case 'wrong_answers':
                data = await this.getWrongAnswers(userId);
                break;
            case 'favorite_questions':
                data = await this.getFavoriteQuestions(userId);
                break;
            case 'statistics':
                data = await this.getStatistics(userId);
                break;
            case 'all':
                data = await this.getAllData(userId);
                break;
        }

        return {
            userId,
            exportType,
            format,
            data,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * 获取练习历史
     */
    async getPracticeHistory(userId) {
        const result = await this.pool.query(`
            SELECT
                ph.practiced_at,
                q.question_no,
                q.question_type,
                q.question_text,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_answer,
                ph.user_answer,
                ph.is_correct,
                ph.time_spent,
                sm.mastery_level,
                sm.review_count
            FROM practice_history ph
            JOIN questions q ON ph.question_id = q.id
            LEFT JOIN supermemo_data sm ON sm.question_id = ph.question_id AND sm.user_id = ph.user_id
            WHERE ph.user_id = $1
            ORDER BY ph.practiced_at DESC
        `, [userId]);

        return {
            type: 'practice_history',
            count: result.rows.length,
            records: result.rows
        };
    }

    /**
     * 获取错题记录
     */
    async getWrongAnswers(userId) {
        const result = await this.pool.query(`
            SELECT
                wa.created_at,
                wa.wrong_count,
                wa.next_review_time,
                q.question_no,
                q.question_type,
                q.question_text,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_answer,
                q.explanation,
                sm.mastery_level,
                sm.review_count,
                sm.ease_factor
            FROM wrong_answers wa
            JOIN questions q ON wa.question_id = q.id
            LEFT JOIN supermemo_data sm ON sm.question_id = wa.question_id AND sm.user_id = wa.user_id
            WHERE wa.user_id = $1
            ORDER BY wa.created_at DESC
        `, [userId]);

        return {
            type: 'wrong_answers',
            count: result.rows.length,
            records: result.rows
        };
    }

    /**
     * 获取收藏题目
     */
    async getFavoriteQuestions(userId) {
        const result = await this.pool.query(`
            SELECT
                fq.created_at,
                q.question_no,
                q.question_type,
                q.question_text,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_answer,
                q.explanation
            FROM favorite_questions fq
            JOIN questions q ON fq.question_id = q.id
            WHERE fq.user_id = $1
            ORDER BY fq.created_at DESC
        `, [userId]);

        return {
            type: 'favorite_questions',
            count: result.rows.length,
            records: result.rows
        };
    }

    /**
     * 获取学习统计
     */
    async getStatistics(userId) {
        // 总体统计
        const overallResult = await this.pool.query(`
            SELECT
                COUNT(*) as total_practiced,
                COUNT(*) FILTER (WHERE is_correct = true) as correct_count,
                COUNT(*) FILTER (WHERE is_correct = false) as wrong_count,
                COUNT(*) FILTER (WHERE is_correct = true) * 100.0 / COUNT(*) as accuracy_rate,
                AVG(time_spent) as avg_time_spent
            FROM practice_history
            WHERE user_id = $1
        `, [userId]);

        // 分类统计
        const categoryResult = await this.pool.query(`
            SELECT
                q.category,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE ph.is_correct = true) * 100.0 / COUNT(*) as accuracy
            FROM practice_history ph
            JOIN questions q ON ph.question_id = q.id
            WHERE ph.user_id = $1
            GROUP BY q.category
            ORDER BY accuracy ASC
        `, [userId]);

        // 题型统计
        const typeResult = await this.pool.query(`
            SELECT
                q.question_type,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE ph.is_correct = true) * 100.0 / COUNT(*) as accuracy
            FROM practice_history ph
            JOIN questions q ON ph.question_id = q.id
            WHERE ph.user_id = $1
            GROUP BY q.question_type
        `, [userId]);

        // 学习趋势
        const trendResult = await this.pool.query(`
            SELECT
                DATE(practiced_at) as date,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE is_correct = true) * 100.0 / COUNT(*) as accuracy
            FROM practice_history
            WHERE user_id = $1
              AND practiced_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(practiced_at)
            ORDER BY date DESC
        `, [userId]);

        return {
            type: 'statistics',
            overall: overallResult.rows[0],
            byCategory: categoryResult.rows,
            byType: typeResult.rows,
            trend: trendResult.rows
        };
    }

    /**
     * 获取全部数据
     */
    async getAllData(userId) {
        const [practiceHistory, wrongAnswers, favoriteQuestions, statistics] = await Promise.all([
            this.getPracticeHistory(userId),
            this.getWrongAnswers(userId),
            this.getFavoriteQuestions(userId),
            this.getStatistics(userId)
        ]);

        return {
            type: 'all',
            practiceHistory,
            wrongAnswers,
            favoriteQuestions,
            statistics
        };
    }

    /**
     * 转换为CSV格式
     */
    convertToCSV(data) {
        // 简化的CSV转换实现
        if (data.type === 'practice_history') {
            const headers = ['练习时间', '题目编号', '题型', '是否正确', '用时(秒)', '掌握度', '复习次数'];
            const rows = data.records.map(r => [
                r.practiced_at,
                r.question_no,
                r.question_type,
                r.is_correct ? '正确' : '错误',
                r.time_spent || 0,
                r.mastery_level ? (r.mastery_level * 100).toFixed(1) + '%' : 'N/A',
                r.review_count || 0
            ]);

            return [headers, ...rows]
                .map(row => row.map(cell => `"${cell || ''}"`).join(','))
                .join('\n');
        }

        // 其他类型的CSV转换...
        return JSON.stringify(data);
    }

    /**
     * 生成导出文件名
     */
    generateFileName(userId, exportType, format) {
        const date = new Date().toISOString().split('T')[0];
        return `exam_prep_${userId}_${exportType}_${date}.${format}`;
    }

    /**
     * 记录导出历史
     */
    async recordExportHistory(userId, exportType, format) {
        await this.pool.query(`
            INSERT INTO export_history (user_id, export_type, format, exported_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `, [userId, exportType, format]);
    }

    /**
     * 获取导出历史
     */
    async getExportHistory(userId, limit = 20) {
        const result = await this.pool.query(`
            SELECT export_type, format, exported_at
            FROM export_history
            WHERE user_id = $1
            ORDER BY exported_at DESC
            LIMIT $2
        `, [userId, limit]);

        return result.rows;
    }
}

module.exports = DataExport;
