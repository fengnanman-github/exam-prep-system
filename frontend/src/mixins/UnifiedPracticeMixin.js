/**
 * 统一练习Mixin
 * 为所有练习组件提供统一的练习提交和状态更新逻辑
 */

import { ref, computed, onMounted } from 'vue';
import api from '../utils/api';
import { authStore } from '../store/auth';
import { unifiedStateStore } from '../stores/unifiedState';

/**
 * 统一练习Mixin
 *
 * 使用方式：
 * import { useUnifiedPractice } from '../mixins/UnifiedPracticeMixin';
 *
 * const {
 *   useUnifiedAPI,
 *   submitAnswer,
 *   toggleUncertain,
 *   toggleFavorite,
 *   loading,
 *   error
 * } = useUnifiedPractice();
 */
export function useUnifiedPractice(options = {}) {
    const {
        practiceMode = 'random', // 练习模式
        autoSubmit = true, // 是否自动提交
        onPracticeSuccess = null, // 练习成功回调
        onPracticeError = null // 练习失败回调
    } = options;

    // 状态
    const loading = ref(false);
    const error = ref(null);
    const currentQuestion = ref(null);
    const isUncertain = ref(false);

    // 是否使用统一API
    const useUnifiedAPI = computed(() => {
        return unifiedStateStore.isFeatureEnabled('unifiedSuperMemo');
    });

    /**
     * 获取当前用户ID
     */
    const getCurrentUserId = () => {
        return authStore.getCurrentUserId();
    };

    /**
     * 记录答题开始时间
     */
    const answerStartTime = ref(null);

    const startAnswer = () => {
        answerStartTime.value = Date.now();
    };

    /**
     * 计算答题用时
     */
    const getTimeSpent = () => {
        if (!answerStartTime.value) return 0;
        return Math.round((Date.now() - answerStartTime.value) / 1000);
    };

    /**
     * 提交答案（统一API）
     */
    const submitUnifiedAnswer = async (questionId, userAnswer, isCorrect, uncertainReason = null) => {
        try {
            const userId = getCurrentUserId();
            const timeSpent = getTimeSpent();

            const response = await api.post('/api/v2/unified/practice/submit', {
                user_id: userId,
                question_id: questionId,
                user_answer: userAnswer,
                is_correct: isCorrect,
                time_spent: timeSpent,
                practice_mode: practiceMode,
                is_uncertain: isUncertain.value,
                uncertain_reason: uncertainReason
            });

            // 更新本地状态缓存
            if (response.data.state) {
                const existingState = unifiedStateStore.questionStates.get(questionId);
                if (existingState) {
                    existingState.update(response.data.state);
                }
            }

            return response.data;
        } catch (err) {
            error.value = err.message;
            throw err;
        }
    };

    /**
     * 提交答案（旧版API）
     */
    const submitLegacyAnswer = async (questionId, userAnswer, isCorrect) => {
        try {
            const userId = getCurrentUserId();
            const timeSpent = getTimeSpent();

            // 使用旧的练习提交API
            const response = await api.post('/api/v2/practice/submit-with-srs', {
                user_id: userId,
                question_id: questionId,
                user_answer: userAnswer,
                is_correct: isCorrect,
                time_spent: timeSpent
            });

            return response.data;
        } catch (err) {
            error.value = err.message;
            throw err;
        }
    };

    /**
     * 统一的提交答案接口
     */
    const submitAnswer = async (question, userAnswer, isCorrect, uncertainReason = null) => {
        loading.value = true;
        error.value = null;
        currentQuestion.value = question;

        try {
            let result;

            if (useUnifiedAPI.value) {
                result = await submitUnifiedAnswer(question.id, userAnswer, isCorrect, uncertainReason);
            } else {
                result = await submitLegacyAnswer(question.id, userAnswer, isCorrect);
            }

            // 重置不确定标记
            isUncertain.value = false;

            // 成功回调
            if (onPracticeSuccess) {
                await onPracticeSuccess(result);
            }

            return result;
        } catch (err) {
            // 失败回调
            if (onPracticeError) {
                await onPracticeError(err);
            }
            throw err;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 切换不确定标记（统一API）
     */
    const toggleUncertainUnified = async (questionId, reason) => {
        try {
            const userId = getCurrentUserId();
            const response = await api.post(`/api/v2/unified/state/${questionId}/toggle-uncertain`, {
                user_id: userId,
                reason
            });

            // 更新本地状态
            const state = unifiedStateStore.questionStates.get(questionId);
            if (state) {
                state.is_uncertain = response.data.is_uncertain;
            }

            return response.data;
        } catch (err) {
            error.value = err.message;
            throw err;
        }
    };

    /**
     * 切换不确定标记（旧版API）
     */
    const toggleUncertainLegacy = async (questionId, reason) => {
        try {
            const userId = getCurrentUserId();
            const response = await api.post('/api/v2/uncertain/toggle', {
                user_id: userId,
                question_id: questionId,
                reason
            });

            return response.data;
        } catch (err) {
            error.value = err.message;
            throw err;
        }
    };

    /**
     * 统一的切换不确定标记接口
     */
    const toggleUncertain = async (questionId, reason = null) => {
        loading.value = true;
        error.value = null;

        try {
            let result;

            if (useUnifiedAPI.value) {
                result = await toggleUncertainUnified(questionId, reason);
            } else {
                result = await toggleUncertainLegacy(questionId, reason);
            }

            // 更新本地状态
            isUncertain.value = result.is_uncertain;

            return result;
        } catch (err) {
            throw err;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 切换收藏标记（统一API）
     */
    const toggleFavoriteUnified = async (questionId, notes) => {
        try {
            const userId = getCurrentUserId();
            const response = await api.post(`/api/v2/unified/state/${questionId}/toggle-favorite`, {
                user_id: userId,
                notes
            });

            // 更新本地状态
            const state = unifiedStateStore.questionStates.get(questionId);
            if (state) {
                state.is_favorite = response.data.is_favorite;
            }

            return response.data;
        } catch (err) {
            error.value = err.message;
            throw err;
        }
    };

    /**
     * 统一的切换收藏标记接口
     */
    const toggleFavorite = async (questionId, notes = null) => {
        loading.value = true;
        error.value = null;

        try {
            if (!useUnifiedAPI.value) {
                throw new Error('收藏功能仅在统一API中可用');
            }

            const result = await toggleFavoriteUnified(questionId, notes);
            return result;
        } catch (err) {
            throw err;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 获取题目状态
     */
    const getQuestionState = async (questionId) => {
        try {
            if (useUnifiedAPI.value) {
                const states = await unifiedStateStore.getQuestionStates([questionId]);
                return states[0] || null;
            }
            return null;
        } catch (err) {
            error.value = err.message;
            return null;
        }
    };

    /**
     * 批量获取题目状态
     */
    const getQuestionStates = async (questionIds) => {
        try {
            if (useUnifiedAPI.value) {
                return await unifiedStateStore.getQuestionStates(questionIds);
            }
            return [];
        } catch (err) {
            error.value = err.message;
            return [];
        }
    };

    /**
     * 初始化（设置当前题目）
     */
    const initialize = async (question) => {
        currentQuestion.value = question;

        // 获取题目状态
        if (question && useUnifiedAPI.value) {
            const state = await getQuestionState(question.id);
            if (state) {
                isUncertain.value = state.is_uncertain;
            }
        }

        // 开始计时
        startAnswer();
    };

    return {
        // 状态
        loading,
        error,
        currentQuestion,
        isUncertain,
        useUnifiedAPI,

        // 方法
        submitAnswer,
        toggleUncertain,
        toggleFavorite,
        getQuestionState,
        getQuestionStates,
        initialize,
        startAnswer,
        getTimeSpent
    };
}

/**
 * 统一练习Mixin（Vue 2 风格，用于Options API）
 */
export const UnifiedPracticeMixin = {
    data() {
        return {
            unifiedPracticeLoading: false,
            unifiedPracticeError: null,
            currentQuestion: null,
            isUncertain: false,
            answerStartTime: null
        };
    },

    computed: {
        useUnifiedAPI() {
            return this.$unifiedStateStore?.isFeatureEnabled('unifiedSuperMemo') || false;
        }
    },

    methods: {
        startAnswer() {
            this.answerStartTime = Date.now();
        },

        getTimeSpent() {
            if (!this.answerStartTime) return 0;
            return Math.round((Date.now() - this.answerStartTime) / 1000);
        },

        async submitAnswer(question, userAnswer, isCorrect, uncertainReason = null) {
            this.unifiedPracticeLoading = true;
            this.unifiedPracticeError = null;
            this.currentQuestion = question;

            try {
                const userId = this.$authStore?.getCurrentUserId() || 'exam_user_001';
                const timeSpent = this.getTimeSpent();

                let result;

                if (this.useUnifiedAPI) {
                    result = await this.$api.post('/api/v2/unified/practice/submit', {
                        user_id: userId,
                        question_id: question.id,
                        user_answer: userAnswer,
                        is_correct: isCorrect,
                        time_spent: timeSpent,
                        practice_mode: this.practiceMode || 'random',
                        is_uncertain: this.isUncertain,
                        uncertain_reason: uncertainReason
                    });
                } else {
                    result = await this.$api.post('/api/v2/practice/submit-with-srs', {
                        user_id: userId,
                        question_id: question.id,
                        user_answer: userAnswer,
                        is_correct: isCorrect,
                        time_spent: timeSpent
                    });
                }

                this.isUncertain = false;
                return result.data;
            } catch (err) {
                this.unifiedPracticeError = err.message;
                throw err;
            } finally {
                this.unifiedPracticeLoading = false;
            }
        },

        async toggleUncertain(questionId, reason = null) {
            this.unifiedPracticeLoading = true;
            this.unifiedPracticeError = null;

            try {
                const userId = this.$authStore?.getCurrentUserId() || 'exam_user_001';
                let result;

                if (this.useUnifiedAPI) {
                    result = await this.$api.post(`/api/v2/unified/state/${questionId}/toggle-uncertain`, {
                        user_id: userId,
                        reason
                    });

                    // 更新本地状态
                    if (this.$unifiedStateStore) {
                        const state = this.$unifiedStateStore.questionStates.get(questionId);
                        if (state) {
                            state.is_uncertain = result.data.is_uncertain;
                        }
                    }
                } else {
                    result = await this.$api.post('/api/v2/uncertain/toggle', {
                        user_id: userId,
                        question_id: questionId,
                        reason
                    });
                }

                this.isUncertain = result.data.is_uncertain;
                return result.data;
            } catch (err) {
                this.unifiedPracticeError = err.message;
                throw err;
            } finally {
                this.unifiedPracticeLoading = false;
            }
        },

        async toggleFavorite(questionId, notes = null) {
            this.unifiedPracticeLoading = true;
            this.unifiedPracticeError = null;

            try {
                const userId = this.$authStore?.getCurrentUserId() || 'exam_user_001';

                if (!this.useUnifiedAPI) {
                    throw new Error('收藏功能仅在统一API中可用');
                }

                const result = await this.$api.post(`/api/v2/unified/state/${questionId}/toggle-favorite`, {
                    user_id: userId,
                    notes
                });

                // 更新本地状态
                if (this.$unifiedStateStore) {
                    const state = this.$unifiedStateStore.questionStates.get(questionId);
                    if (state) {
                        state.is_favorite = result.data.is_favorite;
                    }
                }

                return result.data;
            } catch (err) {
                this.unifiedPracticeError = err.message;
                throw err;
            } finally {
                this.unifiedPracticeLoading = false;
            }
        }
    }
};

export default useUnifiedPractice;
