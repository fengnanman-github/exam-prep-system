/**
 * 智能备考优先级算法
 * 根据密评考试要求和当前掌握程度，计算各分类的练习优先级
 */

// 考试分类配置（按照真实密评考试要求）
const EXAM_CATEGORIES = {
  '密码政策法规': {
    exam_weight: 0.10,  // 考试占比10%
    target_questions: 14,  // 考试约14题（140题×10%）
    color: '#ef4444',
    icon: '⚖️',
    priority: 1,
    description: '密码法律法规、政策文件'
  },
  '密码技术基础及相关标准': {
    exam_weight: 0.20,  // 考试占比20%
    target_questions: 28,  // 考试约28题（140题×20%）
    color: '#3b82f6',
    icon: '🔐',
    priority: 2,
    description: '密码算法、协议、技术基础'
  },
  '密码产品原理、应用及相关标准': {
    exam_weight: 0.20,  // 考试占比20%
    target_questions: 28,  // 考试约28题（140题×20%）
    color: '#8b5cf6',
    icon: '🛡️',
    priority: 3,
    description: '密码产品、应用标准'
  },
  '密评理论、技术及相关标准': {
    exam_weight: 0.20,  // 考试占比20%
    target_questions: 28,  // 考试约28题（140题×20%）
    color: '#f59e0b',
    icon: '📋',
    priority: 4,
    description: '密评理论、技术、标准规范'
  },
  '密码应用与安全性评估实务综合': {
    exam_weight: 0.30,  // 考试占比30%
    target_questions: 42,  // 考试约42题（140题×30%）
    color: '#10b981',
    icon: '💼',
    priority: 5,
    description: '实际应用、综合案例'
  }
};

// 题型配置
const QUESTION_TYPES = {
  '单项选择题': {
    exam_count: 60,
    score: 0.5,
    total_score: 30,
    time_limit: 25,
    weight: 0.30  // 占总分30%
  },
  '多项选择题': {
    exam_count: 60,
    score: 1.0,
    total_score: 60,
    time_limit: 50,
    weight: 0.60  // 占总分60%
  },
  '判断题': {
    exam_count: 20,
    score: 0.5,
    total_score: 10,
    time_limit: 15,
    weight: 0.10  // 占总分10%
  }
};

/**
 * 计算备考优先级
 *
 * 算法说明：
 * 1. 基础优先级 = 考试占比 × (1 - 掌握程度)
 * 2. 掌握程度 = (已练数 / 应练数) × 正确率权重
 * 3. 紧急度 = 考试占比 - (已练数 / 总题数)
 * 4. 综合优先级 = 基础优先级 × 紧急度系数
 *
 * @param {Object} stats - 统计数据
 * @param {string} category - 考试分类
 * @returns {Object} 优先级信息
 */
function calculatePriority(stats, category) {
  const config = EXAM_CATEGORIES[category];
  if (!config) return { priority_score: 0, level: 'low' };

  const total = stats.total || 0;
  const practiced = stats.practiced || 0;
  const correct = stats.correct || 0;

  // 掌握程度 (0-1)
  // 综合考虑：练习完成度 + 正确率
  const practice_ratio = total > 0 ? (practiced / total) : 0;
  const accuracy = practiced > 0 ? (correct / practiced) : 0;
  const mastery_level = (practice_ratio * 0.6) + (accuracy * 0.4);  // 练习占60%，正确率占40%

  // 基础优先级 = 考试占比 × (1 - 掌握程度)
  // 考试占比越高、掌握程度越低，优先级越高
  const base_priority = config.exam_weight * (1 - mastery_level);

  // 紧急度 = 是否需要紧急练习
  // 如果已练数远低于应练数，紧急度高
  const target_practice = Math.min(total, Math.ceil(total * 0.3));  // 目标：至少练习30%
  const urgency = practiced < target_practice ? 1.5 : 1.0;

  // 综合优先级分数 (0-1)
  const priority_score = Math.min(1, base_priority * urgency);

  // 优先级等级
  let level = 'low';
  if (priority_score >= 0.15) level = 'critical';
  else if (priority_score >= 0.10) level = 'high';
  else if (priority_score >= 0.05) level = 'medium';

  // 推荐练习题数
  const recommended_count = Math.ceil((target_practice - practiced) * config.exam_weight);

  // 预计提升空间
  const potential_improvement = config.exam_weight * (1 - mastery_level);

  return {
    priority_score: Math.round(priority_score * 1000) / 1000,
    level,
    mastery_level: Math.round(mastery_level * 100),
    practice_ratio: Math.round(practice_ratio * 100),
    accuracy: Math.round(accuracy * 100),
    recommended_count: Math.max(0, recommended_count),
    potential_improvement: Math.round(potential_improvement * 100),
    exam_weight: config.exam_weight,
    target_questions: config.target_questions
  };
}

