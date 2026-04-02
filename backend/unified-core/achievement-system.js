/**
 * 用户成就系统
 * 基于用户学习行为解锁成就和徽章
 */

class AchievementSystem {
    constructor(pool) {
        this.pool = pool;
        this.achievements = this.defineAchievements();
    }

    /**
     * 定义成就规则
     */
    defineAchievements() {
        return {
            // 学习成就
            first_practice: {
                id: 'first_practice',
                name: '初学者',
                description: '完成第一次练习',
                icon: '🎯',
                category: 'learning',
                condition: async (userId) => {
                    const result = await this.pool.query(
                        'SELECT COUNT(*) as count FROM practice_history WHERE user_id = $1',
                        [userId]
                    );
                    return parseInt(result.rows[0].count) >= 1;
                }
            },
            practice_100: {
                id: 'practice_100',
                name: '勤奋学习者',
                description: '完成100道题目',
                icon: '💪',
                category: 'learning',
                condition: async (userId) => {
                    const result = await this.pool.query(
                        'SELECT COUNT(*) as count FROM practice_history WHERE user_id = $1',
                        [userId]
                    );
                    return parseInt(result.rows[0].count) >= 100;
                }
            },
            practice_1000: {
                id: 'practice_1000',
                name: '题海征服者',
                description: '完成1000道题目',
                icon: '🏆',
                category: 'learning',
                condition: async (userId) => {
                    const result = await this.pool.query(
                        'SELECT COUNT(*) as count FROM practice_history WHERE user_id = $1',
                        [userId]
                    );
                    return parseInt(result.rows[0].count) >= 1000;
                }
            },
            streak_7: {
                id: 'streak_7',
                name: '坚持一周',
                description: '连续学习7天',
                icon: '🔥',
                category: 'consistency',
                condition: async (userId) => {
                    const result = await this.pool.query(`
                        SELECT COUNT(DISTINCT DATE(practiced_at)) as days
                        FROM practice_history
                        WHERE user_id = $1
                          AND practiced_at >= CURRENT_DATE - INTERVAL '7 days'
                    `, [userId]);
                    return parseInt(result.rows[0].days) >= 7;
                }
            },
            streak_30: {
                id: 'streak_30',
                name: '月度坚持者',
                description: '连续学习30天',
                icon: '🌟',
                category: 'consistency',
                condition: async (userId) => {
                    const result = await this.pool.query(`
                        SELECT COUNT(DISTINCT DATE(practiced_at)) as days
                        FROM practice_history
                        WHERE user_id = $1
                          AND practiced_at >= CURRENT_DATE - INTERVAL '30 days'
                    `, [userId]);
                    return parseInt(result.rows[0].days) >= 30;
                }
            },
            // 掌握成就
            mastery_50: {
                id: 'mastery_50',
                name: '掌握者',
                description: '正确率达到50%',
                icon: '📈',
                category: 'mastery',
                condition: async (userId) => {
                    const result = await this.pool.query(`
                        SELECT
                            COUNT(*) FILTER (WHERE is_correct = true) * 100.0 / COUNT(*) as accuracy
                        FROM practice_history
                        WHERE user_id = $1
                    `, [userId]);
                    const accuracy = parseFloat(result.rows[0].accuracy) || 0;
                    return accuracy >= 50;
                }
            },
            mastery_80: {
                id: 'mastery_80',
                name: '专家',
                description: '正确率达到80%',
                icon: '🎓',
                category: 'mastery',
                condition: async (userId) => {
                    const result = await this.pool.query(`
                        SELECT
                            COUNT(*) FILTER (WHERE is_correct = true) * 100.0 / COUNT(*) as accuracy
                        FROM practice_history
                        WHERE user_id = $1
                    `, [userId]);
                    const accuracy = parseFloat(result.rows[0].accuracy) || 0;
                    return accuracy >= 80;
                }
            },
            // 复习成就
            review_master: {
                id: 'review_master',
                name: '复习大师',
                description: '完成100次复习',
                icon: '🔄',
                category: 'review',
                condition: async (userId) => {
                    const result = await this.pool.query(`
                        SELECT COUNT(*) as count
                        FROM practice_history ph
                        JOIN supermemo_data sm ON sm.question_id = ph.question_id AND sm.user_id = ph.user_id
                        WHERE ph.user_id = $1
                          AND sm.review_count >= 2
                    `, [userId]);
                    return parseInt(result.rows[0].count) >= 100;
                }
            },
            // 社交成就
            helpful_user: {
                id: 'helpful_user',
                name: '乐于助人',
                description: '收藏50道题目',
                icon: '❤️',
                category: 'social',
                condition: async (userId) => {
                    const result = await this.pool.query(
                        'SELECT COUNT(*) as count FROM favorite_questions WHERE user_id = $1',
                        [userId]
                    );
                    return parseInt(result.rows[0].count) >= 50;
                }
            }
        };
    }

