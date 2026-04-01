/**
 * 密评考试配置
 * 按照真实密评考试要求配置
 */

// 考核内容分类（学习路径）
const EXAM_CATEGORIES = {
  '密码政策法规': {
    weight: 0.10,  // 10%
    description: '密码法律法规、政策文件',
    color: '#ef4444',
    icon: '⚖️',
    keywords: ['密码法', '商用密码管理条例', '法律法规', '政策', '规定'],
    documents: [
      '密码法',
      '中华人民共和国密码法',
      '商用密码管理条例',
      '电子签名法',
      '关键信息基础设施安全保护条例'
    ]
  },

  '密码技术基础及相关标准': {
    weight: 0.20,  // 20%
    description: '密码算法、协议、技术基础',
    color: '#3b82f6',
    icon: '🔐',
    keywords: ['算法', '协议', 'SM2', 'SM3', 'SM4', 'SM9', '密码算法', '技术基础'],
    documents: [
      'SM2椭圆曲线公钥密码算法',
      'SM3密码杂凑算法',
      'SM4分组密码算法',
      'SM9标识密码算法',
      '密码学',
      '公钥基础设施'
    ]
  },

  '密码产品原理、应用及相关标准': {
    width: 0.20,  // 20%
    description: '密码产品、应用标准',
    color: '#8b5cf6',
    icon: '🛡️',
    keywords: ['产品', '应用', '模块', '芯片', '密码机', 'SSL', 'VPN'],
    documents: [
      '密码产品',
      '密码模块',
      'SSL',
      'VPN',
      '密码卡',
      '密码机'
    ]
  },

  '密评理论、技术及相关标准': {
    weight: 0.20,  // 20%
    description: '密评理论、技术、标准规范',
    color: '#f59e0b',
    icon: '📋',
    keywords: ['密评', '评估', '标准', '规范', '指引', '技术要求'],
    documents: [
      '信息系统密码应用基本要求',
      '密码应用安全性评估',
      'GB/T 39786',
      '密评标准',
      '评估指南'
    ]
  },

  '密码应用与安全性评估实务综合': {
    weight: 0.30,  // 30%
    description: '实际应用、综合案例',
    color: '#10b981',
    icon: '💼',
    keywords: ['应用', '实务', '案例', '实施', '部署', '系统集成'],
    documents: [
      '密码应用',
      '安全性评估',
      '实务',
      '案例分析',
      '实施方案',
      '应用系统'
    ]
  }
};

// 题型配置
const QUESTION_TYPES = {
  '单项选择题': {
    count: 60,
    score: 0.5,
    totalScore: 30,
    timeLimit: 25,  // 建议用时（分钟）
    icon: '🔘',
    color: '#3b82f6'
  },
  '多项选择题': {
    count: 60,
    score: 1.0,
    totalScore: 60,
    timeLimit: 50,  // 建议用时（分钟）
    icon: '🔲',
    color: '#8b5cf6'
  },
  '判断题': {
    count: 20,
    score: 0.5,
    totalScore: 10,
    timeLimit: 15,  // 建议用时（分钟）
    icon: '⚖️',
    color: '#f59e0b'
  }
};

// 模拟考试总配置
const EXAM_CONFIG = {
  totalQuestions: 140,
  totalScore: 100,
  timeLimit: 90,  // 90分钟
  passScore: 60,  // 及格分

  // 按考核内容分配题目数
  getCategoryQuestionCount: function() {
    const counts = {};
    for (const [category, config] of Object.entries(EXAM_CATEGORIES)) {
      counts[category] = Math.round(this.totalQuestions * config.weight);
    }
    return counts;
  },

  // 按题型和考核内容分配题目
  getDistribution: function() {
    const distribution = [];

    for (const [typeName, typeConfig] of Object.entries(QUESTION_TYPES)) {
      const typeCount = typeConfig.count;

      // 在该题型中按考核内容权重分配
      for (const [categoryName, categoryConfig] of Object.entries(EXAM_CATEGORIES)) {
        const count = Math.round(typeCount * categoryConfig.weight);
        if (count > 0) {
          distribution.push({
            question_type: typeName,
            category: categoryName,
            count: count,
            score: typeConfig.score
          });
        }
      }
    }

    return distribution;
  }
};

// 根据文档名称映射到考核内容
function mapDocumentToExamCategory(documentName) {
  if (!documentName) return null;

  for (const [category, config] of Object.entries(EXAM_CATEGORIES)) {
    // 检查文档名称是否包含关键词
    for (const keyword of config.keywords) {
      if (documentName.includes(keyword)) {
        return category;
      }
    }

    // 检查是否在文档列表中
    for (const doc of config.documents) {
      if (documentName.includes(doc)) {
        return category;
      }
    }
  }

  return null;
}

// 根据题目文本推断考核内容
function inferExamCategoryFromQuestion(questionText, lawCategory, techCategory) {
  const text = (questionText || '').toLowerCase();

  for (const [category, config] of Object.entries(EXAM_CATEGORIES)) {
    // 检查关键词
    for (const keyword of config.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // 根据现有分类推断
  if (lawCategory) {
    if (lawCategory.includes('密码法') || lawCategory.includes('条例')) {
      return '密码政策法规';
    }
    if (lawCategory.includes('标准') || lawCategory.includes('规范')) {
      return '密评理论、技术及相关标准';
    }
  }

  if (techCategory) {
    if (techCategory.includes('算法') || techCategory.includes('协议')) {
      return '密码技术基础及相关标准';
    }
    if (techCategory.includes('产品') || techCategory.includes('应用')) {
      return '密码产品原理、应用及相关标准';
    }
  }

  // 默认返回实务综合
  return '密码应用与安全性评估实务综合';
}

module.exports = {
  EXAM_CATEGORIES,
  QUESTION_TYPES,
  EXAM_CONFIG,
  mapDocumentToExamCategory,
  inferExamCategoryFromQuestion
};