/**
 * 为所有分类计算优先级
 *
 * @param {Array} categoryStats - 分类统计数组
 * @returns {Array} 排序后的分类列表（按优先级降序）
 */
function calculateAllPriorities(categoryStats) {
  const priorities = [];

  for (const stat of categoryStats) {
    const categoryName = stat.category || stat.exam_category || stat.law_category || stat.tech_category;

    // 匹配到考试分类
    let examCategory = null;
    for (const [key, config] of Object.entries(EXAM_CATEGORIES)) {
      if (categoryName.includes(key.split(' ')[0]) ||
          categoryName.includes('密码') && key.includes('密码') ||
          categoryName.includes('评估') && key.includes('评估')) {
        examCategory = key;
        break;
      }
    }

    // 如果无法匹配，根据关键词推断
    if (!examCategory) {
      if (categoryName.includes('密码法') || categoryName.includes('条例')) {
        examCategory = '密码政策法规';
      } else if (categoryName.includes('算法') || categoryName.includes('SM')) {
        examCategory = '密码技术基础及相关标准';
      } else if (categoryName.includes('产品') || categoryName.includes('应用')) {
        examCategory = '密码产品原理、应用及相关标准';
      } else if (categoryName.includes('密评') || categoryName.includes('评估') || categoryName.includes('标准')) {
        examCategory = '密评理论、技术及相关标准';
      } else {
        examCategory = '密码应用与安全性评估实务综合';
      }
    }

    const priority = calculatePriority({
      total: stat.total || stat.total_count || 0,
      practiced: stat.practiced || stat.practiced_count || 0,
      correct: stat.correct || stat.correct_count || 0
    }, examCategory);

    priorities.push({
      category: categoryName,
      exam_category: examCategory,
      ...priority,
      icon: EXAM_CATEGORIES[examCategory]?.icon || '📄',
      color: EXAM_CATEGORIES[examCategory]?.color || '#6b7280'
    });
  }

  // 按优先级分数降序排序
  return priorities.sort((a, b) => b.priority_score - a.priority_score);
}

/**
 * 计算题型优先级
 *
 * 多选题分值最高（60分），应优先练习
 *
 * @param {Object} typeStats - 题型统计
 * @returns {Object} 优先级信息
 */
function calculateTypePriority(typeStats) {
  const priorities = [];

  for (const [typeName, typeConfig] of Object.entries(QUESTION_TYPES)) {
    const stats = typeStats[typeName] || { total: 0, practiced: 0, correct: 0 };

    const total = stats.total || 0;
    const practiced = stats.practiced || 0;
    const correct = stats.correct || 0;

    // 练习完成度
    const practice_ratio = total > 0 ? (practiced / total) : 0;
    const accuracy = practiced > 0 ? (correct / practiced) : 0;
    const mastery_level = (practice_ratio * 0.5) + (accuracy * 0.5);

    // 基础优先级 = 题型权重 × (1 - 掌握程度)
    // 多选题权重最高(0.60)，所以优先级也最高
    const base_priority = typeConfig.weight * (1 - mastery_level);

    // 分值加权：分值越高的题型，优先级越高
    const score_weight = typeConfig.total_score / 100;  // 0.1, 0.6, 0.1

    // 综合优先级
    const priority_score = (base_priority * 0.7) + (score_weight * 0.3);

    let level = 'low';
    if (priority_score >= 0.20) level = 'critical';
    else if (priority_score >= 0.12) level = 'high';
    else if (priority_score >= 0.06) level = 'medium';

    priorities.push({
      type: typeName,
      priority_score: Math.round(priority_score * 1000) / 1000,
      level,
      mastery_level: Math.round(mastery_level * 100),
      practice_ratio: Math.round(practice_ratio * 100),
      accuracy: Math.round(accuracy * 100),
      exam_count: typeConfig.exam_count,
      total_score: typeConfig.total_score,
      icon: typeName === '单项选择题' ? '🔘' : typeName === '多项选择题' ? '🔲' : '⚖️'
    });
  }

  return priorities.sort((a, b) => b.priority_score - a.priority_score);
}

