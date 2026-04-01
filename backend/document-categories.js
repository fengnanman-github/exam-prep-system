// 密评备考系统 - 文档分类映射
// 按优先级排序，用于按文档复习功能

// 优先级说明
// 5 = 核心必考（出题概率 70%+）
// 4 = 重要考点（出题概率 50-70%）
// 3 = 一般考点（出题概率 30-50%）
// 2 = 补充考点（出题概率 10-30%）
// 1 = 其他（出题概率 <10%）

const DOCUMENT_CATEGORIES = {
  // ==================== 优先级 5：核心必考 ====================
  '密码法': {
    category: '法律法规',
    priority: 5,
    icon: '📜',
    color: '#ef4444',
    description: '商用密码领域根本大法',
    keywords: ['密码', '商用密码', '密码管理', '密码安全', '密码产品']
  },

  '网络安全法': {
    category: '法律法规',
    priority: 5,
    icon: '🛡️',
    color: '#f59e0b',
    description: '网络安全领域基本法律',
    keywords: ['网络安全', '网络运营者', '网络产品', '网络服务', '关键信息基础设施']
  },

  '数据安全法': {
    category: '法律法规',
    priority: 5,
    icon: '💾',
    color: '#10b981',
    description: '数据安全领域基本法律',
    keywords: ['数据安全', '数据处理', '个人信息', '重要数据', '核心数据']
  },

  '个人信息保护法': {
    category: '法律法规',
    priority: 5,
    icon: '👤',
    color: '#8b5cf6',
    description: '个人信息保护基本法律',
    keywords: ['个人信息', '敏感个人信息', '个人信息处理', '隐私权']
  },

  '电子签名法': {
    category: '法律法规',
    priority: 5,
    icon: '✍️',
    color: '#06b6d4',
    description: '电子签名基本法律',
    keywords: ['电子签名', '签名效力', '可靠电子签名']
  },

  '保守国家秘密法': {
    category: '法律法规',
    priority: 5,
    icon: '🔒',
    color: '#dc2626',
    description: '保守国家秘密基本法律',
    keywords: ['国家秘密', '保密', '密级', '涉密']
  },

  '商用密码管理条例': {
    category: '行政法规',
    priority: 5,
    icon: '📋',
    color: '#f97316',
    description: '商用密码管理核心法规',
    keywords: ['商用密码', '密码产品', '检测认证', '销售', '进出口']
  },

  '关键信息基础设施安全保护条例': {
    category: '行政法规',
    priority: 5,
    icon: '🏢',
    color: '#0891b2',
    description: '关键信息基础设施保护',
    keywords: ['关键信息基础设施', 'CII', '保护要求', '安全防护']
  },

  'SM2椭圆曲线公钥密码算法': {
    category: '技术标准',
    priority: 5,
    icon: '🔐',
    color: '#7c3aed',
    description: 'SM2算法核心标准',
    keywords: ['SM2', '椭圆曲线', '公钥密码', '数字签名', '密钥交换']
  },

  '传输层密码协议（TLCP）': {
    category: '技术标准',
    priority: 5,
    icon: '🔗',
    color: '#2563eb',
    description: 'TLCP协议规范',
    keywords: ['TLCP', '传输层', '密码协议', 'SSL', 'TLS']
  },

  // ==================== 优先级 4：重要考点 ====================
  'SSLVPN技术规范': {
    category: '技术标准',
    priority: 4,
    icon: '🔒',
    color: '#0891b2',
    description: 'SSL VPN技术规范',
    keywords: ['SSLVPN', 'VPN', '虚拟专用网络', '安全协议']
  },

  'SSLVPN网关产品规范': {
    category: '产品规范',
    priority: 4,
    icon: '🌐',
    color: '#0ea5e9',
    description: 'SSL VPN网关产品',
    keywords: ['SSLVPN', '网关', 'VPN设备', 'VPN产品']
  },

  'IPSecVPN技术规范': {
    category: '技术标准',
    priority: 4,
    icon: '🛡️',
    color: '#6366f1',
    description: 'IPSec VPN技术规范',
    keywords: ['IPSec', 'VPN', '安全协议', '隧道技术']
  },

  'IPSecVPN网关产品规范': {
    category: '产品规范',
    priority: 4,
    icon: '🌐',
    color: '#0ea5e9',
    description: 'IPSec VPN网关产品',
    keywords: ['IPSec', '网关', 'VPN设备']
  },

  '服务器密码机技术规范': {
    category: '产品规范',
    priority: 4,
    icon: '🖥️',
    color: '#8b5cf6',
    description: '服务器密码机标准',
    keywords: ['服务器密码机', '密码机', '加密机', '密钥管理']
  },

  '智能密码钥匙技术规范': {
    category: '产品规范',
    priority: 4,
    icon: '🔑',
    color: '#f59e0b',
    description: '智能密码钥匙标准',
    keywords: ['智能密码钥匙', 'USB Key', '电子钥匙', '密码设备']
  },

  '时间戳服务器密码检测规范': {
    category: '检测认证',
    priority: 4,
    icon: '⏰',
    color: '#10b981',
    description: '时间戳服务器标准',
    keywords: ['时间戳', '时间戳服务器', '电子签名', '可信时间']
  },

  '服务器密码机检测规范': {
    category: '检测认证',
    priority: 4,
    icon: '🔍',
    color: '#8b5cf6',
    description: '服务器密码机检测',
    keywords: ['服务器密码机', '密码机', '检测', '认证']
  },

  '智能密码钥匙密码检测规范': {
    category: '检测认证',
    priority: 4,
    icon: '🔑',
    color: '#f59e0b',
    description: '智能密码钥匙检测',
    keywords: ['智能密码钥匙', 'USB Key', '检测', '认证']
  },

  '签名验签服务器技术规范': {
    category: '产品规范',
    priority: 4,
    icon: '✍️',
    color: '#06b6d4',
    description: '签名验签服务器',
    keywords: ['签名验签', '服务器', '数字签名', '验签']
  },

  '电子印章管理办法': {
    category: '行政法规',
    priority: 4,
    icon: '🏷️',
    color: '#ec4899',
    description: '电子印章管理',
    keywords: ['电子印章', '印章', '电子签章', '印章管理']
  },

  '安全电子签章密码技术规范': {
    category: '技术标准',
    priority: 4,
    icon: '✍️',
    color: '#06b6d4',
    description: '安全电子签章技术',
    keywords: ['电子签章', '签章', '印章', '电子签名']
  },

  '安全电子签章密码检测规范': {
    category: '检测认证',
    priority: 4,
    icon: '✅',
    color: '#84cc16',
    description: '电子签章检测',
    keywords: ['电子签章', '检测', '认证']
  },

  '电子签章应用接口规范': {
    category: '应用指南',
    priority: 4,
    icon: '📝',
    color: '#6366f1',
    description: '电子签章应用接口',
    keywords: ['电子签章', '接口', 'API', '应用集成']
  },

  // ==================== 优先级 3：一般考点 ====================
  '商用密码应用安全性评估FAQ（第三版）': {
    category: '应用指南',
    priority: 3,
    icon: '❓',
    color: '#f59e0b',
    description: '密评FAQ文档',
    keywords: ['FAQ', '密评', '常见问题', '安全性评估']
  },

  '商用密码应用安全性评估量化评估规则（2023版）': {
    category: '应用指南',
    priority: 3,
    icon: '📊',
    color: '#10b981',
    description: '密评量化评估规则',
    keywords: ['量化评估', '密评', '评估规则', '评分']
  },

  '商用密码应用安全性评估报告模板（2023版）': {
    category: '应用指南',
    priority: 3,
    icon: '📄',
    color: '#3b82f6',
    description: '密评报告模板',
    keywords: ['报告模板', '密评', '评估报告', '模板']
  },

  '信息安全技术信息系统密码应用基本要求': {
    category: '技术标准',
    priority: 3,
    icon: '💻',
    color: '#3b82f6',
    description: '信息系统密码应用基本要求',
    keywords: ['信息系统', '密码应用', '基本要求', '等保']
  },

  '信息安全技术信息系统密码应用测评要求': {
    category: '技术标准',
    priority: 3,
    icon: '📊',
    color: '8b5cf6',
    description: '信息系统密码应用测评要求',
    keywords: ['信息系统', '测评', '密评', '评估']
  },

  '商用密码应用安全性评估管理办法': {
    category: '行政法规',
    priority: 3,
    icon: '📋',
    color: 'f97316',
    description: '密评管理办法',
    keywords: ['密评', '安全性评估', '评估', '备案']
  },

  '数字证书格式': {
    category: '技术标准',
    priority: 3,
    icon: '📜',
    color: '#7c3aed',
    description: '数字证书格式标准',
    keywords: ['数字证书', 'X.509', '证书格式', '公钥证书']
  },

  '数字证书认证系统密码协议规范': {
    category: '技术标准',
    priority: 3,
    icon: '🔐',
    color: '#2563eb',
    description: '证书认证系统协议',
    keywords: ['数字证书', '认证系统', 'CA', 'PKI']
  },

  '电子认证服务密码管理办法': {
    category: '行政法规',
    priority: 3,
    icon: '📝',
    color: '#14b8a6',
    description: '电子认证服务管理',
    keywords: ['电子认证', 'CA', '认证服务', '电子认证服务机构']
  },

  '电子认证服务使用密码许可证': {
    category: '行政法规',
    priority: 3,
    icon: '📄',
    color: '#0ea5e9',
    description: '电子认证服务许可',
    keywords: ['电子认证', '许可证', '认证服务']
  },

  '电子政务电子认证服务管理办法': {
    category: '行政法规',
    priority: 3,
    icon: '🏛️',
    color: '6366f1',
    description: '电子政务认证服务',
    keywords: ['电子政务', '电子认证', '政务服务']
  },

  // ==================== 优先级 2：补充考点 ====================
  '密码模块安全要求': {
    category: '技术标准',
    priority: 2,
    icon: '🔒',
    color: '#dc2626',
    description: '密码模块安全',
    keywords: ['密码模块', '安全', 'FIPS 140-2']
  },

  '商用密码产品认证规则': {
    category: '检测认证',
    priority: 2,
    icon: '✅',
    color: '#22c55e',
    description: '产品认证规则',
    keywords: ['认证', '产品认证', '认证规则']
  },

  '商用密码产品认证目录': {
    category: '检测认证',
    priority: 2,
    icon: '📋',
    color: '#eab308',
    description: '产品认证目录',
    keywords: ['认证目录', '产品', '认证']
  },

  '浏览器密码应用接口规范': {
    category: '应用指南',
    priority: 2,
    icon: '🌐',
    color: '#3b82f6',
    description: '浏览器密码应用',
    keywords: ['浏览器', 'Web', 'HTTPS', '证书']
  },

  '密码应用HTTP接口规范': {
    category: '应用指南',
    priority: 2,
    icon: '🌐',
    color: '#06b981',
    description: 'HTTP密码应用',
    keywords: ['HTTP', 'API', '接口', 'Web应用']
  },

  '密码应用标识规范': {
    category: '应用指南',
    priority: 2,
    icon: '🏷️',
    color: '#8b5cf6',
    description: '密码应用标识',
    keywords: ['标识', '密码应用', '命名规则']
  },

  '动态口令密码应用技术规范': {
    category: '应用指南',
    priority: 2,
    icon: '🔢',
    color: '#f59e0b',
    description: '动态口令应用',
    keywords: ['动态口令', 'OTP', '一次性密码']
  },

  '云服务器密码机技术规范': {
    category: '产品规范',
    priority: 2,
    icon: '☁️',
    color: '#0ea5e9',
    description: '云服务器密码机',
    keywords: ['云服务器', '密码机', '云密码']
  },

  '密码产品随机数检测要求': {
    category: '检测认证',
    priority: 2,
    icon: '🎲',
    color: '#ec4899',
    description: '随机数检测',
    keywords: ['随机数', '检测', '密码产品']
  },

  '密码键盘密码检测规范': {
    category: '检测认证',
    priority: 2,
    icon: '⌨️',
    color: '#6b7280',
    description: '密码键盘检测',
    keywords: ['密码键盘', '检测', '输入设备']
  },

  '智能IC卡密码检测规范': {
    category: '检测认证',
    priority: 2,
    icon: '💳',
    color: '#10b981',
    description: '智能IC卡检测',
    keywords: ['IC卡', '智能卡', '检测']
  },

  // ==================== 优先级 1：其他 ====================
  '密码术语': {
    category: '基础',
    priority: 1,
    icon: '📖',
    color: '#6b7280',
    description: '密码术语定义',
    keywords: ['术语', '词汇', '定义']
  },

  '标准化法': {
    category: '基础',
    priority: 1,
    icon: '📚',
    color: '#9ca3af',
    description: '标准化相关',
    keywords: ['标准', '标准化', '国标']
  },

  '职业分类大典': {
    category: '基础',
    priority: 1,
    icon: '👷',
    color: '#78716c',
    description: '职业分类',
    keywords: ['职业', '工种', '岗位']
  }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOCUMENT_CATEGORIES;
}
