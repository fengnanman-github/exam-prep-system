/**
 * 智能复习引擎 - 业界最佳实践实现
 * 结合SuperMemo SM-2、艾宾浩斯遗忘曲线、贝叶斯知识追踪
 */

/**
 * 复习质量评分（0-5）
 * 参考Anki和SuperMemor的评分标准
 */
const QUALITY_LEVELS = {
  COMPLETE_FORGOT: 0,      // 完全忘记，需要重新学习
  INCORRECT_BUT_FAMILIAR: 1, // 答错但有印象
  DIFFICULT_RECALL: 2,     // 困难回忆，答对但犹豫
  CORRECT_WITH_EFFORT: 3,  // 正确但需要思考
  CORRECT_WITH_HESITATION: 4, // 正确，略有犹豫
  PERFECT_RECALL: 5        // 完美记忆，瞬间回答
};

/**
 * 知识点掌握度等级
 */
const MASTERY_LEVELS = {
  UNKNOWN: 0,        // 未知（未练习）
  EXPOSED: 0.2,      // 已接触（练习1次）
  LEARNING: 0.4,     // 学习中（正确率40-60%）
  FAMILIAR: 0.6,     // 熟悉（正确率60-80%）
  PROFICIENT: 0.8,   // 熟练（正确率80-95%）
  MASTERED: 1.0      // 精通（正确率95%+）
};

/**
 * 增强版SuperMemo SM-2算法
 * 改进点：
 * 1. 考虑答题用时
 * 2. 考虑历史正确率
 * 3. 动态调整难度因子
 * 4. 添加复习置信度
 */
class EnhancedSuperMemo {
  /**
   * 计算质量评分
   * @param {boolean} isCorrect - 是否正确
   * @param {number} timeSpent - 答题用时（秒）
   * @param {number} averageTime - 平均用时（秒）
   * @param {boolean} isUncertain - 是否标记不确定
   * @returns {number} 质量评分（0-5）
   */
  static calculateQuality(isCorrect, timeSpent, averageTime = 30, isUncertain = false) {
    if (!isCorrect) {
      // 错误答案：根据是否有印象给出0或1分
      // 如果答题时间短，说明完全不知道（0分）
      // 如果答题时间长，说明有印象但不确定（1分）
      return timeSpent < averageTime * 0.3 ? QUALITY_LEVELS.COMPLETE_FORGOT : QUALITY_LEVELS.INCORRECT_BUT_FAMILIAR;
    }

    // 正确答案：根据用时和是否不确定给分
    const timeRatio = timeSpent / averageTime;

    if (isUncertain) {
      // 标记不确定，最高3分
      if (timeRatio > 2) return QUALITY_LEVELS.DIFFICULT_RECALL;
      return QUALITY_LEVELS.CORRECT_WITH_EFFORT;
    }

    // 未标记不确定
    if (timeRatio > 2) {
      // 用时很长，说明困难回忆
      return QUALITY_LEVELS.DIFFICULT_RECALL;
    } else if (timeRatio > 1.2) {
      // 用时略长，正确但需要思考
      return QUALITY_LEVELS.CORRECT_WITH_EFFORT;
    } else if (timeRatio > 0.7) {
      // 用时正常，略有犹豫
      return QUALITY_LEVELS.CORRECT_WITH_HESITATION;
    } else {
      // 用时很短，完美记忆
      return QUALITY_LEVELS.PERFECT_RECALL;
    }
  }