/**
 * 获取今日推荐练习计划
 *
 * 根据优先级和用户时间，生成今日练习计划
 *
 * @param {Object} userStats - 用户统计
 * @param {number} timeAvailable - 可用时间（分钟）
 * @returns {Object} 练习计划
 */
function generateDailyPlan(userStats, timeAvailable = 30) {
  const categories = calculateAllPriorities(userStats.by_law_category || []);
  const types = calculateTypePriority({
    '单项选择题': userStats.by_type?.find(t => t.question_type === '单项选择题'),
    '多项选择题': userStats.by_type?.find(t => t.question_type === '多项选择题'),
    '判断题': userStats.by_type?.find(t => t.question_type === '判断题')
  });

  // 根据可用时间分配题目
  // 假设：单选30秒/题，多选60秒/题，判断15秒/题
  const avgTimePerQuestion = {
    '单项选择题': 0.5,  // 30秒
    '多项选择题': 1.0,  // 60秒
    '判断题': 0.25     // 15秒
  };

  // 计算能完成的题目数
  const totalQuestions = Math.floor(timeAvailable / 0.6);  // 平均36秒/题

  // 优先练习高优先级的分类和题型
  const plan = {
    total_time: timeAvailable,
    estimated_questions: totalQuestions,
    categories: [],
    types: [],
    focus_area: null
  };

  // 选择优先级最高的3个分类
  for (let i = 0; i < Math.min(3, categories.length); i++) {
    const cat = categories[i];
    if (cat.level === 'critical' || cat.level === 'high') {
      plan.categories.push({
        category: cat.category,
        exam_category: cat.exam_category,
        recommended_count: Math.min(cat.recommended_count, Math.ceil(totalQuestions / 3)),
        priority_score: cat.priority_score,
        reason: getPriorityReason(cat)
      });
    }
  }

  // 选择优先级最高的题型
  const topType = types[0];
  if (topType) {
    plan.types.push({
      type: topType.type,
      recommended_count: Math.min(20, Math.ceil(totalQuestions / 2)),
      priority_score: topType.priority_score,
      reason: `该题型占${topType.total_score}分，需要重点练习`
    });
  }

  // 确定重点领域
  if (categories.length > 0) {
    const topCategory = categories[0];
    plan.focus_area = {
      category: topCategory.category,
      exam_category: topCategory.exam_category,
      reason: `${topCategory.exam_category}占考试${topCategory.exam_weight * 100}%，当前掌握度${topCategory.mastery_level}%`
    };
  }

  return plan;
}

/**
 * 获取优先级原因说明
 */
function getPriorityReason(priority) {
  if (priority.level === 'critical') {
    return `占考试${priority.exam_weight * 100}%，掌握度仅${priority.mastery_level}%，急需加强`;
  } else if (priority.level === 'high') {
    return `占考试${priority.exam_weight * 100}%，建议优先练习`;
  } else if (priority.level === 'medium') {
    return `掌握度${priority.mastery_level}%，继续保持`;
  } else {
    return `掌握度良好${priority.mastery_level}%`;
  }
}

/**
 * 智能推荐下一道题目
 *
 * 根据优先级算法，推荐最需要练习的题目
 *
 * @param {Object} userStats - 用户统计
 * @param {Array} availableQuestions - 可用题目列表
 * @returns {Object} 推荐的题目
 */
function recommendNextQuestion(userStats, availableQuestions) {
  if (!availableQuestions || availableQuestions.length === 0) {
    return null;
  }

  // 计算各分类的优先级
  const categories = calculateAllPriorities(userStats.by_law_category || []);

  // 找出优先级最高的分类
  const topCategory = categories[0];
  if (!topCategory) {
    return availableQuestions[0];
  }

  // 从高优先级分类中选择题目
  // 优先选择：1) 未练习的 2) 错误率高的 3) 随机
  const categoryQuestions = availableQuestions.filter(q => {
    const cat = q.exam_category || q.law_category || q.tech_category || '';
    return cat.includes(topCategory.exam_category.split(' ')[0]);
  });

  if (categoryQuestions.length > 0) {
    // 优先返回未练习的题目
    const unpracticed = categoryQuestions.find(q => !q.is_practiced);
    if (unpracticed) return unpracticed;

    // 其次返回错误率高的题目
    return categoryQuestions[0];
  }

  // 如果没有高优先级分类的题目，返回随机题目
  return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
}

module.exports = {
  EXAM_CATEGORIES,
  QUESTION_TYPES,
  calculatePriority,
  calculateAllPriorities,
  calculateTypePriority,
  generateDailyPlan,
  recommendNextQuestion
};
