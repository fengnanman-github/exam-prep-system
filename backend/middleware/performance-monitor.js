/**
 * 性能监控中间件
 * 记录API响应时间和性能指标
 */

const EventEmitter = require('events');

class PerformanceMonitor extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            requests: new Map(), // 存储请求统计
            endpoints: new Map(), // 存储端点统计
            slowQueries: [],      // 慢查询记录
            errors: []            // 错误记录
        };
        this.slowQueryThreshold = 1000; // 1秒
        this.errorRetention = 100;      // 保留最近100个错误
    }

    /**
     * Express中间件：监控API性能
     */
    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            const endpoint = `${req.method} ${req.path}`;

            // 响应完成时记录
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                const statusCode = res.statusCode;

                // 记录端点统计
                this.recordEndpoint(endpoint, duration, statusCode);

                // 记录慢查询
                if (duration > this.slowQueryThreshold) {
                    this.recordSlowQuery(endpoint, duration, req.query);
                }

                // 发出性能事件
                this.emit('request', {
                    endpoint,
                    duration,
                    statusCode,
                    timestamp: new Date()
                });

                // 控制台输出
                if (duration > 500) {
                    console.warn(`[PERF] Slow request: ${endpoint} - ${duration}ms`);
                }
            });

            next();
        };
    }

    /**
     * 记录端点统计
     */
    recordEndpoint(endpoint, duration, statusCode) {
        if (!this.metrics.endpoints.has(endpoint)) {
            this.metrics.endpoints.set(endpoint, {
                count: 0,
                totalTime: 0,
                maxTime: 0,
                minTime: Infinity,
                errors: 0,
                lastError: null
            });
        }

        const stats = this.metrics.endpoints.get(endpoint);
        stats.count++;
        stats.totalTime += duration;
        stats.maxTime = Math.max(stats.maxTime, duration);
        stats.minTime = Math.min(stats.minTime, duration);

        if (statusCode >= 400) {
            stats.errors++;
            stats.lastError = {
                statusCode,
                timestamp: new Date()
            };
        }
    }

    /**
     * 记录慢查询
     */
    recordSlowQuery(endpoint, duration, params) {
        this.metrics.slowQueries.push({
            endpoint,
            duration,
            params,
            timestamp: new Date()
        });

        // 只保留最近100条记录
        if (this.metrics.slowQueries.length > 100) {
            this.metrics.slowQueries.shift();
        }

        // 发出慢查询警告
        this.emit('slowQuery', {
            endpoint,
            duration,
            timestamp: new Date()
        });
    }

    /**
     * 记录错误
     */
    recordError(error, context) {
        const errorRecord = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date()
        };

        this.metrics.errors.push(errorRecord);

        // 只保留最近的错误
        if (this.metrics.errors.length > this.errorRetention) {
            this.metrics.errors.shift();
        }

        // 发出错误事件
        this.emit('error', errorRecord);
    }

    /**
     * 获取性能报告
     */
    getReport() {
        const report = {
            summary: this.getSummary(),
            endpoints: this.getEndpointStats(),
            slowQueries: this.metrics.slowQueries.slice(-10),
            recentErrors: this.metrics.errors.slice(-10)
        };

        return report;
    }

    /**
     * 获取汇总统计
     */
    getSummary() {
        let totalRequests = 0;
        let totalErrors = 0;
        let totalDuration = 0;

        for (const [endpoint, stats] of this.metrics.endpoints) {
            totalRequests += stats.count;
            totalErrors += stats.errors;
            totalDuration += stats.totalTime;
        }

        return {
            totalRequests,
            totalErrors,
            errorRate: totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: totalRequests > 0 ? Math.round(totalDuration / totalRequests) + 'ms' : '0ms',
            activeEndpoints: this.metrics.endpoints.size
        };
    }

    /**
     * 获取端点统计
     */
    getEndpointStats() {
        const stats = [];

        for (const [endpoint, data] of this.metrics.endpoints) {
            stats.push({
                endpoint,
                ...data,
                avgTime: Math.round(data.totalTime / data.count) + 'ms'
            });
        }

        // 按平均响应时间排序
        return stats.sort((a, b) => {
            const avgA = parseInt(a.avgTime);
            const avgB = parseInt(b.avgTime);
            return avgB - avgA;
        });
    }

    /**
     * 清除统计数据
     */
    clear() {
        this.metrics.requests.clear();
        this.metrics.endpoints.clear();
        this.metrics.slowQueries = [];
        this.metrics.errors = [];
    }
}

// 全局实例
const instance = new PerformanceMonitor();

module.exports = instance;
