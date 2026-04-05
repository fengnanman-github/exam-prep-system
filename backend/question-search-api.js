/**
 * 题目搜索API
 * 支持按文件名搜索题目（在题干中查找包含该文件名的题目）
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'exam_db',
  user: process.env.DB_USER || 'exam_user',
  password: process.env.DB_PASSWORD || 'exam_password'
});

/**
 * GET /api/questions/search
 * 搜索题干包含指定文件名的题目
 * 查询参数：
 *   - filename: 文件名（必填）
 *   - limit: 返回结果数量限制（可选，默认100）
 *
 * 返回：
 *   - 题目列表，包含题号、题干等信息
 */
router.get('/search', async (req, res) => {
  try {
    const { filename, limit = 100 } = req.query;

    if (!filename || filename.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供文件名'
      });
    }

    // 清理和验证输入
    const searchTerm = filename.trim();
    const resultLimit = Math.min(parseInt(limit) || 100, 500); // 最多返回500条

    // 搜索题干包含文件名的题目
    // 使用 ILIKE 进行不区分大小写的模糊匹配
    const query = `
      SELECT
        q.id,
        q.question_no,
        q.question_text,
        q.question_type,
        q.category,
        q.exam_category,
        q.law_category,
        q.tech_category,
        q.difficulty,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer,
        q.explanation
      FROM questions q
      WHERE q.question_text ILIKE $1
      ORDER BY q.question_no::int
      LIMIT $2
    `;

    const values = [`%${searchTerm}%`, resultLimit];

    const result = await pool.query(query, values);

    // 统计信息
    const stats = {
      total: result.rows.length,
      search_term: searchTerm,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: result.rows,
      stats: stats
    });

  } catch (error) {
    console.error('搜索题目失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索题目失败',
      error: error.message
    });
  }
});

/**
 * GET /api/questions/search/by-document
 * 按文档名称搜索题目
 * 查询参数：
 *   - document: 文档名称（必填）
 *   - exact: 是否精确匹配（可选，默认false）
 *   - limit: 返回结果数量限制（可选，默认100）
 */
router.get('/search/by-document', async (req, res) => {
  try {
    const { document, exact = false, limit = 100 } = req.query;

    if (!document || document.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供文档名称'
      });
    }

    const searchTerm = document.trim();
    const resultLimit = Math.min(parseInt(limit) || 100, 500);
    const useExact = exact === 'true' || exact === true;

    let query, values;

    if (useExact) {
      // 精确匹配文档名称
      query = `
        SELECT
          q.id,
          q.question_no,
          q.question_text,
          q.question_type,
          q.category,
          q.exam_category,
          q.law_category,
          q.tech_category,
          q.difficulty,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_answer,
          q.explanation
        FROM questions q
        WHERE q.question_text ILIKE $1
        ORDER BY q.question_no::int
        LIMIT $2
      `;
      // 精确匹配：文件名前后有边界（使用正则表达式模式）
      values = [`%《${searchTerm}》%`, resultLimit];
    } else {
      // 模糊匹配
      query = `
        SELECT
          q.id,
          q.question_no,
          q.question_text,
          q.question_type,
          q.category,
          q.exam_category,
          q.law_category,
          q.tech_category,
          q.difficulty,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_answer,
          q.explanation
        FROM questions q
        WHERE q.question_text ILIKE $1
        ORDER BY q.question_no::int
        LIMIT $2
      `;
      values = [`%${searchTerm}%`, resultLimit];
    }

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: result.rows,
      stats: {
        total: result.rows.length,
        search_term: searchTerm,
        exact_match: useExact,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('按文档搜索题目失败:', error);
    res.status(500).json({
      success: false,
      message: '按文档搜索题目失败',
      error: error.message
    });
  }
});

module.exports = router;
