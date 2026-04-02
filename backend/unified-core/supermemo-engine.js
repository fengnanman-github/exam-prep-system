/**
 * SuperMemo SM-2 遗忘算法引擎
 * 统一的SuperMemo算法实现，供所有练习模式使用
 *
 * SuperMemo SM-2算法简介：
 * - 基于艾宾浩斯遗忘曲线的间隔重复算法
 * - 通过质量评分(0-5)调整复习间隔和难度因子
 * - 质量评分越高，下次复习间隔越长
 */

/**
 * 计算质量评分（自动）
 * 根据答题结果、用时、不确定标记计算质量评分
 *
 * @param {Object} params - 答题参数
 * @param {boolean} params.isCorrect - 是否正确
 * @param {number} params.timeSpent - 答题用时（秒）
 * @param {boolean} params.isUncertain - 是否标记不确定
 * @param {number} params.averageTime - 该题平均用时（秒，可选）
 * @returns {number} 质量评分 (0-5)
 */
function calculateQuality({ isCorrect, timeSpent, isUncertain, averageTime }) {
    // 错误答案：0-2分（完全忘记→模糊记忆）
    if (!isCorrect) {
        // 根据用时判断记忆程度
        // 很快答错：完全忘记（0分）
        // 很慢答错：模糊记忆（1-2分）
        if (timeSpent < 10) {
            return 0; // 完全忘记
        } else if (timeSpent < 30) {
            return 1; // 几乎忘记
        } else {
            return 2; // 模糊记忆
        }
    }

    // 正确答案：3-5分
    if (isUncertain) {
        // 正确但标记不确定：3分
        return 3;
    }

    // 根据用时判断掌握程度
    // 如果没有提供平均用时，使用默认阈值
    const avgTime = averageTime || 30;

    if (timeSpent <= avgTime * 0.5) {
        // 快速正确回答：5分（完美记忆）
        return 5;
    } else if (timeSpent <= avgTime * 1.5) {
        // 正常速度正确回答：4分（良好记忆）
        return 4;
    } else {
        // 慢速正确回答：3分（需要回忆）
        return 3;
    }
}

/**
 * 更新SuperMemo数据
 * 根据质量评分更新错题记录的SuperMemo参数
 *
 * @param {Object} wrongAnswer - 错题记录对象
 * @param {number} quality - 质量评分 (0-5)
 * @returns {Object} 更新后的SuperMemo参数
 */
function updateSuperMemo(wrongAnswer, quality) {
    // 获取当前参数
    const easeFactor = parseFloat(wrongAnswer.ease_factor) || 2.5;
    const reviewCount = parseInt(wrongAnswer.review_count) || 0;
    const reviewInterval = parseInt(wrongAnswer.review_interval) || 1;

    // 计算新的难度因子
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor); // 最小值1.3

    // 计算新的复习间隔
    let newInterval;
    if (reviewCount === 0) {
        newInterval = 1; // 第一次复习：1天
    } else if (reviewCount === 1) {
        newInterval = 6; // 第二次复习：6天
    } else {
        newInterval = Math.round(reviewInterval * newEaseFactor);
    }

    // 计算掌握度 (0-1)
    // 根据质量评分调整掌握度
    const currentMastery = parseFloat(wrongAnswer.mastery_level) || 0;
    let newMastery = currentMastery + (quality - 2.5) * 0.1;
    newMastery = Math.max(0, Math.min(1, newMastery)); // 限制在0-1之间

    // 计算下次复习时间
    const nextReviewTime = new Date();
    nextReviewTime.setDate(nextReviewTime.getDate() + newInterval);

    return {
        ease_factor: newEaseFactor,
        review_interval: newInterval,
        review_count: reviewCount + 1,
        mastery_level: newMastery,
        next_review_time: nextReviewTime
    };
}

/**
 * 初始化SuperMemo数据
 * 创建新的错题记录时的初始参数
 *
 * @returns {Object} 初始SuperMemo参数
 */
function initializeSuperMemo() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
        ease_factor: 2.5,
        review_interval: 1,
        review_count: 0,
        mastery_level: 0,
        next_review_time: tomorrow
    };
}

/**
 * 检查是否需要复习
 *
 * @param {Date} nextReviewTime - 下次复习时间
 * @returns {boolean} 是否需要复习
 */
function isDueForReview(nextReviewTime) {
    if (!nextReviewTime) return false;
    return new Date(nextReviewTime) <= new Date();
}

/**
 * 计算复习优先级
 * 根据掌握度和复习时间计算优先级
 *
 * @param {Object} params - 参数
 * @param {number} params.masteryLevel - 掌握度 (0-1)
 * @param {Date} params.nextReviewTime - 下次复习时间
 * @returns {number} 优先级 (1-5，5最高)
 */
function calculateReviewPriority({ masteryLevel, nextReviewTime }) {
    const mastery = parseFloat(masteryLevel) || 0;
    const now = new Date();

    if (!nextReviewTime) {
        // 没有安排复习
        return mastery < 0.5 ? 4 : 1;
    }

    const reviewTime = new Date(nextReviewTime);
    const daysUntilReview = Math.ceil((reviewTime - now) / (1000 * 60 * 60 * 24));

    // 已过期或今天到期
    if (daysUntilReview <= 0) {
        // 根据掌握度设置优先级
        if (mastery < 0.3) return 5; // 低掌握度 + 已过期 = 最高优先级
        if (mastery < 0.5) return 4;
        return 3;
    }

    // 未来复习
    if (daysUntilReview <= 3) {
        return mastery < 0.5 ? 3 : 2;
    } else if (daysUntilReview <= 7) {
        return mastery < 0.5 ? 2 : 1;
    } else {
        return 1; // 低优先级
    }
}

/**
 * 获取复习统计信息
 *
 * @param {Array} wrongAnswers - 错题记录数组
 * @returns {Object} 统计信息
 */
function getReviewStats(wrongAnswers) {
    const now = new Date();
    let dueToday = 0;
    let mastered = 0;
    let learning = 0;
    let struggling = 0;

    wrongAnswers.forEach(wa => {
        const mastery = parseFloat(wa.mastery_level) || 0;
        const nextReview = new Date(wa.next_review_time);

        if (mastery >= 0.8) {
            mastered++;
        } else if (mastery >= 0.5) {
            learning++;
        } else {
            struggling++;
        }

        if (nextReview <= now) {
            dueToday++;
        }
    });

    return {
        total: wrongAnswers.length,
        due_today: dueToday,
        mastered,
        learning,
        struggling,
        average_mastery: wrongAnswers.length > 0
            ? wrongAnswers.reduce((sum, wa) => sum + (parseFloat(wa.mastery_level) || 0), 0) / wrongAnswers.length
            : 0
    };
}

module.exports = {
    calculateQuality,
    updateSuperMemo,
    initializeSuperMemo,
    isDueForReview,
    calculateReviewPriority,
    getReviewStats
};
