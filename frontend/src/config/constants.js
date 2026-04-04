/**
 * 应用常量定义
 * 用于集中管理应用中使用的魔法数字和常量
 */

/**
 * API超时时间（毫秒）
 */
export const API_TIMEOUT = {
  SHORT: 5000,    // 5秒 - 一般API请求
  MEDIUM: 10000,  // 10秒 - 数据加载请求
  LONG: 30000     // 30秒 - 复杂查询请求
}

/**
 * 练习相关常量
 */
export const PRACTICE = {
  DEFAULT_LIMIT: 20,      // 默认每次练习题目数
  MAX_LIMIT: 100,         // 最大题目数
  CATEGORY_LIMIT: 1000    // 类别练习最大题目数
}

/**
 * 分页相关常量
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,  // 默认每页条数
  MAX_PAGE_SIZE: 100      // 最大每页条数
}

/**
 * 难度级别
 */
export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
}

/**
 * 题目类型
 */
export const QUESTION_TYPES = {
  JUDGMENT: '判断题',
  SINGLE_CHOICE: '单项选择题',
  MULTIPLE_CHOICE: '多项选择题'
}

/**
 * 本地存储键名
 */
export const STORAGE_KEYS = {
  DOCUMENT_PRACTICE_QUESTIONS: 'documentPracticeQuestions',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme'
}

/**
 * 错误消息
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  SERVER_ERROR: '服务器错误，请稍后重试',
  UNAUTHORIZED: '登录已过期，请重新登录',
  NOT_FOUND: '请求的资源不存在',
  TIMEOUT: '请求超时，请重试',
  UNKNOWN: '未知错误，请重试'
}
