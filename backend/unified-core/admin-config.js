/**
 * 管理员配置管理器
 * 提供配置的CRUD操作，支持热重载
 */

// 配置缓存
let configCache = new Map();
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 缓存60秒

/**
 * 配置管理器类
 */
class AdminConfigManager {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * 获取所有配置
     *
     * @returns {Promise<Object>} 配置键值对
     */
    async getAllConfigs() {
        const result = await this.pool.query(`
            SELECT config_key, config_category, config_value_type,
                   value_string, value_integer, value_boolean,
                   value_json, value_array, display_name, description
            FROM admin_config
            WHERE is_active = true
            ORDER BY config_category, config_key
        `);

        const configs = {};
        result.rows.forEach(row => {
            configs[row.config_key] = this._extractValue(row);
            configs[row.config_key + '_meta'] = {
                category: row.config_category,
                type: row.config_value_type,
                display_name: row.display_name,
                description: row.description
            };
        });

        return configs;
    }

    /**
     * 获取指定配置
     *
     * @param {string} key - 配置键
     * @returns {Promise<any>} 配置值
     */
    async getConfig(key) {
        // 检查缓存
        const cached = this._getFromCache(key);
        if (cached !== undefined) {
            return cached;
        }

        const result = await this.pool.query(`
            SELECT config_value_type, value_string, value_integer,
                   value_boolean, value_json, value_array
            FROM admin_config
            WHERE config_key = $1 AND is_active = true
        `, [key]);

        if (result.rows.length === 0) {
            return null;
        }

        const value = this._extractValue(result.rows[0]);
        this._setCache(key, value);
        return value;
    }

    /**
     * 获取指定类别的配置
     *
     * @param {string} category - 配置类别
     * @returns {Promise<Object>} 配置对象
     */
    async getConfigsByCategory(category) {
        const result = await this.pool.query(`
            SELECT config_key, config_value_type, value_string,
                   value_integer, value_boolean, value_json, value_array
            FROM admin_config
            WHERE config_category = $1 AND is_active = true
        `, [category]);

        const configs = {};
        result.rows.forEach(row => {
            configs[row.config_key] = this._extractValue(row);
        });

        return configs;
    }

    /**
     * 设置配置
     *
     * @param {string} key - 配置键
     * @param {any} value - 配置值
     * @param {string} updatedBy - 更新者
     * @param {string} reason - 更新原因
     * @returns {Promise<Object>} 更新结果
     */
    async setConfig(key, value, updatedBy = 'system', reason = '') {
        // 获取配置元数据
        const metaResult = await this.pool.query(`
            SELECT id, config_value_type, config_category
            FROM admin_config
            WHERE config_key = $1
        `, [key]);

        if (metaResult.rows.length === 0) {
            throw new Error(`配置不存在: ${key}`);
        }

        const { id, config_value_type, config_category } = metaResult.rows[0];

        // 验证值类型
        this._validateValue(config_value_type, value);

        // 构建更新字段
        const updates = {
            updated_by: updatedBy,
            updated_at: new Date()
        };

        switch (config_value_type) {
            case 'string':
                updates.value_string = value;
                break;
            case 'integer':
                updates.value_integer = parseInt(value);
                break;
            case 'boolean':
                updates.value_boolean = value;
                break;
            case 'json':
                updates.value_json = typeof value === 'string' ? JSON.parse(value) : value;
                break;
            case 'array':
                updates.value_array = Array.isArray(value) ? value : [value];
                break;
        }

        // 更新配置
        const result = await this.pool.query(`
            UPDATE admin_config
            SET value_string = $1,
                value_integer = $2,
                value_boolean = $3,
                value_json = $4,
                value_array = $5,
                updated_by = $6,
                updated_at = $7
            WHERE id = $8
            RETURNING version, config_key, config_value_type,
                      value_string, value_integer, value_boolean,
                      value_json, value_array
        `, [
            updates.value_string || null,
            updates.value_integer || null,
            updates.value_boolean !== undefined ? updates.value_boolean : null,
            updates.value_json || null,
            updates.value_array || null,
            updatedBy,
            updates.updated_at,
            id
        ]);

        // 清除缓存
        this._clearCache(key);

        // 发送配置变更事件（用于热重载）
        const { eventEmitter } = require('./config-events');
        eventEmitter.emit('config:changed', {
            key,
            value: this._extractValue(result.rows[0]),
            category: config_category,
            updatedBy,
            reason
        });

        return {
            success: true,
            key,
            value: this._extractValue(result.rows[0]),
            version: result.rows[0].version
        };
    }