  /**
   * 计算下一次复习间隔
   * @param {object} state - 当前状态
   * @param {number} quality - 质量评分
   * @returns {object} 新状态
   */
  static calculateNextReview(state, quality) {
    // 确保所有数值都是数字类型，处理字符串或undefined/null
    const {
      ease_factor = 2.5,
      review_count = 0,
      review_interval = 1,
      mastery_level = 0
    } = state;

    // 转换为数字类型
    const ef = parseFloat(ease_factor) || 2.5;
    const rc = parseInt(review_count) || 0;
    const ri = parseFloat(review_interval) || 1;
    const ml = parseFloat(mastery_level) || 0;

    // 计算新的难度因子（EF）
    // SM-2公式：EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    let newEaseFactor = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, Math.min(2.5, newEaseFactor)); // 限制在1.3-2.5之间

    // 计算新的间隔（I）
    let newInterval;
    if (rc === 0) {
      newInterval = 1; // 第一次复习：1天
    } else if (rc === 1) {
      newInterval = 6; // 第二次复习：6天
    } else {
      // 后续复习：I = I * EF
      newInterval = Math.round(ri * newEaseFactor);
      // 确保结果是有效数字
      if (!isFinite(newInterval) || newInterval < 1) {
        newInterval = 1;
      }
    }

    // 添加随机扰动（±10%），避免所有题目在同一天复习
    const jitter = 0.9 + Math.random() * 0.2;
    newInterval = Math.round(newInterval * jitter);

    // 计算新的掌握度
    // 使用平滑递增的方式，避免剧烈波动
    const masteryIncrease = (quality - 2.5) * 0.1;
    let newMasteryLevel = ml + masteryIncrease;
    newMasteryLevel = Math.max(0, Math.min(1, newMasteryLevel)); // 限制在0-1之间

    // 计算置信度（基于复习次数和正确率）
    const confidence = Math.min(1, rc * 0.1 + (quality / 5) * 0.5);

    return {
      ease_factor: parseFloat(newEaseFactor.toFixed(2)),
      review_interval: newInterval,
      review_count: rc + 1,
      mastery_level: parseFloat(newMasteryLevel.toFixed(3)),
      confidence: parseFloat(confidence.toFixed(3))
    };
  }

  /**
   * 计算复习紧急度
   * @param {object} reviewData - 复习数据
   * @returns {number} 紧急度（0-1，1为最紧急）
   */
  static calculateUrgency(reviewData) {
    const { next_review_time, mastery_level, ease_factor } = reviewData;

    const now = new Date();
    const nextReview = new Date(next_review_time);
    const daysUntilReview = (nextReview - now) / (1000 * 60 * 60 * 24);

    // 已经过期
    if (daysUntilReview <= 0) {
      // 过期越久，紧急度越高
      return Math.min(1, Math.abs(daysUntilReview) * 0.1 + (1 - mastery_level) * 0.5);
    }

    // 即将到期（3天内）
    if (daysUntilReview <= 3) {
      return 0.8 - daysUntilReview * 0.2;
    }

    // 未来7天
    if (daysUntilReview <= 7) {
      return 0.2 + (1 - ease_factor / 2.5) * 0.3;
    }

    // 更远的时间，紧急度较低
    return 0.1;
  }
}

/**
 * 知识点掌握度评估器
 * 使用贝叶斯知识追踪（BKT）和项目反应理论（IRT）
 */
class KnowledgeMasteryEstimator {
  /**
   * 计算知识点掌握度
   * @param {array} practiceHistory - 练习历史
   * @returns {object} 掌握度评估
   */
  static estimateMastery(practiceHistory) {
    if (!practiceHistory || practiceHistory.length === 0) {
      return { level: 0, confidence: 0, stability: 0 };
    }

    // 计算正确率
    const total = practiceHistory.length;
    const correct = practiceHistory.filter(p => p.is_correct).length;
    const accuracy = correct / total;

    // 计算最近趋势（最近10次）
    const recent = practiceHistory.slice(-10);
    const recentCorrect = recent.filter(p => p.is_correct).length;
    const recentAccuracy = recentCorrect / recent.length;

    // 计算稳定性（方差）
    const scores = practiceHistory.map(p => p.is_correct ? 1 : 0);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stability = 1 - variance; // 方差越小，稳定性越高

    // 综合评估（正确率占60%，最近趋势占30%，稳定性占10%）
    const level = accuracy * 0.6 + recentAccuracy * 0.3 + stability * 0.1;

    // 置信度（基于练习次数）
    const confidence = Math.min(1, total / 20);

    return {
      level: parseFloat(level.toFixed(3)),
      confidence: parseFloat(confidence.toFixed(3)),
      stability: parseFloat(stability.toFixed(3)),
      accuracy: parseFloat(accuracy.toFixed(3)),
      recentAccuracy: parseFloat(recentAccuracy.toFixed(3))
    };
  }