    /**
     * 检查用户成就
     */
    async checkUserAchievements(userId) {
        const unlocked = [];
        const existing = await this.getUserAchievements(userId);
        const existingIds = new Set(existing.map(a => a.id));

        for (const [key, achievement] of Object.entries(this.achievements)) {
            if (!existingIds.has(achievement.id)) {
                const isUnlocked = await achievement.condition(userId);
                if (isUnlocked) {
                    await this.unlockAchievement(userId, achievement);
                    unlocked.push(achievement);
                }
            }
        }

        return unlocked;
    }

    /**
     * 解锁成就
     */
    async unlockAchievement(userId, achievement) {
        try {
            await this.pool.query(`
                INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, achievement_id) DO NOTHING
            `, [userId, achievement.id]);

            // 发出成就解锁事件
            console.log(`[Achievement] 用户 ${userId} 解锁成就: ${achievement.name}`);

            return true;
        } catch (error) {
            console.error('解锁成就失败:', error);
            return false;
        }
    }

    /**
     * 获取用户成就
     */
    async getUserAchievements(userId) {
        const result = await this.pool.query(`
            SELECT achievement_id, unlocked_at
            FROM user_achievements
            WHERE user_id = $1
            ORDER BY unlocked_at DESC
        `, [userId]);

        return result.rows.map(row => {
            const achievement = this.achievements[row.achievement_id];
            return achievement ? {
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                category: achievement.category,
                unlockedAt: row.unlocked_at
            } : null;
        }).filter(Boolean);
    }

    /**
     * 获取成就统计
     */
    async getAchievementStats(userId) {
        const userAchievements = await this.getUserAchievements(userId);
        const totalAchievements = Object.keys(this.achievements).length;

        // 按分类统计
        const categoryStats = {};
        for (const achievement of userAchievements) {
            categoryStats[achievement.category] = (categoryStats[achievement.category] || 0) + 1;
        }

        return {
            total: totalAchievements,
            unlocked: userAchievements.length,
            progress: Math.round((userAchievements.length / totalAchievements) * 100),
            categoryStats,
            recentAchievements: userAchievements.slice(0, 5)
        };
    }

    /**
     * 获取排行榜
     */
    async getLeaderboard(type = 'achievements', limit = 10) {
        let query;
        switch (type) {
            case 'achievements':
                query = `
                    SELECT user_id, COUNT(*) as achievement_count
                    FROM user_achievements
                    GROUP BY user_id
                    ORDER BY achievement_count DESC
                    LIMIT $1
                `;
                break;
            case 'practice_count':
                query = `
                    SELECT user_id, COUNT(*) as practice_count
                    FROM practice_history
                    GROUP BY user_id
                    ORDER BY practice_count DESC
                    LIMIT $1
                `;
                break;
            case 'accuracy':
                query = `
                    SELECT user_id,
                           COUNT(*) FILTER (WHERE is_correct = true) * 100.0 / COUNT(*) as accuracy
                    FROM practice_history
                    GROUP BY user_id
                    HAVING COUNT(*) >= 10
                    ORDER BY accuracy DESC
                    LIMIT $1
                `;
                break;
            default:
                throw new Error('Invalid leaderboard type');
        }

        const result = await this.pool.query(query, [limit]);
        return result.rows;
    }

    /**
     * 获取所有可用成就
     */
    getAllAchievements() {
        return Object.values(this.achievements).map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            category: a.category
        }));
    }
}

module.exports = AchievementSystem;
