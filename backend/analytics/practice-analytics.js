/**
 * 练习行为分析
 * 记录和分析用户练习行为
 */

class PracticeAnalytics {
    constructor(pool) {
        this.pool = pool;
        this.events = [];
        this.maxRetention = 10000;
    }

    /**
     * 记录练习模式切换
     */
    async recordModeSwitch(userId, fromMode, toMode) {
        const event = {
            type: 'mode_switch',
            userId,
            from: fromMode,
            to: toMode,
            timestamp: new Date()
        };

        this.events.push(event);
        await this.persistEvent(event);

        return event;
    }

    /**
     * 记录功能使用
     */
    async recordFeatureUsage(userId, feature, details = {}) {
        const event = {
            type: 'feature_usage',
            userId,
            feature,
            details,
            timestamp: new Date()
        };

        this.events.push(event);
        await this.persistEvent(event);

        return event;
    }

    /**
     * 记录练习会话
     */
    async recordPracticeSession(userId, sessionData) {
        const event = {
            type: 'practice_session',
            userId,
            data: {
                mode: sessionData.mode,
                duration: sessionData.duration,
                questionsCount: sessionData.questionsCount,
                correctCount: sessionData.correctCount,
                wrongCount: sessionData.wrongCount
            },
            timestamp: new Date()
        };

        this.events.push(event);
        await this.persistEvent(event);

        return event;
    }

    /**
     * 记录版本切换
     */
    async recordVersionSwitch(userId, fromVersion, toVersion) {
        const event = {
            type: 'version_switch',
            userId,
            from: fromVersion,
            to: toVersion,
            timestamp: new Date()
        };

        this.events.push(event);
        await this.persistEvent(event);

        return event;
    }

    /**
     * 持久化事件到数据库
     */
    async persistEvent(event) {
        try {
            // 这里可以将事件保存到数据库的分析表中
            // 目前先只在内存中保存
            if (this.events.length > this.maxRetention) {
                this.events.shift();
            }
        } catch (error) {
            console.error('持久化分析事件失败:', error);
        }
    }

    /**
     * 获取用户行为统计
     */
    async getUserStats(userId, timeRange = '7d') {
        // 从内存中获取用户事件
        const userEvents = this.events.filter(e => e.userId === userId);

        const stats = {
            modeSwitches: userEvents.filter(e => e.type === 'mode_switch').length,
            featureUsage: {},
            practiceSessions: userEvents.filter(e => e.type === 'practice_session'),
            totalPracticeTime: 0,
            totalQuestions: 0
        };

        // 统计功能使用
        userEvents.filter(e => e.type === 'feature_usage').forEach(e => {
            stats.featureUsage[e.feature] = (stats.featureUsage[e.feature] || 0) + 1;
        });

        // 统计练习时间
        stats.practiceSessions.forEach(session => {
            stats.totalPracticeTime += session.data.duration || 0;
            stats.totalQuestions += session.data.questionsCount || 0;
        });

        return stats;
    }

    /**
     * 获取系统行为统计
     */
    async getSystemStats() {
        const stats = {
            totalEvents: this.events.length,
            eventTypes: {},
            activeUsers: new Set(),
            featureUsage: {},
            modeUsage: {}
        };

        this.events.forEach(event => {
            // 统计事件类型
            stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;

            // 统计活跃用户
            if (event.userId) {
                stats.activeUsers.add(event.userId);
            }

            // 统计功能使用
            if (event.type === 'feature_usage') {
                stats.featureUsage[event.feature] = (stats.featureUsage[event.feature] || 0) + 1;
            }

            // 统计模式使用
            if (event.type === 'practice_session') {
                stats.modeUsage[event.data.mode] = (stats.modeUsage[event.data.mode] || 0) + 1;
            }
        });

        stats.activeUsers = stats.activeUsers.size;

        return stats;
    }

    /**
     * 获取最近的事件
     */
    getRecentEvents(limit = 50) {
        return this.events.slice(-limit).reverse();
    }

    /**
     * 清除事件记录
     */
    clear() {
        this.events = [];
    }
}

module.exports = PracticeAnalytics;
