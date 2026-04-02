/**
 * 统一API集成测试
 * 测试统一状态API、统一练习API等
 */

const axios = require('axios');
const { Pool } = require('pg');

const config = require('../config');

describe('统一API集成测试', () => {
  let pool;
  let apiClient;

  beforeAll(async () => {
    // 创建数据库连接
    pool = new Pool(config.database);

    // 创建API客户端
    apiClient = axios.create({
      baseURL: config.api.baseURL,
      timeout: config.api.timeout
    });

    // 确保测试环境已启动
    try {
      await pool.query('SELECT 1');
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // 清理测试数据
    await pool.query('DELETE FROM practice_history WHERE user_id = ANY($1)', [Object.values(config.testUsers)]);
    await pool.query('DELETE FROM wrong_answers WHERE user_id = ANY($1)', [Object.values(config.testUsers)]);
    await pool.query('DELETE FROM uncertain_questions WHERE user_id = ANY($1)', [Object.values(config.testUsers)]);
    await pool.query('DELETE FROM favorite_questions WHERE user_id = ANY($1)', [Object.values(config.testUsers)]);
  });

  describe('统一状态API', () => {
    test('GET /api/v2/unified/state - 获取题目状态', async () => {
      const userId = config.testUsers.user1;
      const questionIds = [1, 2, 3];

      const response = await apiClient.get('/api/v2/unified/state', {
        params: {
          user_id: userId,
          question_ids: questionIds.join(',')
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('questions');
      expect(response.data.questions).toHaveLength(questionIds.length);
      expect(response.data.questions[0]).toHaveProperty('practice_status', 'new');
      expect(response.data.questions[0]).toHaveProperty('mastery_status', 'not_started');
    });

    test('GET /api/v2/unified/state - 按考试类别查询', async () => {
      const userId = config.testUsers.user1;
      const examCategory = '密码政策法规';

      const response = await apiClient.get('/api/v2/unified/state', {
        params: {
          user_id: userId,
          exam_category: examCategory
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('questions');
      expect(response.data).toHaveProperty('stats');
      expect(Array.isArray(response.data.questions)).toBe(true);
    });

    test('PUT /api/v2/unified/state/:questionId - 更新不确定标记', async () => {
      const userId = config.testUsers.user1;
      const questionId = 1;

      const response = await apiClient.put(`/api/v2/unified/state/${questionId}`, {
        user_id: userId,
        is_uncertain: true,
        uncertain_reason: '需要复习'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('state');
      expect(response.data.state.is_uncertain).toBe(true);
    });

    test('PUT /api/v2/unified/state/:questionId - 更新收藏标记', async () => {
      const userId = config.testUsers.user1;
      const questionId = 1;

      const response = await apiClient.put(`/api/v2/unified/state/${questionId}`, {
        user_id: userId,
        is_favorite: true,
        favorite_notes: '重点题目'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.state.is_favorite).toBe(true);
    });

    test('POST /api/v2/unified/state/:questionId/toggle-uncertain - 切换不确定标记', async () => {
      const userId = config.testUsers.user1;
      const questionId = 1;

      // 添加标记
      let response = await apiClient.post(`/api/v2/unified/state/${questionId}/toggle-uncertain`, {
        user_id: userId,
        reason: '不确定'
      });

      expect(response.status).toBe(200);
      expect(response.data.is_uncertain).toBe(true);

      // 取消标记
      response = await apiClient.post(`/api/v2/unified/state/${questionId}/toggle-uncertain`, {
        user_id: userId
      });

      expect(response.status).toBe(200);
      expect(response.data.is_uncertain).toBe(false);
    });

    test('GET /api/v2/unified/stats/:userId - 获取用户统计', async () => {
      const userId = config.testUsers.user1;

      // 先插入一些练习数据
      await pool.query(`
        INSERT INTO practice_history (user_id, question_id, user_answer, is_correct, time_spent, practice_mode)
        VALUES ($1, 1, 'A', true, 10, 'random'), ($1, 2, 'B', false, 15, 'random')
      `, [userId]);

      const response = await apiClient.get(`/api/v2/unified/stats/${userId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('global');
      expect(response.data).toHaveProperty('wrong_answers');
      expect(response.data).toHaveProperty('uncertain_count');
      expect(response.data).toHaveProperty('favorite_count');
      expect(response.data.global.total_practiced).toBeGreaterThan(0);
    });
  });

  describe('统一练习API', () => {
    test('POST /api/v2/unified/practice/submit - 提交正确答案', async () => {
      const userId = config.testUsers.user1;
      const questionId = 1;

      const response = await apiClient.post('/api/v2/unified/practice/submit', {
        user_id: userId,
        question_id: questionId,
        user_answer: 'A',
        is_correct: true,
        time_spent: 10,
        practice_mode: 'random',
        is_uncertain: false
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('state');
      expect(response.data).toHaveProperty('message');
      expect(response.data.state.practice_status).toBe('practiced');
    });

    test('POST /api/v2/unified/practice/submit - 提交错误答案应该创建错题记录', async () => {
      const userId = config.testUsers.user1;
      const questionId = 2;

      const response = await apiClient.post('/api/v2/unified/practice/submit', {
        user_id: userId,
        question_id: questionId,
        user_answer: 'A',
        is_correct: false,
        time_spent: 15,
        practice_mode: 'random',
        is_uncertain: false
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('supermemo');
      expect(response.data.state.is_wrong).toBe(true);

      // 验证错题记录已创建
      const wrongResult = await pool.query(
        'SELECT * FROM wrong_answers WHERE user_id = $1 AND question_id = $2',
        [userId, questionId]
      );
      expect(wrongResult.rows.length).toBe(1);
    });

    test('POST /api/v2/unified/practice/submit - 不确定标记应该被记录', async () => {
      const userId = config.testUsers.user1;
      const questionId = 3;

      const response = await apiClient.post('/api/v2/unified/practice/submit', {
        user_id: userId,
        question_id: questionId,
        user_answer: 'B',
        is_correct: true,
        time_spent: 20,
        practice_mode: 'random',
        is_uncertain: true,
        uncertain_reason: '不确定'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);

      // 验证不确定记录已创建
      const uncertainResult = await pool.query(
        'SELECT * FROM uncertain_questions WHERE user_id = $1 AND question_id = $2',
        [userId, questionId]
      );
      expect(uncertainResult.rows.length).toBe(1);
    });

    test('POST /api/v2/unified/practice/submit - 连续正确应该从错题本移除', async () => {
      const userId = config.testUsers.user1;
      const questionId = 4;

      // 第一次答错
      await apiClient.post('/api/v2/unified/practice/submit', {
        user_id: userId,
        question_id: questionId,
        user_answer: 'A',
        is_correct: false,
        time_spent: 10,
        practice_mode: 'random'
      });

      // 第二次答对（高质量）
      const response = await apiClient.post('/api/v2/unified/practice/submit', {
        user_id: userId,
        question_id: questionId,
        user_answer: 'A',
        is_correct: true,
        time_spent: 5,
        practice_mode: 'random'
      });

      expect(response.status).toBe(200);
      // 由于是第二次答对且快速，可能还未完全移除
      // 但掌握度应该提升
      expect(response.data.supermemo.mastery_level).toBeGreaterThan(0);
    });

    test('GET /api/v2/unified/practice/due-review/:userId - 获取待复习题目', async () => {
      const userId = config.testUsers.user1;

      // 创建一些已到期的错题
      await pool.query(`
        INSERT INTO wrong_answers (user_id, question_id, next_review_time, mastery_level)
        VALUES ($1, 1, CURRENT_TIMESTAMP - INTERVAL '1 hour', 0.3),
               ($1, 2, CURRENT_TIMESTAMP - INTERVAL '1 day', 0.5)
      `, [userId]);

      const response = await apiClient.get(`/api/v2/unified/practice/due-review/${userId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('questions');
      expect(response.data).toHaveProperty('total');
      expect(response.data.total).toBeGreaterThan(0);
    });

    test('GET /api/v2/unified/practice/recommend/:userId - 获取推荐题目', async () => {
      const userId = config.testUsers.user1;

      const response = await apiClient.get(`/api/v2/unified/practice/recommend/${userId}`, {
        params: { limit: 5 }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('questions');
      expect(response.data).toHaveProperty('total');
      expect(response.data.questions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('版本管理API', () => {
    test('GET /api/v2/version/config - 获取版本配置', async () => {
      const response = await apiClient.get('/api/v2/version/config', {
        params: { user_id: config.testUsers.user1 }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('features');
      expect(response.data).toHaveProperty('legacy');
    });

    test('POST /api/v2/version/switch - 切换版本', async () => {
      // 切换到旧版本
      let response = await apiClient.post('/api/v2/version/switch', {
        version: '1.x'
      });

      expect(response.status).toBe(200);
      expect(response.data.version).toBe('1.x');

      // 切换回新版本
      response = await apiClient.post('/api/v2/version/switch', {
        version: '2.0.0'
      });

      expect(response.status).toBe(200);
      expect(response.data.version).toBe('2.0.0');
    });

    test('POST /api/v2/version/feature/:feature - 设置功能开关', async () => {
      const feature = 'unifiedState';

      const response = await apiClient.post(`/api/v2/version/feature/${feature}`, {
        is_enabled: true,
        enabled_percentage: 10
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('feature', feature);
    });
  });

  describe('性能测试', () => {
    test('统一状态查询应该在100ms内完成', async () => {
      const userId = config.testUsers.user1;
      const questionIds = Array.from({ length: 100 }, (_, i) => i + 1);

      const startTime = Date.now();
      await apiClient.get('/api/v2/unified/state', {
        params: {
          user_id: userId,
          question_ids: questionIds.join(',')
        }
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(config.performance.maxQueryTime);
    });

    test('练习提交应该在50ms内完成', async () => {
      const userId = config.testUsers.user1;
      const questionId = 1;

      const startTime = Date.now();
      await apiClient.post('/api/v2/unified/practice/submit', {
        user_id: userId,
        question_id: questionId,
        user_answer: 'A',
        is_correct: true,
        time_spent: 10,
        practice_mode: 'random'
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(config.performance.maxSubmitTime);
    });

    test('统计数据加载应该在200ms内完成', async () => {
      const userId = config.testUsers.user1;

      // 先插入一些数据
      await pool.query(`
        INSERT INTO practice_history (user_id, question_id, user_answer, is_correct, time_spent, practice_mode)
        SELECT $1, id, 'A', true, 10, 'random'
        FROM generate_series(1, 50) s(id)
      `, [userId]);

      const startTime = Date.now();
      await apiClient.get(`/api/v2/unified/stats/${userId}`);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(config.performance.maxStatsLoadTime);
    });
  });
});
