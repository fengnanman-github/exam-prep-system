/**
 * 前端日志管理器
 * 提供统一的日志记录接口，支持日志级别和远程上报
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
}

class Logger {
  constructor() {
    // 根据环境设置日志级别
    this.currentLevel = process.env.NODE_ENV === 'production'
      ? LOG_LEVELS.WARN
      : LOG_LEVELS.DEBUG

    // 日志队列，用于批量上报
    this.logQueue = []
    this.maxQueueSize = 50
    this.flushInterval = 30000 // 30秒

    // 启动定时上报
    this.startFlushTimer()
  }

  /**
   * 设置日志级别
   */
  setLevel(level) {
    if (typeof level === 'string') {
      this.currentLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO
    } else {
      this.currentLevel = level
    }
  }

  /**
   * 核心日志方法
   */
  log(level, category, message, data = null) {
    if (level < this.currentLevel) {
      return
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: this.getLevelName(level),
      category,
      message,
      data,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      userId: this.getUserId()
    }

    // 开发环境：输出到控制台
    if (process.env.NODE_ENV !== 'production') {
      this.outputToConsole(logEntry)
    }

    // 添加到队列
    this.logQueue.push(logEntry)

    // 队列满了立即上报
    if (this.logQueue.length >= this.maxQueueSize) {
      this.flush()
    }
  }

  /**
   * 输出到控制台（带样式）
   */
  outputToConsole(logEntry) {
    const styles = {
      DEBUG: 'color: #888',
      INFO: 'color: #2196F3',
      WARN: 'color: #FF9800',
      ERROR: 'color: #F44336; font-weight: bold'
    }

    const style = styles[logEntry.level] || ''
    const prefix = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.category}]`

    console.log(`%c${prefix}`, style, logEntry.message, logEntry.data || '')
  }

  /**
   * 获取级别名称
   */
  getLevelName(level) {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN'
  }

  /**
   * 获取用户ID
   */
  getUserId() {
    try {
      const authStore = window.authStore
      return authStore?.user?.id || 'anonymous'
    } catch {
      return 'anonymous'
    }
  }

  /**
   * 便捷方法
   */
  debug(category, message, data) {
    this.log(LOG_LEVELS.DEBUG, category, message, data)
  }

  info(category, message, data) {
    this.log(LOG_LEVELS.INFO, category, message, data)
  }

  warn(category, message, data) {
    this.log(LOG_LEVELS.WARN, category, message, data)
  }

  error(category, message, data) {
    this.log(LOG_LEVELS.ERROR, category, message, data)
  }

  /**
   * 上报日志到服务器
   */
  async flush() {
    if (this.logQueue.length === 0) {
      return
    }

    const logsToSend = [...this.logQueue]
    this.logQueue = []

    try {
      await fetch('/api/v1/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logs: logsToSend })
      })
    } catch (error) {
      // 上报失败，重新加入队列（但限制大小）
      console.error('日志上报失败:', error)
      this.logQueue = [...logsToSend.slice(-10), ...this.logQueue]
    }
  }

  /**
   * 启动定时上报
   */
  startFlushTimer() {
    setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  /**
   * 页面卸载时上报剩余日志
   */
  flushOnUnload() {
    if (this.logQueue.length > 0) {
      // 使用sendBeacon确保在页面卸载时也能发送
      navigator.sendBeacon('/api/v1/logs', JSON.stringify({ logs: this.logQueue }))
    }
  }
}

// 创建单例
const logger = new Logger()

// 页面卸载时上报
window.addEventListener('beforeunload', () => {
  logger.flushOnUnload()
})

// 捕获全局错误
window.addEventListener('error', (event) => {
  logger.error('GLOBAL', '未捕获的错误', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack
  })
})

// 捕获Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  logger.error('PROMISE', '未处理的Promise拒绝', {
    reason: event.reason,
    promise: event.promise
  })
})

export default logger
