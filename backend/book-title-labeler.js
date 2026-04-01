/**
 * 基于书名号的文档标注API
 * 从题干中提取《》内的文档名称进行精确匹配标注
 */

const express = require('express');
const { extractDocumentFromQuestion, BOOK_TITLE_MAPPING } = require('./book-title-matcher.js');

module.exports = (pool) => {
  const router = express.Router();

  /**
   * POST /api/v2/documents/label-by-book-title
   * 基于书名号批量标注文档
   */
  router.post('/label-by-book-title', async (req, res) => {
    try {
      console.log('开始基于书名号的文档标注...');

      // 1. 查询所有未标注的题目
      const query = `
        SELECT id, question_text
        FROM questions
        WHERE original_document IS NULL
          AND question_text IS NOT NULL
      `;

      const result = await pool.query(query);
      const questions = result.rows;

      console.log(`找到 ${questions.length} 道未标注题目`);

      // 2. 为每道题目提取文档名
      const updates = [];
      let matchedCount = 0;
      let unmatchedExamples = [];

      for (const question of questions) {
        const documentName = extractDocumentFromQuestion(question.question_text);

        if (documentName) {
          updates.push({
            id: question.id,
            documentName: documentName,
            questionText: question.question_text
          });
          matchedCount++;
        } else {
          // 记录包含书名号但未匹配的题目示例
          if (question.question_text.includes('《') && unmatchedExamples.length < 10) {
            unmatchedExamples.push({
              id: question.id,
              text: question.question_text.substring(0, 100)
            });
          }
        }
      }

      console.log(`成功匹配 ${matchedCount} 道题目`);

      // 3. 批量更新数据库
      let updatedCount = 0;
      const errors = [];

      for (const update of updates) {
        try {
          // 获取文档信息
          const docInfo = getDocumentInfo(update.documentName);
          if (!docInfo) {
            console.warn(`未找到文档信息: ${update.documentName}`);
            continue;
          }

          // 更新数据库
          const updateQuery = `
            UPDATE questions
            SET
              original_document = $1,
              document_category = $2,
              document_priority = $3
            WHERE id = $4
          `;

          await pool.query(updateQuery, [
            update.documentName,
            docInfo.category,
            docInfo.priority,
            update.id
          ]);

          updatedCount++;
        } catch (error) {
          console.error(`更新题目 ${update.id} 失败:`, error.message);
          errors.push({ id: update.id, error: error.message });
        }
      }

      console.log(`成功更新 ${updatedCount} 道题目`);

      // 4. 返回结果
      res.json({
        success: true,
        message: '基于书名号的文档标注完成',
        stats: {
          total_questions: questions.length,
          matched_count: matchedCount,
          updated_count: updatedCount,
          unmatched_count: questions.length - matchedCount,
          errors_count: errors.length
        },
        mapping_table_size: Object.keys(BOOK_TITLE_MAPPING).length,
        unmatched_examples: unmatchedExamples,
        errors: errors.slice(0, 10) // 只返回前10个错误
      });

    } catch (error) {
      console.error('基于书名号标注失败:', error);
      res.status(500).json({
        error: '标注失败',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v2/documents/book-title-stats
   * 查看书名号标注统计
   */
  router.get('/book-title-stats', async (req, res) => {
    try {
      // 统计包含书名号的题目
      const statsQuery = `
        SELECT
          COUNT(*) FILTER (WHERE question_text LIKE '%《%') as with_book_title,
          COUNT(*) FILTER (WHERE original_document IS NOT NULL) as labeled,
          COUNT(*) as total
        FROM questions
      `;

      const result = await pool.query(statsQuery);
      const stats = result.rows[0];

      // 统计各文档的题目数
      const docQuery = `
        SELECT
          original_document,
          document_category,
          document_priority,
          COUNT(*) as question_count
        FROM questions
        WHERE original_document IS NOT NULL
        GROUP BY original_document, document_category, document_priority
        ORDER BY document_priority DESC, question_count DESC
      `;

      const docResult = await pool.query(docQuery);

      res.json({
        overall: {
          total_questions: parseInt(stats.total),
          with_book_title: parseInt(stats.with_book_title),
          labeled: parseInt(stats.labeled),
          unlabeled: parseInt(stats.total) - parseInt(stats.labeled),
          coverage_percentage: stats.total > 0
            ? ((parseInt(stats.labeled) / parseInt(stats.total)) * 100).toFixed(2)
            : 0
        },
        by_document: docResult.rows
      });

    } catch (error) {
      console.error('获取书名号统计失败:', error);
      res.status(500).json({ error: '获取统计失败' });
    }
  });

  /**
   * GET /api/v2/documents/unmatched-examples
   * 查看包含书名号但未匹配的题目示例
   */
  router.get('/unmatched-examples', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;

      const query = `
        SELECT id, question_text
        FROM questions
        WHERE question_text LIKE '%《%'
          AND original_document IS NULL
        ORDER BY RANDOM()
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);

      // 提取书名号内容
      const examples = result.rows.map(q => {
        const matches = q.question_text.match(/《([^》]+)》/g);
        return {
          id: q.id,
          text: q.question_text.substring(0, 150),
          book_titles: matches || []
        };
      });

      res.json({
        count: examples.length,
        examples: examples
      });

    } catch (error) {
      console.error('获取未匹配示例失败:', error);
      res.status(500).json({ error: '获取示例失败' });
    }
  });

  return router;
};

/**
 * 获取文档信息
 */
function getDocumentInfo(documentName) {
  const DOCUMENT_CATEGORIES = require('./document-categories.js');

  if (DOCUMENT_CATEGORIES[documentName]) {
    return {
      category: DOCUMENT_CATEGORIES[documentName].category,
      priority: DOCUMENT_CATEGORIES[documentName].priority
    };
  }

  return null;
}
