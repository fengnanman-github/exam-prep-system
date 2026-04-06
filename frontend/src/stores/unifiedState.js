/**
 * 统一题目状态管理Store
 * 管理所有题目的统一状态（练习、错题、不确定、收藏、SuperMemo等）
 */

import { reactive } from 'vue';
import api from '../utils/api';
import { authStore } from '../store/auth';

// 状态缓存过期时间（5分钟）
const CACHE_EXPIRY = 5 * 60 * 1000;

/**
 * 题目状态类
 */
class QuestionState {
    constructor(data) {
        this.id = data.id;
        this.question_no = data.question_no;
        this.question_text = data.question_text;
        this.question_type = data.question_type;
        this.category = data.category;
        this.exam_category = data.exam_category;
        this.law_category = data.law_category;
        this.tech_category = data.tech_category;
        this.difficulty = data.difficulty;
        this.knowledge_point = data.knowledge_point;

        // 练习状态
        this.practice_status = data.practice_status; // 'new' | 'practiced'
        this.mastery_status = data.mastery_status; // 'not_started' | 'struggling' | 'learning' | 'mastered'
        this.review_status = data.review_status; // 'not_scheduled' | 'scheduled' | 'due'

        // 统计数据
        this.practice_count = data.practice_count || 0;
        this.correct_count = data.correct_count || 0;
        this.wrong_count = data.wrong_count || 0;
        this.error_rate = data.error_rate || 0;
        this.last_practice_time = data.last_practice_time;

        // SuperMemo数据
        this.mastery_level = data.mastery_level || 0;
        this.ease_factor = data.ease_factor || 2.5;
        this.review_interval = data.review_interval || 1;
        this.next_review_time = data.next_review_time;

        // 标记
        this.is_wrong = data.is_wrong || false;
        this.is_uncertain = data.is_uncertain || false;
        this.is_favorite = data.is_favorite || false;

        // 缓存时间
        this._cached_at = Date.now();
    }

    /**
     * 检查缓存是否过期
     */
    isExpired() {
        return Date.now() - this._cached_at > CACHE_EXPIRY;
    }

    /**
     * 更新状态
     */
    update(data) {
        Object.assign(this, data);
        this._cached_at = Date.now();
    }
}

/**
 * 统一状态管理Store
 */
