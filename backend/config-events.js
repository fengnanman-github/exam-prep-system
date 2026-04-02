/**
 * 配置变更事件模块
 * 用于实现配置热重载功能
 * 配置变更时自动通知相关模块
 */

const EventEmitter = require('events');

// 创建全局事件发射器
class ConfigEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // 增加监听器限制
    }
}

const eventEmitter = new ConfigEventEmitter();

/**
 * 监听配置变更
 *
 * @param {string} key - 配置键（可选，不指定则监听所有）
 * @param {Function} callback - 回调函数
 */
function onConfigChanged(key, callback) {
    if (typeof key === 'function') {
        // 监听所有配置变更
        eventEmitter.on('config:changed', key);
    } else {
        // 监听特定配置变更
        const handler = (data) => {
            if (data.key === key) {
                callback(data);
            }
        };
        eventEmitter.on('config:changed', handler);
        return handler;
    }
}

/**
 * 监听批量配置变更
 *
 * @param {Function} callback - 回调函数
 */
function onBatchConfigChanged(callback) {
    eventEmitter.on('config:batchChanged', callback);
}

/**
 * 监听配置重置
 *
 * @param {Function} callback - 回调函数
 */
function onConfigReset(callback) {
    eventEmitter.on('config:reset', callback);
}

/**
 * 监听题目范围配置变更
 *
 * @param {Function} callback - 回调函数
 */
function onQuestionScopeChanged(callback) {
    const handler = (data) => {
        const scopeKeys = [
            'practice_question_scope',
            'category_question_scope',
            'exam_category_scope',
            'document_question_scope',
            'random_question_scope'
        ];
        if (scopeKeys.includes(data.key)) {
            callback(data);
        }
    };
    eventEmitter.on('config:changed', handler);
    return handler;
}

/**
 * 监听文档范围配置变更
 *
 * @param {Function} callback - 回调函数
 */
function onDocumentScopeChanged(callback) {
    const handler = (data) => {
        const scopeKeys = [
            'practice_document_scope',
            'review_document_scope'
        ];
        if (scopeKeys.includes(data.key)) {
            callback(data);
        }
    };
    eventEmitter.on('config:changed', handler);
    return handler;
}

/**
 * 监听自动更新规则变更
 *
 * @param {Function} callback - 回调函数
 */
function onAutoUpdateRuleChanged(callback) {
    const handler = (data) => {
        const ruleKeys = [
            'auto_apply_supermemo',
            'auto_sync_question_state',
            'auto_update_mastery'
        ];
        if (ruleKeys.includes(data.key)) {
            callback(data);
        }
    };
    eventEmitter.on('config:changed', handler);
    return handler;
}

/**
 * 解发事件
 *
 * @param {string} event - 事件名称
 * @param {Object} data - 事件数据
 */
function emit(event, data) {
    eventEmitter.emit(event, data);
}

/**
 * 解除事件监听
 *
 * @param {Function} handler - 之前注册的回调函数
 */
function offConfigChanged(handler) {
    eventEmitter.removeListener('config:changed', handler);
}

module.exports = {
    eventEmitter,
    onConfigChanged,
    onBatchConfigChanged,
    onConfigReset,
    onQuestionScopeChanged,
    onDocumentScopeChanged,
    onAutoUpdateRuleChanged,
    offConfigChanged,
    emit
};
