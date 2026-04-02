/**
 * 版本配置模块
 * 管理系统版本和功能开关配置
 */

import { reactive } from 'vue';
import api from '../utils/api';
import { authStore } from '../store/auth';

/**
 * 版本配置Store
 */
export const versionConfig = reactive({
    // 当前版本
    current: '1.x',

    // 功能开关
    features: {
        unifiedState: false,      // 统一题目状态
        unifiedSuperMemo: false,  // 统一遗忘算法
        unifiedStats: false       // 统一统计数据
    },

    // 旧版本标识
    legacy: '1.x',

    // 加载状态
    loading: false,

    // 错误信息
    error: null,

    // 最后更新时间
    lastUpdated: null,

    /**
     * 初始化版本配置
     * 从后端获取最新配置
     */
    async init() {
        this.loading = true;
        this.error = null;

        try {
            const userId = authStore.getCurrentUserId();
            const response = await api.get('/api/v2/version/config', {
                params: { user_id: userId }
            });

            this.current = response.data.version;
            this.features = { ...this.features, ...response.data.features };
            this.legacy = response.data.legacy;
            this.lastUpdated = new Date();

            return this;
        } catch (error) {
            console.error('初始化版本配置失败:', error);
            this.error = error.message;

            // 使用默认配置
            return this;
        } finally {
            this.loading = false;
        }
    },

    /**
     * 检查功能是否启用
     */
    isFeatureEnabled(feature) {
        return this.features[feature] || false;
    },

    /**
     * 检查是否使用新版本
     */
    isNewVersion() {
        return this.current !== '1.x' && this.current !== this.legacy;
    },

    /**
     * 检查是否使用统一API
     */
    useUnifiedAPI() {
        return this.isFeatureEnabled('unifiedState') ||
               this.isFeatureEnabled('unifiedSuperMemo') ||
               this.isFeatureEnabled('unifiedStats');
    },

    /**
     * 刷新配置
     */
    async refresh() {
        return await this.init();
    },

    /**
     * 获取功能状态摘要
     */
    getFeaturesSummary() {
        return {
            total: Object.keys(this.features).length,
            enabled: Object.values(this.features).filter(f => f).length,
            disabled: Object.values(this.features).filter(f => !f).length,
            details: { ...this.features }
        };
    },

    /**
     * 获取版本信息
     */
    getVersionInfo() {
        return {
            current: this.current,
            legacy: this.legacy,
            isNew: this.isNewVersion(),
            useUnified: this.useUnifiedAPI(),
            lastUpdated: this.lastUpdated
        };
    }
});

/**
 * 版本配置工具类
 */
export class VersionConfigHelper {
    constructor() {
        this.config = versionConfig;
    }

    /**
     * 等待功能启用
     * 轮询检查功能是否启用，最多等待指定时间
     */
    async waitForFeature(feature, timeout = 30000, interval = 1000) {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkFeature = () => {
                if (this.config.isFeatureEnabled(feature)) {
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`等待功能 ${feature} 启用超时`));
                } else {
                    setTimeout(checkFeature, interval);
                }
            };

            checkFeature();
        });
    }

    /**
     * 检查并提示功能未启用
     */
    checkFeature(feature, featureName) {
        if (!this.config.isFeatureEnabled(feature)) {
            const displayName = featureName || feature;
            console.warn(`${displayName} 功能未启用，使用旧版逻辑`);
            return false;
        }
        return true;
    }

    /**
     * 获取功能提示信息
     */
    getFeatureHint(feature) {
        const hints = {
            unifiedState: '统一题目状态 - 所有练习模式共享题目状态',
            unifiedSuperMemo: '统一遗忘算法 - 所有练习模式应用SuperMemo算法',
            unifiedStats: '统一统计数据 - 按考试类别综合计算进度和正确率'
        };

        return {
            enabled: this.config.isFeatureEnabled(feature),
            hint: hints[feature] || feature
        };
    }
}

/**
 * 创建版本配置辅助实例
 */
export const versionHelper = new VersionConfigHelper();

/**
 * Vue 3 组合式API Hook
 */
export function useVersionConfig() {
    return {
        config: versionConfig,
        helper: versionHelper,

        // 便捷方法
        isFeatureEnabled: (feature) => versionConfig.isFeatureEnabled(feature),
        isNewVersion: () => versionConfig.isNewVersion(),
        useUnifiedAPI: () => versionConfig.useUnifiedAPI(),
        refresh: () => versionConfig.refresh(),
        getFeaturesSummary: () => versionConfig.getFeaturesSummary(),
        getVersionInfo: () => versionConfig.getVersionInfo()
    };
}

/**
 * Vue 2 插件
 */
export const VersionConfigPlugin = {
    install(app) {
        // 添加到全局属性
        app.config.globalProperties.$versionConfig = versionConfig;
        app.config.globalProperties.$versionHelper = versionHelper;

        // 提供到依赖注入
        app.provide('versionConfig', versionConfig);
        app.provide('versionHelper', versionHelper);
    }
};

// 自动初始化
if (typeof window !== 'undefined') {
    versionConfig.init().catch(err => {
        console.error('自动初始化版本配置失败:', err);
    });
}

export default versionConfig;
