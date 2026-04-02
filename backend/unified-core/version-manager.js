/**
 * 版本管理器
 * 控制统一核心逻辑的功能开关和版本切换
 */

const VERSION_CONFIG = {
    current: '2.0.0', // 当前版本
    features: {
        unifiedState: false,      // 统一题目状态
        unifiedSuperMemo: false,  // 统一遗忘算法
        unifiedStats: false       // 统一统计数据
    },
    legacy: '1.x' // 旧版本标识
};

/**
 * 版本管理器类
 */
class VersionManager {
    constructor(pool) {
        this.pool = pool;
        this.config = { ...VERSION_CONFIG };
    }

    /**
     * 初始化版本管理器
     * 从数据库加载功能开关配置
     */
    async initialize() {
        try {
            const result = await this.pool.query(`
                SELECT feature_name, is_enabled, enabled_for_users, enabled_percentage
                FROM feature_flags
                WHERE feature_name = ANY($1)
            `, [
                ['unified_question_state', 'unified_supermemo', 'unified_stats']
            ]);

            // 更新配置
            result.rows.forEach(row => {
                const featureKey = this._mapFeatureNameToKey(row.feature_name);
                if (featureKey) {
                    this.config.features[featureKey] = row.is_enabled;
                }
            });

            return this.config;
        } catch (error) {
            console.error('初始化版本管理器失败:', error);
            return this.config;
        }
    }

    /**
     * 检查功能是否启用
     *
     * @param {string} feature - 功能名称 (unifiedState, unifiedSuperMemo, unifiedStats)
     * @param {string} userId - 用户ID（用于白名单和灰度检查）
     * @returns {Promise<boolean>} 是否启用
     */
    async isFeatureEnabled(feature, userId) {
        try {
            const featureName = this._mapKeyToFeatureName(feature);

            // 获取功能配置
            const result = await this.pool.query(`
                SELECT is_enabled, enabled_for_users, enabled_percentage
                FROM feature_flags
                WHERE feature_name = $1
            `, [featureName]);

            if (result.rows.length === 0) {
                console.log(`[VersionManager] Feature ${featureName} not found`);
                return false;
            }

            const flag = result.rows[0];
            console.log(`[VersionManager] Checking ${feature} for user ${userId}:`, {
                is_enabled: flag.is_enabled,
                enabled_for_users: flag.enabled_for_users,
                enabled_percentage: flag.enabled_percentage
            });

            // 全局启用
            if (flag.is_enabled) {
                console.log(`[VersionManager] Feature ${feature} is globally enabled`);
                return true;
            }

            // 白名单检查
            if (flag.enabled_for_users && flag.enabled_for_users.length > 0) {
                console.log(`[VersionManager] Checking whitelist: ${userId} in ${flag.enabled_for_users}?`);
                if (flag.enabled_for_users.includes(userId)) {
                    console.log(`[VersionManager] User ${userId} is in whitelist`);
                    return true;
                }
            }

            // 灰度检查
            if (flag.enabled_percentage && flag.enabled_percentage > 0) {
                // 基于用户ID的哈希值进行灰度
                const hash = this._hashCode(userId);
                const threshold = flag.enabled_percentage;
                const result = (hash % 100) < threshold;
                console.log(`[VersionManager] Percentage check: ${hash} % 100 < ${threshold} = ${result}`);
                return result;
            }

            console.log(`[VersionManager] Feature ${feature} is not enabled for user ${userId}`);
            return false;
        } catch (error) {
            console.error(`检查功能 ${feature} 状态失败:`, error);
            return false;
        }
    }

    /**
     * 检查多个功能是否启用
     *
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} 各功能的启用状态
     */
    async getAllFeaturesStatus(userId) {
        const features = ['unifiedState', 'unifiedSuperMemo', 'unifiedStats'];
        const status = {};

        for (const feature of features) {
            status[feature] = await this.isFeatureEnabled(feature, userId);
        }

        return status;
    }

