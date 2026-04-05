/**
 * 优化的智能复习引擎 - 针对80分目标
 * 平衡高频考点和薄弱知识点
 */

/**
 * 80分目标策略分析
 *
 * 考试结构分析：
 * - 密码应用与安全性评估实务综合：30%（30分）- 必须拿24分以上
 * - 密码技术基础及相关标准：20%（20分）- 必须拿16分以上
 * - 密码产品原理、应用及相关标准：20%（20分）- 必须拿16分以上
 * - 密评理论、技术及相关标准：20%（20分）- 必须拿16分以上
 * - 密码政策法规：10%（10分）- 必须拿8分以上
 *
 * 策略：
 * 1. 高频考点优先（占比大的知识点）
 * 2. 薄弱重点突破（正确率<70%的知识点）
 * 3. 核心知识点巩固（正确率70-80%的知识点）
 * 4. 新题适量补充（避免知识盲区）
 */

const ReviewStrategy = {
  // 考试类别权重
  EXAM_WEIGHTS: {
    '密码应用与安全性评估实务综合': 30,
    '密码技术基础及相关标准': 20,
    '密码产品原理、应用及相关标准': 20,
    '密评理论、技术及相关标准': 20,
    '密码政策法规': 10
  },

  // 目标分数
  TARGET_SCORE: 80,

  // 各部分最低要求（按80%计算）
  MIN_SCORES: {
    '密码应用与安全性评估实务综合': 24,
    '密码技术基础及相关标准': 16,
    '密码产品原理、应用及相关标准': 16,
    '密评理论、技术及相关标准': 16,
    '密码政策法规': 8
  },

  /**
   * 计算知识点优先级分数
   * @param {object} category - 知识点信息
   * @param {object} userStats - 用户统计数据
   * @returns {number} 优先级分数（0-100）
   */
  calculatePriorityScore(category, userStats) {
    let score = 0;

    // 1. 考试权重影响（0-30分）
    const examWeight = this.EXAM_WEIGHTS[category.exam_category] || 10;
    score += (examWeight / 30) * 30;

    // 2. 题目数量影响（0-25分）
    // 题目越多，重要性越高
    const maxQuestions = Math.max(...Object.values(userStats.totalQuestionsByCategory));
    const questionScore = (category.total_questions / maxQuestions) * 25;
    score += questionScore;

    // 3. 用户掌握度影响（0-25分）
    // 掌握度越低，优先级越高
    const masteryScore = (1 - (category.accuracy || 0)) * 25;
    score += masteryScore;

    // 4. 复习紧急度（0-20分）
    if (category.days_until_review !== undefined) {
      if (category.days_until_review <= 0) {
        score += 20; // 已到期
      } else if (category.days_until_review <= 3) {
        score += 15; // 3天内到期
      } else if (category.days_until_review <= 7) {
        score += 10; // 7天内到期
      }
    }

    return Math.min(100, score);
  },

  /**
   * 判断知识点是否需要优先复习
   * @param {object} category - 知识点信息
   * @returns {boolean} 是否优先
   */
  isPriority(category) {
    // 高优先级条件：
    // 1. 考试权重高（20%+）且掌握度<70%
    // 2. 考试权重极高（30%）且掌握度<80%
    // 3. 复习时间已到期
    // 4. 正确率<60%（严重薄弱）

    const examWeight = this.EXAM_WEIGHTS[category.exam_category] || 10;
    const accuracy = category.accuracy || 0;
    const daysUntilReview = category.days_until_review || 999;

    // 极高权重（30%）且未达到80%
    if (examWeight >= 30 && accuracy < 0.8) {
      return true;
    }

    // 高权重（20%）且未达到70%
    if (examWeight >= 20 && accuracy < 0.7) {
      return true;
    }

    // 严重薄弱
    if (accuracy < 0.6) {
      return true;
    }

    // 已到期
    if (daysUntilReview <= 0) {
      return true;
    }

    return false;
  },

  /**
   * 生成优化的复习计划
   * @param {object} userData - 用户数据
   * @param {number} dailyGoal - 每日目标题数
   * @returns {object} 复习计划
   */
  generateOptimizedPlan(userData, dailyGoal = 50) {
    const {
      dueReviews = [],          // 待复习题目
      weakPoints = [],           // 薄弱知识点
      corePoints = [],           // 核心高频考点
      newQuestions = 0,          // 未练习题目
      learnedToday = 0,         // 今日已学习
      examCategoryStats = []    // 考试类别统计
    } = userData;

    const plan = {
      total: dailyGoal,
      completed: learnedToday,
      remaining: Math.max(0, dailyGoal - learnedToday),
      sections: [],
      strategy: '80分目标优化策略'
    };

    // 策略1：高频考点优先（占40%）
    const highPrioritySlot = Math.floor(dailyGoal * 0.4);
    if (corePoints.length > 0 && plan.remaining > 0) {
      const highPriorityToReview = Math.min(highPrioritySlot, plan.remaining, corePoints.length);
      plan.sections.push({
        type: 'high_priority',
        title: '🔥 高频考点',
        description: `重点掌握${corePoints.length}个高频考点`,
        count: highPriorityToReview,
        categories: corePoints.slice(0, 5),
        priority: 1,
        reason: '高频考点在考试中占比大，掌握后显著提升得分'
      });
      plan.remaining -= highPriorityToReview;
    }

    // 策略2：紧急复习（占30%）
    const reviewSlot = Math.floor(dailyGoal * 0.3);
    if (dueReviews.length > 0 && plan.remaining > 0) {
      const dueToReview = Math.min(reviewSlot, plan.remaining, dueReviews.length);
      plan.sections.push({
        type: 'urgent_review',
        title: '⏰ 紧急复习',
        description: `${dueReviews.length}道题目需要复习`,
        count: dueToReview,
        questions: dueReviews.slice(0, dueToReview),
        priority: 2,
        reason: '基于遗忘曲线，及时复习效果最佳'
      });
      plan.remaining -= dueToReview;
    }

    // 策略3：薄弱突破（占20%）
    const weakSlot = Math.floor(dailyGoal * 0.2);
    if (weakPoints.length > 0 && plan.remaining > 0) {
      const weakToPractice = Math.min(weakSlot, plan.remaining);
      plan.sections.push({
        type: 'weak_points',
        title: '🎯 薄弱突破',
        description: `重点突破${Math.min(weakPoints.length, 5)}个薄弱知识点`,
        count: weakToPractice,
        knowledgePoints: weakPoints.slice(0, 5),
        priority: 3,
        reason: '针对性练习薄弱环节，快速提升'
      });
      plan.remaining -= weakToPractice;
    }

    // 策略4：巩固提升（占10%）
    const consolidateSlot = Math.floor(dailyGoal * 0.1);
    if (plan.remaining > 0) {
      plan.sections.push({
        type: 'consolidate',
        title: '📈 巩固提升',
        description: '巩固已掌握知识点，提升到90%',
        count: consolidateSlot,
        priority: 4,
        reason: '从70-80%提升到90%，确保稳定发挥'
      });
      plan.remaining -= consolidateSlot;
    }

    return plan;
  },

  /**
   * 计算预期得分
   * @param {object} examCategoryStats - 考试类别统计
   * @returns {object} 预期得分分析
   */
  calculateExpectedScore(examCategoryStats) {
    let totalWeight = 0;
    let earnedWeight = 0;
    const details = [];

    examCategoryStats.forEach(stat => {
      const weight = this.EXAM_WEIGHTS[stat.exam_category] || 10;
      const accuracy = stat.accuracy || 0;
      const coverage = stat.coverage || 0;

      // 有效得分 = min(覆盖度/0.6, 1) × 正确率 × 权重
      // 假设：覆盖度达到60%后，该部分可以全部答对
      const effectiveCoverage = Math.min(coverage / 0.6, 1);
      const categoryScore = effectiveCoverage * accuracy;
      const earnedScore = categoryScore * weight;

      totalWeight += weight;
      earnedWeight += earnedScore;

      details.push({
        category: stat.exam_category,
        weight: weight,
        accuracy: accuracy,
        coverage: coverage,
        effective_coverage: effectiveCoverage,
        category_score: categoryScore,
        earned_score: earnedScore,
        meets_target: categoryScore >= 0.8, // 80%目标
        gap: (0.8 - categoryScore) * weight
      });
    });

    const totalScore = totalWeight > 0 ? (earnedWeight / totalWeight * 100) : 0;
    const gapToTarget = this.TARGET_SCORE - totalScore;

    return {
      total_score: parseFloat(totalScore.toFixed(1)),
      gap_to_target: parseFloat(gapToTarget.toFixed(1)),
      meets_target: totalScore >= this.TARGET_SCORE,
      details: details.sort((a, b) => b.weight - a.weight),
      recommendations: this.generateScoreRecommendations(details)
    };
  },

  /**
   * 生成得分建议
   */
  generateScoreRecommendations(details) {
    const recommendations = [];

    // 找出缺口最大的部分
    const biggestGaps = details
      .filter(d => !d.meets_target)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3);

    biggestGaps.forEach(gap => {
      const accuracyPercent = (gap.accuracy * 100).toFixed(1);
      const coveragePercent = (gap.coverage * 100).toFixed(1);

      if (gap.coverage < 0.6) {
        recommendations.push({
          category: gap.category,
          issue: 'coverage',
          message: `${gap.category}覆盖率仅${coveragePercent}%，建议增加练习题量`,
          action: '增加练习'
        });
      } else if (gap.accuracy < 0.8) {
        recommendations.push({
          category: gap.category,
          issue: 'accuracy',
          message: `${gap.category}正确率仅${accuracyPercent}%，建议重点复习`,
          action: '重点复习'
        });
      }
    });

    return recommendations;
  }
};