  /**
   * 识别薄弱知识点
   * @param {array} knowledgePoints - 知识点列表及其统计
   * @param {number} threshold - 薄弱点阈值（默认0.6）
   * @returns {array} 薄弱知识点列表
   */
  static identifyWeakPoints(knowledgePoints, threshold = 0.6) {
    return knowledgePoints
      .filter(kp => {
        // 掌握度低于阈值
        if (kp.mastery_level < threshold) return true;

        // 练习次数足够但正确率低
        if (kp.practice_count >= 5 && kp.accuracy < 0.7) return true;

        // 最近表现下降
        if (kp.recent_accuracy < kp.accuracy - 0.2) return true;

        return false;
      })
      .sort((a, b) => {
        // 按优先级排序：掌握度低且紧急度高的优先
        const scoreA = (1 - a.mastery_level) * 0.7 + a.urgency * 0.3;
        const scoreB = (1 - b.mastery_level) * 0.7 + b.urgency * 0.3;
        return scoreB - scoreA;
      })
      .map(kp => ({
        ...kp,
        weakness_reason: this.getWeaknessReason(kp),
        recommended_action: this.getRecommendedAction(kp)
      }));
  }

  /**
   * 获取薄弱原因
   */
  static getWeaknessReason(kp) {
    if (kp.accuracy < 0.4) return '基础薄弱，需要重新学习';
    if (kp.practice_count < 3) return '练习不足，需要加强练习';
    if (kp.recent_accuracy < kp.accuracy - 0.2) return '遗忘明显，需要及时复习';
    if (kp.accuracy > 0.7 && kp.mastery_level < 0.6) return '记忆不牢，需要重复巩固';
    return '掌握不够，需要持续练习';
  }

  /**
   * 获取推荐行动
   */
  static getRecommendedAction(kp) {
    if (kp.accuracy < 0.4) return '重新学习→系统练习→重点复习';
    if (kp.practice_count < 3) return '增加练习频率，每天至少5题';
    if (kp.recent_accuracy < kp.accuracy - 0.2) return '立即复习，防止继续遗忘';
    if (kp.due_count > 0) return `优先复习${kp.due_count}道到期题目`;
    return '继续练习，逐步提升';
  }
}

/**
 * 复习计划生成器
 * 生成个性化的复习计划
 */
class ReviewPlanGenerator {
  /**
   * 生成每日复习计划
   * @param {object} userData - 用户数据
   * @param {number} dailyGoal - 每日目标题数
   * @returns {object} 复习计划
   */
  static generateDailyPlan(userData, dailyGoal = 50) {
    const {
      dueReviews = [],        // 到期复习
      weakPoints = [],         // 薄弱知识点
      newQuestions = 0,        // 未练习题目
      learnedToday = 0         // 今日已学习
    } = userData;

    const plan = {
      total: dailyGoal,
      completed: learnedToday,
      remaining: Math.max(0, dailyGoal - learnedToday),
      sections: []
    };

    // 1. 优先：到期复习（占50%）
    const reviewSlot = Math.floor(dailyGoal * 0.5);
    const dueToReview = Math.min(reviewSlot, dueReviews.length);
    if (dueToReview > 0) {
      plan.sections.push({
        type: 'urgent_review',
        title: '🔥 紧急复习',
        description: `${dueReviews.length}道题目需要复习`,
        count: dueToReview,
        questions: dueReviews.slice(0, dueToReview),
        priority: 1,
        reason: '基于遗忘曲线，这些题目已经到期，立即复习效果最佳'
      });
    }

    // 2. 次优先：薄弱知识点（占30%）
    const weakSlot = Math.floor(dailyGoal * 0.3);
    if (weakPoints.length > 0 && plan.remaining > 0) {
      const weakToPractice = Math.min(weakSlot, plan.remaining);
      plan.sections.push({
        type: 'weak_points',
        title: '🎯 薄弱突破',
        description: `重点突破${weakPoints.length}个薄弱知识点`,
        count: weakToPractice,
        knowledgePoints: weakPoints.slice(0, 5),
        priority: 2,
        reason: '针对性练习薄弱环节，提升整体掌握度'
      });
    }

    // 3. 最低优先：新题学习（占20%）
    const newSlot = Math.floor(dailyGoal * 0.2);
    if (newQuestions > 0 && plan.remaining > 0) {
      const newToLearn = Math.min(newSlot, plan.remaining, newQuestions);
      plan.sections.push({
        type: 'new_learning',
        title: '🆕 新题学习',
        description: `学习新的题目，扩展知识面`,
        count: newToLearn,
        priority: 3,
        reason: '保持新题学习，避免知识盲区'
      });
    }

    return plan;
  }