    /**
     * 设置功能开关
     *
     * @param {string} feature - 功能名称
     * @param {Object} options - 配置选项
     * @param {boolean} options.is_enabled - 是否全局启用
     * @param {string[]} options.enabled_for_users - 用户白名单
     * @param {number} options.enabled_percentage - 灰度百分比
     */
    async setFeature(feature, { is_enabled, enabled_for_users, enabled_percentage }) {
        try {
            const featureName = this._mapKeyToFeatureName(feature);

            await this.pool.query(`
                INSERT INTO feature_flags (feature_name, is_enabled, enabled_for_users, enabled_percentage)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (feature_name)
                DO UPDATE SET
                    is_enabled = EXCLUDED.is_enabled,
                    enabled_for_users = EXCLUDED.enabled_for_users,
                    enabled_percentage = EXCLUDED.enabled_percentage,
                    updated_at = CURRENT_TIMESTAMP
            `, [featureName, is_enabled, enabled_for_users || null, enabled_percentage || 0]);

            // 更新内存配置
            if (feature in this.config.features) {
                this.config.features[feature] = is_enabled;
            }

            return { success: true, feature, config: { is_enabled, enabled_for_users, enabled_percentage } };
        } catch (error) {
            console.error(`设置功能 ${feature} 失败:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 切换版本
     *
     * @param {string} version - 版本号 ('2.0.0' 或 '1.x')
     */
    async switchVersion(version) {
        try {
            if (version === '1.x' || version === 'legacy') {
                // 切换到旧版本：关闭所有新功能
                await this.pool.query(`
                    UPDATE feature_flags
                    SET is_enabled = false
                    WHERE feature_name = ANY($1)
                `, [
                    ['unified_question_state', 'unified_supermemo', 'unified_stats']
                ]);

                this.config.features.unifiedState = false;
                this.config.features.unifiedSuperMemo = false;
                this.config.features.unifiedStats = false;
                this.config.current = '1.x';
            } else if (version === '2.0.0' || version === '2.0') {
                // 切换到新版本：启用所有新功能
                await this.pool.query(`
                    UPDATE feature_flags
                    SET is_enabled = true
                    WHERE feature_name = ANY($1)
                `, [
                    ['unified_question_state', 'unified_supermemo', 'unified_stats']
                ]);

                this.config.features.unifiedState = true;
                this.config.features.unifiedSuperMemo = true;
                this.config.features.unifiedStats = true;
                this.config.current = '2.0.0';
            } else {
                return { success: false, error: '未知版本' };
            }

            return { success: true, version: this.config.current, features: this.config.features };
        } catch (error) {
            console.error(`切换版本到 ${version} 失败:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * 添加用户到功能白名单
     *
     * @param {string} feature - 功能名称
     * @param {string} userId - 用户ID
     */
    async addToWhitelist(feature, userId) {
        try {
            const featureName = this._mapKeyToFeatureName(feature);

            await this.pool.query(`
                UPDATE feature_flags
                SET
                    enabled_for_users = array_append(enabled_for_users, $1),
                    updated_at = CURRENT_TIMESTAMP
                WHERE feature_name = $2
            `, [userId, featureName]);

            return { success: true, feature, userId };
        } catch (error) {
            console.error(`添加用户 ${userId} 到 ${feature} 白名单失败:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 从功能白名单移除用户
     *
     * @param {string} feature - 功能名称
     * @param {string} userId - 用户ID
     */
    async removeFromWhitelist(feature, userId) {
        try {
            const featureName = this._mapKeyToFeatureName(feature);

            await this.pool.query(`
                UPDATE feature_flags
                SET
                    enabled_for_users = array_remove(enabled_for_users, $1),
                    updated_at = CURRENT_TIMESTAMP
                WHERE feature_name = $2
            `, [userId, featureName]);

            return { success: true, feature, userId };
        } catch (error) {
            console.error(`从 ${feature} 白名单移除用户 ${userId} 失败:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 设置灰度百分比
     *
     * @param {string} feature - 功能名称
     * @param {number} percentage - 百分比 (0-100)
     */
    async setPercentage(feature, percentage) {
        try {
            const featureName = this._mapKeyToFeatureName(feature);

            await this.pool.query(`
                UPDATE feature_flags
                SET
                    enabled_percentage = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE feature_name = $2
            `, [percentage, featureName]);

            return { success: true, feature, percentage };
        } catch (error) {
            console.error(`设置 ${feature} 灰度百分比为 ${percentage} 失败:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取功能使用统计
     */
    async getFeatureStats() {
        try {
            const result = await this.pool.query(`
                SELECT
                    feature_name,
                    is_enabled,
                    enabled_for_users,
                    enabled_percentage,
                    array_length(enabled_for_users, 1) as whitelist_count,
                    updated_at
                FROM feature_flags
                ORDER BY feature_name
            `);

            return result.rows;
        } catch (error) {
            console.error('获取功能统计失败:', error);
            return [];
        }
    }

    /**
     * 映射功能key到数据库feature_name
     */
    _mapKeyToFeatureName(key) {
        const mapping = {
            unifiedState: 'unified_question_state',
            unifiedSuperMemo: 'unified_supermemo',
            unifiedStats: 'unified_stats'
        };
        return mapping[key];
    }

    /**
     * 映射数据库feature_name到功能key
     */
    _mapFeatureNameToKey(name) {
        const mapping = {
            unified_question_state: 'unifiedState',
            unified_supermemo: 'unifiedSuperMemo',
            unified_stats: 'unifiedStats'
        };
        return mapping[name];
    }

    /**
     * 计算字符串哈希值（用于灰度）
     */
    _hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
}

// 创建单例实例
let instance = null;

/**
 * 获取版本管理器实例
 *
 * @param {Object} pool - 数据库连接池
 * @returns {VersionManager} 版本管理器实例
 */
function getInstance(pool) {
    if (!instance) {
        instance = new VersionManager(pool);
    }
    return instance;
}

module.exports = {
    VersionManager,
    getInstance,
    VERSION_CONFIG
};
