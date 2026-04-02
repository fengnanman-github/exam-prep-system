/**
 * 错误追踪中间件
 * 统一错误处理和追踪
 */

const performanceMonitor = require('./performance-monitor');

class ErrorTracker {
    constructor() {
        this.errors = [];
        this.errorCounts = new Map();
        this.maxRetention = 1000;
    }

    /**
     * Express错误处理中间件
     */
    middleware() {
        return (err, req, res, next) => {
            // 记录错误
            this.trackError(err, {
                endpoint: `${req.method} ${req.path}`,
                query: req.query,
                body: req.body,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            // 记录到性能监控器
            performanceMonitor.recordError(err, {
                endpoint: `${req.method} ${req.path}`
            });

            // 返回错误响应
            const statusCode = err.statusCode || err.status || 500;
            const isDevelopment = process.env.NODE_ENV === 'development';

            res.status(statusCode).json({
                error: err.message || '服务器内部错误',
                ...(isDevelopment && { stack: err.stack }),
                timestamp: new Date().toISOString()
            });

            // 记录到控制台
            console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
        };
    }

    /**
     * 追踪错误
     */
    trackError(error, context) {
        const errorRecord = {
            id: this.generateErrorId(),
            message: error.message,
            stack: error.stack,
            code: error.code,
            statusCode: error.statusCode || error.status,
            context,
            timestamp: new Date()
        };

        // 保存错误记录
        this.errors.push(errorRecord);

        // 限制保留数量
        if (this.errors.length > this.maxRetention) {
            this.errors.shift();
        }

        // 统计错误类型
        const errorKey = error.message || 'unknown';
        const count = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, count + 1);

        return errorRecord;
    }

    /**
     * 获取错误统计
     */
    getStats() {
        return {
            totalErrors: this.errors.length,
            uniqueErrors: this.errorCounts.size,
            topErrors: this.getTopErrors(10),
            recentErrors: this.getRecentErrors(20)
        };
    }

    /**
     * 获取最常见的错误
     */
    getTopErrors(limit = 10) {
        const sorted = Array.from(this.errorCounts.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit);

        return sorted.map(([message, count]) => ({ message, count }));
    }

    /**
     * 获取最近的错误
     */
    getRecentErrors(limit = 20) {
        return this.errors.slice(-limit).reverse();
    }

    /**
     * 生成错误ID
     */
    generateErrorId() {
        return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 清除错误记录
     */
    clear() {
        this.errors = [];
        this.errorCounts.clear();
    }
}

// 全局实例
const instance = new ErrorTracker();

module.exports = instance;