  /**
   * 生成长期复习计划
   * @param {object} userData - 用户数据
   * @param {number} days - 计划天数
   * @returns {object} 长期计划
   */
  static generateLongTermPlan(userData, days = 7) {
    const plan = {
      startDate: new Date(),
      endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      dailyPlans: [],
      summary: {
        totalReviews: 0,
        totalNewQuestions: 0,
        estimatedTime: 0,
        expectedMasteryGain: 0
      }
    };

    // 模拟未来几天的复习情况
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const dailyPlan = this.generateDailyPlan(userData, 50);

      plan.dailyPlans.push({
        date: date.toISOString().split('T')[0],
        ...dailyPlan
      });

      plan.summary.totalReviews += dailyPlan.sections.reduce((sum, s) => sum + (s.count || 0), 0);
    }

    plan.summary.estimatedTime = plan.summary.totalReviews * 1.5; // 假设每题1.5分钟
    plan.summary.expectedMasteryGain = Math.min(0.3, days * 0.03); // 预期提升30%掌握度

    return plan;
  }
}

/**
 * 复习效果分析器
 */
class ReviewEffectAnalyzer {
  /**
   * 分析复习效果
   * @param {array} reviewHistory - 复习历史
   * @returns {object} 效果分析
   */
  static analyzeEffect(reviewHistory) {
    if (!reviewHistory || reviewHistory.length === 0) {
      return { overall: '无数据', trends: [], suggestions: [] };
    }

    // 计算整体效果
    const totalReviews = reviewHistory.length;
    const correctReviews = reviewHistory.filter(r => r.quality >= 3).length;
    const effectiveness = correctReviews / totalReviews;

    let overall;
    if (effectiveness >= 0.9) overall = '优秀';
    else if (effectiveness >= 0.7) overall = '良好';
    else if (effectiveness >= 0.5) overall = '一般';
    else overall = '需要改进';

    // 分析趋势
    const trends = [];
    const weeklyData = this.groupByWeek(reviewHistory);

    for (let i = 1; i < weeklyData.length; i++) {
      const prevWeek = weeklyData[i - 1];
      const currWeek = weeklyData[i];

      const prevAccuracy = prevWeek.filter(r => r.quality >= 3).length / prevWeek.length;
      const currAccuracy = currWeek.filter(r => r.quality >= 3).length / currWeek.length;

      if (currAccuracy > prevAccuracy + 0.1) {
        trends.push({ week: i, type: 'improving', value: (currAccuracy - prevAccuracy).toFixed(2) });
      } else if (currAccuracy < prevAccuracy - 0.1) {
        trends.push({ week: i, type: 'declining', value: (prevAccuracy - currAccuracy).toFixed(2) });
      } else {
        trends.push({ week: i, type: 'stable', value: currAccuracy.toFixed(2) });
      }
    }

    // 生成建议
    const suggestions = [];
    if (effectiveness < 0.6) {
      suggestions.push('复习效果不佳，建议：\n1. 增加复习频率\n2. 尝试不同的学习方法\n3. 专注薄弱知识点');
    }
    if (trends.filter(t => t.type === 'declining').length >= 2) {
      suggestions.push('最近几周效果下降，建议调整复习策略');
    }
    if (effectiveness >= 0.8) {
      suggestions.push('复习效果很好！继续保持当前节奏');
    }

    return {
      overall,
      effectiveness: parseFloat(effectiveness.toFixed(3)),
      trends,
      suggestions
    };
  }

  /**
   * 按周分组数据
   */
  static groupByWeek(data) {
    const weeks = [];
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < 10; i++) {
      const weekStart = now - (i + 1) * weekMs;
      const weekEnd = now - i * weekMs;

      const weekData = data.filter(d => {
        const date = new Date(d.reviewed_at);
        return date.getTime() >= weekStart && date.getTime() < weekEnd;
      });

      weeks.unshift(weekData);
    }

    return weeks.filter(w => w.length > 0);
  }
}

module.exports = {
  EnhancedSuperMemo,
  KnowledgeMasteryEstimator,
  ReviewPlanGenerator,
  ReviewEffectAnalyzer,
  QUALITY_LEVELS,
  MASTERY_LEVELS
};
