/**
 * 测试环境配置
 */

module.exports = {
  // 测试数据库配置
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 15433,
    database: process.env.TEST_DB_NAME || 'exam_db_test',
    user: process.env.TEST_DB_USER || 'exam_user',
    password: process.env.TEST_DB_PASSWORD || 'exam_pass123'
  },

  // 测试API配置
  api: {
    baseURL: process.env.TEST_API_URL || 'http://localhost:13001',
    timeout: 10000
  },

  // 测试用户
  testUsers: {
    user1: 'test_user_1',
    user2: 'test_user_2',
    admin: 'admin_test'
  },

  // 性能阈值
  performance: {
    maxQueryTime: 100, // 统一状态查询最大100ms
    maxSubmitTime: 50, // 练习提交最大50ms
    maxStatsLoadTime: 200 // 统计数据加载最大200ms
  }
};