export const unifiedStateStore = reactive({
    // 题目状态缓存 Map<questionId, QuestionState>
    questionStates: new Map(),

    // 版本配置
    versionConfig: {
        current: '1.x',
        features: {
            unifiedState: false,
            unifiedSuperMemo: false,
            unifiedStats: false
        }
    },

    // 加载状态
    loading: false,

    // 错误信息
    error: null,

    /**
     * 初始化Store
     * 从后端获取版本配置
     */
    async initialize() {
        try {
            const userId = authStore.getCurrentUserId();
            const response = await api.get('/api/v2/version/config', {
                params: { user_id: userId }
            });

            this.versionConfig = response.data;
            return this.versionConfig;
        } catch (error) {
            console.error('初始化统一状态Store失败:', error);
            // 使用默认配置
            return this.versionConfig;
        }
    },

    /**
     * 检查功能是否启用
     */
    isFeatureEnabled(feature) {
        return this.versionConfig.features[feature] || false;
    },

    /**
     * 获取单个题目状态
     */
    getQuestionState(questionId) {
        return this.questionStates.get(questionId);
    },

    /**
     * 批量获取题目状态
     */
    async getQuestionStates(questionIds) {
        if (!questionIds || questionIds.length === 0) {
            return [];
        }

        // 检查是否使用统一API
        if (!this.isFeatureEnabled('unifiedState')) {
            console.warn('统一状态功能未启用');
            return [];
        }

        try {
            const userId = authStore.getCurrentUserId();
            const response = await api.get('/api/v2/unified/state', {
                params: {
                    user_id: userId,
                    question_ids: questionIds.join(',')
                }
            });

            // 更新缓存
            const states = [];
            response.data.questions.forEach(q => {
                const state = new QuestionState(q);
                this.questionStates.set(q.id, state);
                states.push(state);
            });

            return states;
        } catch (error) {
            console.error('获取题目状态失败:', error);
            this.error = error.message;
            return [];
        }
    },

    /**
     * 按考试类别获取题目状态
     */
    async getQuestionStatesByCategory(examCategory) {
        if (!examCategory) {
            return [];
        }

        if (!this.isFeatureEnabled('unifiedState')) {
            console.warn('统一状态功能未启用');
            return [];
        }

        try {
            const userId = authStore.getCurrentUserId();
            const response = await api.get('/api/v2/unified/state', {
                params: {
                    user_id: userId,
                    exam_category: examCategory
                }
            });

            // 更新缓存
            const states = [];
            response.data.questions.forEach(q => {
                const state = new QuestionState(q);
                this.questionStates.set(q.id, state);
                states.push(state);
            });

            return {
                questions: states,
                stats: response.data.stats
            };
        } catch (error) {
            console.error('按类别获取题目状态失败:', error);
            this.error = error.message;
            return { questions: [], stats: null };
        }
    },

    /**
     * 更新题目状态
     */
    async updateQuestionState(questionId, updates) {
        if (!this.isFeatureEnabled('unifiedState')) {
            console.warn('统一状态功能未启用');
            return null;
        }

        try {
            const userId = authStore.getCurrentUserId();
            const response = await api.put(`/api/v2/unified/state/${questionId}`, {
                user_id: userId,
                ...updates
            });

            // 更新缓存
            if (response.data.state) {
                const existingState = this.questionStates.get(questionId);
                if (existingState) {
                    existingState.update(response.data.state);
                } else {
                    this.questionStates.set(questionId, new QuestionState(response.data.state));
                }
            }

            return response.data;
        } catch (error) {
            console.error('更新题目状态失败:', error);
            this.error = error.message;
            return null;
        }
    },

    /**
     * 切换不确定标记
     */
    async toggleUncertain(questionId, reason) {
        if (!this.isFeatureEnabled('unifiedState')) {
            console.warn('统一状态功能未启用');
            return null;
        }

        try {
            const userId = authStore.getCurrentUserId();
            const response = await api.post(`/api/v2/unified/state/${questionId}/toggle-uncertain`, {
                user_id: userId,
                reason
            });

            // 更新缓存
            const state = this.questionStates.get(questionId);
            if (state) {
                state.is_uncertain = response.data.is_uncertain;
                state._cached_at = Date.now();
            }

            return response.data;
        } catch (error) {
            console.error('切换不确定标记失败:', error);
            this.error = error.message;
            return null;
        }
    },

    /**
     * 切换收藏标记
     */
    async toggleFavorite(questionId, notes) {
        if (!this.isFeatureEnabled('unifiedState')) {
            console.warn('统一状态功能未启用');
            return null;
        }

        try {
            const userId = authStore.getCurrentUserId();
            const response = await api.post(`/api/v2/unified/state/${questionId}/toggle-favorite`, {
                user_id: userId,
                notes
            });

            // 更新缓存
            const state = this.questionStates.get(questionId);
            if (state) {
                state.is_favorite = response.data.is_favorite;
                state._cached_at = Date.now();
            }

            return response.data;
        } catch (error) {
            console.error('切换收藏标记失败:', error);
            this.error = error.message;
            return null;
        }
    },

    /**
     * 获取用户统计信息
     */
    async getUserStats(examCategory) {
        if (!this.isFeatureEnabled('unifiedStats')) {
            console.warn('统一统计功能未启用');
            return null;
        }

        try {
            const userId = authStore.getCurrentUserId();
            const response = await api.get(`/api/v2/unified/stats/${userId}`, {
                params: examCategory ? { exam_category: examCategory } : {}
            });

            return response.data;
        } catch (error) {
            console.error('获取用户统计失败:', error);
            this.error = error.message;
            return null;
        }
    },

    /**
     * 清除缓存
     */
    clearCache() {
        this.questionStates.clear();
    },

    /**
     * 清除过期缓存
     */
    clearExpiredCache() {
        for (const [id, state] of this.questionStates.entries()) {
            try {
                // 安全检查：确保state对象存在且有isExpired方法
                if (state && typeof state.isExpired === 'function' && state.isExpired()) {
                    this.questionStates.delete(id);
                }
            } catch (error) {
                // 如果清理过程出错，删除该条目并记录日志
                console.warn(`清理缓存项 ${id} 时出错，删除该条目:`, error);
                this.questionStates.delete(id);
            }
        }
    }
});

// 定期清除过期缓存（每分钟）
if (typeof window !== 'undefined') {
    setInterval(() => {
        unifiedStateStore.clearExpiredCache();
    }, 60 * 1000);
}

// 初始化
if (typeof window !== 'undefined') {
    unifiedStateStore.initialize().catch(err => {
        console.error('初始化统一状态Store失败:', err);
    });
}
