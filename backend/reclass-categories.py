#!/usr/bin/env python3
"""
密评备考系统 - 智能分类重设计
基于学习路径和考试大纲的科学分类体系
"""

import psycopg2
from datetime import datetime
import re

# 数据库连接
DB_CONFIG = {
    'host': 'localhost',
    'port': 15432,
    'database': 'exam_db',
    'user': 'exam_user',
    'password': 'exam_pass123'
}

# ========================================
# 新的分类体系设计
# ========================================

LEARNING_PATHS = {
    "1_基础知识": {
        "name": "基础知识",
        "icon": "📖",
        "order": 1,
        "description": "密码学基础概念、术语和原理",
        "subcategories": {
            "密码学概念": "密码学基本术语、定义",
            "密码基础": "密码算法基础理论",
            "密码体制": "对称密码、非对称密码",
            "密码应用基础": "密码应用基本概念"
        },
        "keywords": ["基础", "概念", "定义", "原理", "术语"]
    },

    "2_法律法规": {
        "name": "法律法规",
        "icon": "⚖️",
        "order": 2,
        "description": "密码相关法律法规和政策文件",
        "subcategories": {
            "密码法": "《中华人民共和国密码法》",
            "商用密码管理条例": "《商用密码管理条例》",
            "电子签名法": "《中华人民共和国电子签名法》",
            "配套规章": "各部门密码管理规章",
            "政策文件": "国家密码政策文件"
        },
        "keywords": ["密码法", "商用密码", "条例", "法律", "法规", "规章"]
    },

    "3_技术标准": {
        "name": "技术标准",
        "icon": "📋",
        "order": 3,
        "description": "密码技术标准和规范",
        "subcategories": {
            "密码算法标准": "对称密码算法、公钥密码算法等",
            "密码协议标准": "SSL/TLS、SSH等协议",
            "密码产品标准": "密码产品技术规范",
            "密码应用标准": "密码应用相关标准",
            "检测评估标准": "密码检测评估规范"
        },
        "keywords": ["标准", "规范", "GM/T", "GB/T", "算法", "协议"]
    },

    "4_应用实务": {
        "name": "应用实务",
        "icon": "💼",
        "order": 4,
        "description": "密码应用实践和案例分析",
        "subcategories": {
            "密码应用": "典型密码应用场景",
            "密钥管理": "密钥生成、存储、分发、销毁",
            "密码产品": "密码产品选型和管理",
            "密码检测": "密码检测与评估方法",
            "案例分析": "实际应用案例分析"
        },
        "keywords": ["应用", "管理", "检测", "评估", "案例", "产品", "密钥"]
    },

    "5_综合知识": {
        "name": "综合知识",
        "icon": "🎯",
        "order": 5,
        "description": "跨领域综合知识",
        "subcategories": {
            "网络安全": "网络安全相关内容",
            "风险管理": "密码风险管理",
            "行业应用": "各行业密码应用特点",
            "前沿技术": "密码技术发展趋势"
        },
        "keywords": ["网络", "安全", "风险", "管理", "行业", "发展"]
    }
}

# ========================================
# 智能分类函数
# ========================================

def classify_question(question_data):
    """
    根据题目内容智能分类

    Args:
        question_data: 题目数据字典

    Returns:
        (learning_path, subcategory): 学习路径和子类别
    """
    text = (
        question_data.get('question_text', '') +
        question_data.get('option_a', '') +
        question_data.get('option_b', '') +
        question_data.get('option_c', '') +
        question_data.get('option_d', '') +
        question_data.get('knowledge_point', '')
    ).lower()

    # 按学习路径分类
    for path_key, path_info in LEARNING_PATHS.items():
        # 检查是否匹配该学习路径
        for keyword in path_info['keywords']:
            if keyword in text:
                # 进一步匹配子类别
                for sub_key, sub_desc in path_info['subcategories'].items():
                    sub_keywords = sub_key.split('、')
                    if any(kw in text for kw in sub_keywords):
                        return (path_info['name'], sub_key)

                # 如果匹配到路径但没匹配到子类别，返回默认子类别
                first_sub = list(path_info['subcategories'].keys())[0]
                return (path_info['name'], first_sub)

    # 默认分类到综合知识
    return ("综合知识", "前沿技术")


