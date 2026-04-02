/**
 * 学习提醒系统
 * 基于遗忘曲线和学习习惯发送学习提醒
 */

class StudyReminder {
    constructor(pool) {
        this.pool = pool;
        this.reminderTypes = {
            review_due: {
                name: '复习提醒',
                description: '提醒复习即将到期的题目',
                priority: 'high'
            },
            daily_goal: {
                name: '每日目标',
                description: '提醒完成每日学习目标',
                priority: 'medium'
            },
            streak_reminder: {
                name: '连续学习提醒',
                description: '提醒保持学习连续性',
                priority: 'low'
            },
            new_content: {
                name: '新内容提醒',
                description: '提醒学习新的知识点',
                priority: 'low'
            }
        };
    }

    /**
     * 检查并创建提醒
     */
    async checkAndCreateReminders(userId) {
        const reminders = [];

        // 1. 检查复习提醒
        const reviewReminders = await this.checkReviewReminders(userId);
        reminders.push(...reviewReminders);

        // 2. 检查每日目标
        const dailyGoalReminder = await this.checkDailyGoal(userId);
        if (dailyGoalReminder) {
            reminders.push(dailyGoalReminder);
        }

        // 3. 检查连续学习
        const streakReminder = await this.checkStreak(userId);
        if (streakReminder) {
            reminders.push(streakReminder);
        }

        // 4. 检查新内容
        const newContentReminder = await this.checkNewContent(userId);
        if (newContentReminder) {
            reminders.push(newContentReminder);
        }

        return reminders;
    }

    /**
     * 检查复习提醒
     */
    async checkReviewReminders(userId) {
        const result = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM practice_history ph
            JOIN supermemo_data sm ON sm.question_id = ph.question_id AND sm.user_id = ph.user_id
            WHERE ph.user_id = $1
              AND sm.next_review_time <= NOW() + INTERVAL '1 day'
              AND sm.next_review_time > NOW()
        `, [userId]);

        const dueCount = parseInt(result.rows[0].count);

        if (dueCount > 0) {
            return [{
                type: 'review_due',
                title: '复习提醒',
                message: `您有 ${dueCount} 道题目需要在明天之前复习`,
                action: 'review',
                priority: 'high',
                dueCount
            }];
        }

        return [];
    }

    /**
     * 检查每日目标
     */
    async checkDailyGoal(userId) {
        const today = new Date().toISOString().split('T')[0];
        const result = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM practice_history
            WHERE user_id = $1
              AND DATE(practiced_at) = $2
        `, [userId, today]);

        const todayCount = parseInt(result.rows[0].count);
        const dailyGoal = 20; // 每日目标20题

        if (todayCount < dailyGoal) {
            return {
                type: 'daily_goal',
                title: '每日目标提醒',
                message: `今日已练习 ${todayCount}/${dailyGoal} 题，加油！`,
                action: 'practice',
                priority: 'medium',
                progress: todayCount,
                goal: dailyGoal
            };
        }

        return null;
    }

    /**
     * 检查连续学习
     */
    async checkStreak(userId) {
        const result = await this.pool.query(`
            SELECT practiced_at
            FROM practice_history
            WHERE user_id = $1
            ORDER BY practiced_at DESC
            LIMIT 1
        `, [userId]);

        if (result.rows.length === 0) {
            return {
                type: 'streak_reminder',
                title: '开始学习',
                message: '还没有开始学习，今天就来试试吧！',
                action: 'practice',
                priority: 'low'
            };
        }

        const lastPractice = new Date(result.rows[0].practiced_at);
        const daysSinceLastPractice = Math.floor((Date.now() - lastPractice.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceLastPractice >= 2) {
            return {
                type: 'streak_reminder',
                title: '保持学习',
                message: `已经 ${daysSinceLastPractice} 天没有练习了，快来复习吧！`,
                action: 'practice',
                priority: 'low',
                daysSinceLastPractice
            };
        }

        return null;
    }

    /**
     * 检查新内容
     */
    async checkNewContent(userId) {
        // 获取用户已学习的分类
        const learnedResult = await this.pool.query(`
            SELECT DISTINCT category
            FROM practice_history ph
            JOIN questions q ON ph.question_id = q.id
            WHERE ph.user_id = $1
        `, [userId]);

        const learnedCategories = new Set(learnedResult.rows.map(r => r.category));

        // 获取总分类数
        const totalResult = await this.pool.query(`
            SELECT COUNT(DISTINCT category) as count
            FROM questions
        `);

        const totalCategories = parseInt(totalResult.rows[0].count);

        if (learnedCategories.size < totalCategories) {
            return {
                type: 'new_content',
                title: '探索新内容',
                message: `还有 ${totalCategories - learnedCategories.size} 个知识点未学习`,
                action: 'explore',
                priority: 'low'
            };
        }

        return null;
    }

    /**
     * 获取用户提醒设置
     */
    async getReminderSettings(userId) {
        const result = await this.pool.query(`
            SELECT reminder_type, is_enabled, reminder_time
            FROM user_reminder_settings
            WHERE user_id = $1
        `, [userId]);

        const settings = {};
        result.rows.forEach(row => {
            settings[row.reminder_type] = {
                enabled: row.is_enabled,
                time: row.reminder_time
            };
        });

        return settings;
    }

    /**
     * 更新提醒设置
     */
    async updateReminderSettings(userId, settings) {
        for (const [type, config] of Object.entries(settings)) {
            await this.pool.query(`
                INSERT INTO user_reminder_settings (user_id, reminder_type, is_enabled, reminder_time)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, reminder_type)
                DO UPDATE SET is_enabled = $3, reminder_time = $4
            `, [userId, type, config.enabled, config.time || '09:00']);
        }

        return { success: true };
    }

    /**
     * 发送提醒通知
     */
    async sendReminder(userId, reminder) {
        // 这里可以集成各种通知渠道
        // 例如：邮件、短信、推送通知等
        console.log(`[Reminder] 发送提醒给用户 ${userId}:`, reminder);

        // 保存提醒记录
        await this.pool.query(`
            INSERT INTO reminder_history (user_id, reminder_type, message, sent_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `, [userId, reminder.type, reminder.message]);

        return { success: true };
    }
}

module.exports = StudyReminder;
