/**
 * 自动标注题目考试分类
 * 根据文档名称、题目内容等信息自动标注考试分类
 */

const { Pool } = require('pg');
const { EXAM_CATEGORIES, inferExamCategoryFromQuestion } = require('./exam-config.js');

// 数据库连接
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'exam_db',
    user: process.env.DB_USER || 'exam_user',
    password: process.env.DB_PASSWORD || 'change_this_password'
});

/**
 * 为所有题目标注考试分类
 */
async function labelExamCategories() {
    try {
        console.log('📋 开始标注题目考试分类...\n');

        // 1. 添加 exam_category 字段（如果不存在）
        await pool.query(`
            ALTER TABLE questions
            ADD COLUMN IF NOT EXISTS exam_category VARCHAR(100)
        `);
        console.log('✅ exam_category 字段已添加\n');

        // 2. 为 exam_category 创建索引
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_questions_exam_category
            ON questions(exam_category)
        `);
        console.log('✅ exam_category 索引已创建\n');

        // 3. 获取所有未标注考试分类的题目
        const result = await pool.query(`
            SELECT id, question_text, original_document, law_category, tech_category
            FROM questions
            WHERE exam_category IS NULL
        `);

        const questions = result.rows;
        console.log(`📝 找到 ${questions.length} 道未标注的题目\n`);

        // 4. 统计各分类的标注数量
        const stats = {};
        for (const cat of Object.keys(EXAM_CATEGORIES)) {
            stats[cat] = 0;
        }

        // 5. 为每道题目推断考试分类
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

        // 6. 显示统计结果
        console.log('📊 标注完成！统计结果：\n');
        console.log('┌─────────────────────────────────────┬──────────┬────────┐');
        console.log('│ 考核内容                            │ 题目数   │ 占比   │');
        console.log('├─────────────────────────────────────┼──────────┼────────┤');

        for (const [category, config] of Object.entries(EXAM_CATEGORIES)) {
            const count = stats[category] || 0;
            const percentage = questions.length > 0
                ? ((count / questions.length) * 100).toFixed(1)
                : '0.0';
            console.log(`│ ${category.padEnd(35)} │ ${count.toString().padStart(8)} │ ${percentage.padStart(6)}% │`);
        }

        console.log('├─────────────────────────────────────┼──────────┼────────┤');
        console.log(`│ ${'总计'.padEnd(35)} │ ${questions.length.toString().padStart(8)} │ 100.0% │`);
        console.log('└─────────────────────────────────────┴──────────┴────────┘\n');

        // 7. 显示题型分布
        const typeResult = await pool.query(`
            SELECT
                q.question_type,
                ec.exam_category,
                COUNT(*) as count
            FROM questions q
            JOIN (
                SELECT DISTINCT question_id, exam_category
                FROM (
                    SELECT id as question_id, exam_category
                    FROM questions
                    WHERE exam_category IS NOT NULL
                ) subq
            ) ec ON q.id = ec.question_id
            GROUP BY q.question_type, ec.exam_category
            ORDER BY ec.exam_category, q.question_type
        `);

        console.log('📊 题型分布：\n');
        console.log('┌─────────────────────────────────────┬──────────┬──────────┬──────────┐');
        console.log('│ 考核内容                            │ 单选题   │ 多选题   │ 判断题   │');
        console.log('├─────────────────────────────────────┼──────────┼──────────┼──────────┤');

        const typeStats = {};
        for (const cat of Object.keys(EXAM_CATEGORIES)) {
            typeStats[cat] = { '单项选择题': 0, '多项选择题': 0, '判断题': 0 };
        }

        for (const row of typeResult.rows) {
            if (typeStats[row.exam_category]) {
                typeStats[row.exam_category][row.question_type] = parseInt(row.count);
            }
        }

        for (const [category, counts] of Object.entries(typeStats)) {
            console.log(`│ ${category.padEnd(35)} │ ${counts['单项选择题'].toString().padStart(8)} │ ${counts['多项选择题'].toString().padStart(8)} │ ${counts['判断题'].toString().padStart(8)} │`);
        }

        console.log('└─────────────────────────────────────┴──────────┴──────────┴──────────┘\n');

        console.log('✅ 标注完成！\n');

    } catch (error) {
        console.error('❌ 标注失败:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

/**
 * 根据文档名称标注考试分类
 */
async function labelByDocument() {
    try {
        console.log('📋 根据文档名称标注考试分类...\n');

        const result = await pool.query(`
            SELECT DISTINCT original_document
            FROM questions
            WHERE original_document IS NOT NULL
            AND exam_category IS NULL
        `);

        console.log(`找到 ${result.rows.length} 个未标注的文档\n`);

        const { mapDocumentToExamCategory } = require('./exam-config.js');

        for (const row of result.rows) {
            const category = mapDocumentToExamCategory(row.original_document);

            if (category) {
                await pool.query(`
                    UPDATE questions
                    SET exam_category = $1
                    WHERE original_document = $2
                `, [category, row.original_document]);

                console.log(`✓ ${row.original_document.substring(0, 40).padEnd(40)} → ${category}`);
            }
        }

        console.log('\n✅ 标注完成！\n');

    } catch (error) {
        console.error('❌ 标注失败:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// 运行标注
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--by-document')) {
        labelByDocument();
    } else {
        labelExamCategories();
    }
}

module.exports = { labelExamCategories, labelByDocument };
