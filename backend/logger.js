/**
 * 后端日志管理器
 * 提供统一的日志记录接口，支持文件、数据库和远程日志服务
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor() {
    this.currentLevel = process.env.LOG_LEVEL
      ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()]
      : (process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG);

    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();

    // 日志文件路径
    this.logFiles = {
      error: path.join(this.logDir, 'error.log'),
      combined: path.join(this.logDir, 'combined.log'),
      api: path.join(this.logDir, 'api.log'),
      database: path.join(this.logDir, 'database.log')
    };

    // 日志轮转配置
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxFiles = 5;
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 核心日志方法
   */
  log(level, category, message, meta = {}) {
    if (level < this.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = this.getLevelName(level);
    const logEntry = {
      timestamp,
      level: levelName,
      category,
      message,
      ...meta,
      pid: process.pid,
      hostname: require('os').hostname()
    };

    const logLine = JSON.stringify(logEntry);

    // 输出到控制台（开发环境）
    if (process.env.NODE_ENV !== 'production') {
      this.outputToConsole(logEntry);
    }

    // 写入文件
    this.writeToFile(logLine, level);

    // ERROR级别同时写入错误日志文件
    if (level === LOG_LEVELS.ERROR) {
      this.writeToLogFile(logLine, this.logFiles.error);
    }
  }

  /**
   * 输出到控制台（带颜色）
   */
  outputToConsole(logEntry) {
    const colors = {
      DEBUG: '\x1b[36m', // 青色
      INFO: '\x1b[32m',  // 绿色
      WARN: '\x1b[33m',  // 黄色
      ERROR: '\x1b[31m', // 红色
      RESET: '\x1b[0m'
    };

    const color = colors[logEntry.level] || '';
    const reset = colors.RESET;
    const prefix = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.category}]`;

    console.log(`${color}${prefix}${reset}`, logEntry.message);
    if (Object.keys(logEntry).length > 4) {
      console.log(logEntry);
    }
  }

  /**
   * 获取级别名称
   */
  getLevelName(level) {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
  }

  /**
   * 写入文件
   */
  writeToFile(logLine, level) {
    try {
      // 根据类别选择文件
      let targetFile = this.logFiles.combined;

      if (level === LOG_LEVELS.ERROR) {
        targetFile = this.logFiles.error;
      } else if (logEntry.category) {
        if (logEntry.category.startsWith('API')) {
          targetFile = this.logFiles.api;
        } else if (logEntry.category.startsWith('DB')) {
          targetFile = this.logFiles.database;
        }
      }

      this.writeToLogFile(logLine + '\n', targetFile);
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  /**
   * 写入日志文件（带轮转）
   */
  writeToLogFile(logLine, filePath) {
    try {
      // 检查文件大小，如果超过限制则轮转
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size >= this.maxFileSize) {
          this.rotateLogFile(filePath);
        }
      }

      // 追加写入
      fs.appendFileSync(filePath, logLine, 'utf8');
    } catch (error) {
      console.error('写入日志失败:', error);
    }
  }

  /**
   * 日志文件轮转
   */
  rotateLogFile(filePath) {
    try {
      const ext = path.extname(filePath);
      const basename = path.basename(filePath, ext);
      const dirname = path.dirname(filePath);

      // 删除最老的日志文件
      const oldestFile = path.join(dirname, `${basename}.${this.maxFiles}${ext}`);
      if (fs.existsSync(oldestFile)) {
        fs.unlinkSync(oldestFile);
      }

      // 重命名现有日志文件
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = i === 1
          ? filePath
          : path.join(dirname, `${basename}.${i}${ext}`);
        const newFile = path.join(dirname, `${basename}.${i + 1}${ext}`);

        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }
    } catch (error) {
      console.error('日志轮转失败:', error);
    }
  }

  /**
   * 便捷方法
   */
  debug(category, message, meta) {
    this.log(LOG_LEVELS.DEBUG, category, message, meta);
  }

  info(category, message, meta) {
    this.log(LOG_LEVELS.INFO, category, message, meta);
  }

  warn(category, message, meta) {
    this.log(LOG_LEVELS.WARN, category, message, meta);
  }

  error(category, message, meta) {
    this.log(LOG_LEVELS.ERROR, category, message, meta);
  }

  /**
   * API请求日志
   */
  logRequest(req, res, next) {
    const startTime = Date.now();

    // 记录请求开始
    this.info('API', '请求开始', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userId: req.user_id || req.headers['x-user-id']
    });

    // 响应完成后记录
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 500 ? LOG_LEVELS.ERROR :
                    res.statusCode >= 400 ? LOG_LEVELS.WARN :
                    LOG_LEVELS.INFO;

      this.log(level, 'API', '请求完成', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userId: req.user_id || req.headers['x-user-id']
      });
    });

    next();
  }

  /**
   * 数据库操作日志
   */
  logDatabase(query, params, duration, error = null) {
    const level = error ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;
    const message = error ? '数据库操作失败' : '数据库操作完成';

    this.log(level, 'DB', message, {
      query: query.replace(/\s+/g, ' ').substring(0, 200),
      params: params ? JSON.stringify(params).substring(0, 200) : null,
      duration: `${duration}ms`,
      error: error ? error.message : null
    });
  }

  /**
   * 业务操作日志
   */
  logBusiness(action, entity, data) {
    this.info('BUSINESS', `业务操作: ${action}`, {
      action,
      entity,
      ...data
    });
  }
}

// 创建单例
const logger = new Logger();

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  logger.error('GLOBAL', '未捕获的异常', {
    error: error.message,
    stack: error.stack
  });
  // 给服务器时间记录日志
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('PROMISE', '未处理的Promise拒绝', {
    reason: reason,
    promise: promise.toString()
  });
});

module.exports = logger;