/**
 * 优化的复习计划生成器
 */
class OptimizedReviewGenerator {
  /**
   * 生成个性化复习计划（针对80分目标）
   */
  static generatePersonalizedPlan(userAnalysis, dailyGoal = 50) {
    const {
      categoryGaps = [],
      examCategoryStats = [],
      criticalGaps = [],
      expectedScore = 0
    } = userAnalysis;

    const plan = {
      goal: '达到80分目标',
      current_score: expectedScore,
      gap: 80 - expectedScore,
      daily_target: dailyGoal,
      phases: []
    };

    // 第一阶段：补齐最严重的缺口
    const phase1Categories = examCategoryStats
      .filter(cat => !cat.meets_target && cat.accuracy < 0.6)
      .sort((a, b) => a.accuracy - b.accuracy);

    if (phase1Categories.length > 0) {
      const phase1Questions = Math.min(dailyGoal * 0.5, phase1Categories.length * 10);
      plan.phases.push({
        name: '第一阶段：补齐严重薄弱环节',
        focus_areas: phase1Categories.map(c => c.exam_category),
        target_questions: phase1Questions,
        duration: '3-5天',
        priority: 1
      });
    }

    // 第二阶段：巩固核心知识点
    const phase2Categories = examCategoryStats
      .filter(cat => !cat.meets_target && cat.accuracy >= 0.6 && cat.accuracy < 0.8);

    if (phase2Categories.length > 0) {
      const phase2Questions = Math.min(dailyGoal * 0.3, phase2Categories.length * 10);
      plan.phases.push({
        name: '第二阶段：巩固核心知识点',
        focus_areas: phase2Categories.map(c => c.exam_category),
        target_questions: phase2Questions,
        duration: '3-5天',
        priority: 2
      });
    }

    // 第三阶段：全面冲刺
    plan.phases.push({
      name: '第三阶段：全面冲刺',
      focus_areas: examCategoryStats.map(c => c.exam_category),
      target_questions: dailyGoal,
      duration: '直到考试',
      priority: 3
    });

    return plan;
  }
}

module.exports = {
  ReviewStrategy,
  OptimizedReviewGenerator
};