    /**
     * 批量设置配置
     *
     * @param {Object} configs - 配置键值对
     * @param {string} updatedBy - 更新者
     * @param {string} reason - 更新原因
     * @returns {Promise<Object>} 批量更新结果
     */
    async setConfigs(configs, updatedBy = 'system', reason = '批量更新') {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const results = [];

            for (const [key, value] of Object.entries(configs)) {
                const result = await this._setConfigInTransaction(client, key, value, updatedBy, reason);
                results.push(result);
                this._clearCache(key);
            }

            await client.query('COMMIT');

            // 发送批量配置变更事件
            const { eventEmitter } = require('./config-events');
            eventEmitter.emit('config:batchChanged', {
                configs: results,
                updatedBy,
                reason
            });

            return {
                success: true,
                updated: results.length,
                results
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 获取配置变更历史
     *
     * @param {string} configKey - 配置键（可选）
     * @param {number} limit - 返回数量
     * @returns {Promise<Array>} 历史记录
     */
    async getConfigHistory(configKey = null, limit = 50) {
        let query = `
            SELECT h.id, h.config_key, h.old_value, h.new_value,
                   h.changed_by, h.change_reason, h.changed_at,
                   c.display_name
            FROM admin_config_history h
            JOIN admin_config c ON h.config_id = c.id
        `;
        const params = [];
        let paramIndex = 1;

        if (configKey) {
            query += ` WHERE h.config_key = $${paramIndex++}`;
            params.push(configKey);
        }

        query += ` ORDER BY h.changed_at DESC LIMIT $${paramIndex++}`;
        params.push(limit);

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * 重置配置为默认值
     *
     * @param {string} key - 配置键
     * @param {string} updatedBy - 更新者
     * @returns {Promise<Object>} 重置结果
     */
    async resetConfig(key, updatedBy = 'system') {
        const result = await this.pool.query(`
            UPDATE admin_config
            SET value_string = NULL,
                value_integer = NULL,
                value_boolean = NULL,
                value_json = NULL::jsonb,
                value_array = NULL,
                updated_by = $1,
                updated_at = NOW()
            WHERE config_key = $2
            RETURNING default_value, version
        `, [updatedBy, key]);

        if (result.rows.length === 0) {
            throw new Error(`配置不存在: ${key}`);
        }

        this._clearCache(key);

        const { eventEmitter } = require('./config-events');
        eventEmitter.emit('config:reset', { key, updatedBy });

        return {
            success: true,
            key,
            default_value: result.rows[0].default_value,
            version: result.rows[0].version
        };
    }

    /**
     * 获取题目范围（封装常用查询）
     *
     * @param {string} scopeKey - 范围配置键
     * @returns {Promise<Object>} 题目范围配置
     */
    async getQuestionScope(scopeKey) {
        const scope = await this.getConfig(scopeKey);

        if (!scope) {
            // 返回默认配置
            return { mode: 'all', filters: {} };
        }

        return scope;
    }

    /**
     * 获取文档范围（封装常用查询）
     *
     * @param {string} scopeKey - 范围配置键
     * @returns {Promise<Object>} 文档范围配置
     */
    async getDocumentScope(scopeKey) {
        const scope = await this.getConfig(scopeKey);

        if (!scope) {
            return { mode: 'all', filters: {} };
        }

        return scope;
    }

    /**
     * 构建题目范围SQL条件
     *
     * @param {Object} scope - 题目范围配置
     * @returns {Object} { where: string, params: Array }
     */
    buildQuestionScopeSQL(scope) {
        if (!scope) {
            return { where: '', params: [] };
        }

        const { mode, filters = {} } = scope;
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        switch (mode) {
            case 'all':
                // 无条件
                break;

            case 'category':
                if (filters.categories && filters.categories.length > 0) {
                    conditions.push(`category = ANY($${paramIndex++})`);
                    params.push(filters.categories);
                }
                break;

            case 'exam_category':
                if (filters.exam_categories && filters.exam_categories.length > 0) {
                    conditions.push(`exam_category = ANY($${paramIndex++})`);
                    params.push(filters.exam_categories);
                }
                break;

            case 'custom':
                if (filters.question_ids && filters.question_ids.length > 0) {
                    conditions.push(`id = ANY($${paramIndex++})`);
                    params.push(filters.question_ids);
                }
                break;

            case 'document':
                if (filters.document_ids && filters.document_ids.length > 0) {
                    conditions.push(`EXISTS (
                        SELECT 1 FROM question_documents qd
                        WHERE qd.question_id = questions.id
                        AND qd.document_id = ANY($${paramIndex++})
                    )`);
                    params.push(filters.document_ids);
                }
                break;
        }

        // 处理排除ID
        if (filters.exclude_ids && filters.exclude_ids.length > 0) {
            conditions.push(`id NOT IN ($${paramIndex++})`);
            params.push(filters.exclude_ids);
        }

        const where = conditions.length > 0 ? conditions.join(' AND ') : '';

        return { where, params };
    }

    // ========== 私有方法 ==========

    _extractValue(row) {
        switch (row.config_value_type) {
            case 'string':
                return row.value_string;
            case 'integer':
                return row.value_integer;
            case 'boolean':
                return row.value_boolean;
            case 'json':
                return row.value_json;
            case 'array':
                return row.value_array;
            default:
                return null;
        }
    }

    _validateValue(expectedType, value) {
        switch (expectedType) {
            case 'string':
                if (typeof value !== 'string') {
                    throw new Error(`期望string类型，实际: ${typeof value}`);
                }
                break;
            case 'integer':
                if (typeof value !== 'number' || !Number.isInteger(value)) {
                    throw new Error(`期望integer类型，实际: ${typeof value}`);
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    throw new Error(`期望boolean类型，实际: ${typeof value}`);
                }
                break;
            case 'json':
                if (typeof value !== 'object') {
                    throw new Error(`期望object/json类型，实际: ${typeof value}`);
                }
                break;
            case 'array':
                if (!Array.isArray(value)) {
                    throw new Error(`期望array类型，实际: ${typeof value}`);
                }
                break;
        }
    }

    _getFromCache(key) {
        const cached = configCache.get(key);
        if (!cached) return undefined;

        const now = Date.now();
        if (now - cached.timestamp > CACHE_TTL) {
            configCache.delete(key);
            return undefined;
        }

        return cached.value;
    }

    _setCache(key, value) {
        configCache.set(key, {
            value,
            timestamp: Date.now()
        });
        cacheTimestamp = Date.now();
    }

    _clearCache(key) {
        configCache.delete(key);
        cacheTimestamp = Date.now();
    }

    _clearAllCache() {
        configCache.clear();
        cacheTimestamp = Date.now();
    }

    async _setConfigInTransaction(client, key, value, updatedBy, reason) {
        // 获取配置ID和类型
        const metaResult = await client.query(`
            SELECT id, config_value_type, config_category
            FROM admin_config
            WHERE config_key = $1
        `, [key]);

        if (metaResult.rows.length === 0) {
            throw new Error(`配置不存在: ${key}`);
        }

        const { id, config_value_type, config_category } = metaResult.rows[0];

        // 构建更新字段
        const updates = {
            updated_by: updatedBy,
            updated_at: new Date()
        };

        switch (config_value_type) {
            case 'string':
                updates.value_string = value;
                break;
            case 'integer':
                updates.value_integer = parseInt(value);
                break;
            case 'boolean':
                updates.value_boolean = value;
                break;
            case 'json':
                updates.value_json = typeof value === 'string' ? JSON.parse(value) : value;
                break;
            case 'array':
                updates.value_array = Array.isArray(value) ? value : [value];
                break;
        }

        const result = await client.query(`
            UPDATE admin_config
            SET value_string = $1, value_integer = $2, value_boolean = $3,
                value_json = $4, value_array = $5, updated_by = $6,
                updated_at = $7
            WHERE id = $8
            RETURNING version, config_key
        `, [
            updates.value_string || null, updates.value_integer || null,
            updates.value_boolean !== undefined ? updates.value_boolean : null,
            updates.value_json || null, updates.value_array || null,
            updatedBy, updates.updated_at, id
        ]);

        return {
            key: result.rows[0].config_key,
            value,
            version: result.rows[0].version,
            category: config_category
        };
    }
}

// 全局管理器实例
let managerInstance = null;

/**
 * 获取配置管理器实例
 *
 * @param {Object} pool - 数据库连接池
 * @returns {AdminConfigManager} 管理器实例
 */
function getInstance(pool) {
    if (!managerInstance) {
        managerInstance = new AdminConfigManager(pool);
    }
    return managerInstance;
}

module.exports = {
    AdminConfigManager,
    getInstance
};