def update_question_categories():
    """
    更新数据库中题目的分类
    """
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 创建新分类字段
    try:
        cur.execute("""
            ALTER TABLE questions ADD COLUMN IF NOT EXISTS learning_path VARCHAR(100);
            ALTER TABLE questions ADD COLUMN IF NOT EXISTS knowledge_subcategory VARCHAR(100);
            CREATE INDEX IF NOT EXISTS idx_questions_learning_path ON questions(learning_path);
            CREATE INDEX IF NOT EXISTS idx_questions_knowledge_subcategory ON questions(knowledge_subcategory);
        """)
        print("✅ 添加新分类字段")
    except Exception as e:
        print(f"添加字段时出错: {e}")

    # 读取所有题目
    cur.execute("SELECT id, question_text, option_a, option_b, option_c, option_d, knowledge_point FROM questions")
    questions = cur.fetchall()

    print(f"\n📊 共 {len(questions)} 道题目待分类\n")

    # 统计
    stats = {}
    for q in questions:
        q_id, q_text, opt_a, opt_b, opt_c, opt_d, kp = q

        question_data = {
            'question_text': q_text or '',
            'option_a': opt_a or '',
            'option_b': opt_b or '',
            'option_c': opt_c or '',
            'option_d': opt_d or '',
            'knowledge_point': kp or ''
        }

        # 智能分类
        path, subcat = classify_question(question_data)

        # 更新数据库
        cur.execute("""
            UPDATE questions
            SET learning_path = %s, knowledge_subcategory = %s
            WHERE id = %s
        """, (path, subcat, q_id))

        # 统计
        key = f"{path} -> {subcat}"
        stats[key] = stats.get(key, 0) + 1

    conn.commit()

    # 打印统计
    print("\n📈 分类统计：")
    print("=" * 60)
    for key, count in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"{key}: {count}题")

    print("\n✅ 分类完成！")

    cur.close()
    conn.close()


# ========================================
# 遗忘曲线练习算法
# ========================================

FORGETTING_CURVE = {
    1: 1,      # 1天后复习
    2: 3,      # 3天后复习
    3: 7,      # 7天后复习
    4: 15,     # 15天后复习
    5: 30,     # 30天后复习
    6: 60,     # 60天后复习
    7: 120,    # 120天后复习
}

def calculate_review_priority(practice_record):
    """
    计算复习优先级（基于遗忘曲线）

    Args:
        practice_record: {
            'question_id': int,
            'last_practiced': datetime,
            'practice_count': int,
            'correct_count': int,
            'wrong_count': int,
            'mastery_level': float  # 0-1
        }

    Returns:
        {
            'priority': int (1-5, 5最高),
            'should_review': bool,
            'days_until_review': int,
            'reason': str
        }
    """
    from datetime import timedelta

    last_practiced = practice_record['last_practiced']
    practice_count = practice_record['practice_count']
    wrong_count = practice_record['wrong_count']
    mastery_level = practice_record.get('mastery_level', 0.5)

    # 计算错误率
    total = practice_count
    error_rate = wrong_count / total if total > 0 else 0

    # 根据练习次数确定复习间隔
    review_interval = FORGETTING_CURVE.get(min(practice_count, 7), 120)
    days_since_practice = (datetime.now() - last_practiced).days
    days_until_review = review_interval - days_since_practice

    # 判断是否应该复习
    should_review = days_until_review <= 0

    # 计算优先级
    priority = 1
    reason = ""

    if error_rate > 0.5:
        # 错误率高的题目优先复习
        priority = 5
        reason = f"错误率{error_rate*100:.0f}%，需要重点复习"
    elif error_rate > 0.3:
        priority = 4
        reason = f"错误率{error_rate*100:.0f}%，建议复习"
    elif should_review:
        # 到了复习时间
        if days_until_review <= -7:
            priority = 5
            reason = f"已过期{abs(days_until_review)}天，急需复习"
        elif days_until_review <= -3:
            priority = 4
            reason = f"已过期{abs(days_until_review)}天"
        else:
            priority = 3
            reason = "到了复习时间"
    elif mastery_level < 0.6:
        priority = 3
        reason = f"掌握度{mastery_level*100:.0f}%，需要巩固"
    else:
        priority = 1
        reason = f"掌握良好，{days_until_review}天后复习"

    return {
        'priority': priority,
        'should_review': should_review,
        'days_until_review': days_until_review,
        'reason': reason
    }


if __name__ == '__main__':
    print("=" * 60)
    print("🔄 密评备考系统 - 分类体系重构")
    print("=" * 60)

    # 更新分类
    update_question_categories()

    print("\n" + "=" * 60)
    print("📝 遗忘曲线参数：")
    print("=" * 60)
    for key, value in FORGETTING_CURVE.items():
        print(f"第{key}次练习后: {value}天后复习")
