#!/usr/bin/env python3
"""
优化分类算法 - 处理"其他"类别，基于标准和规范进行二次分类
"""

import psycopg2
import re

# 数据库配置
db_config = {
    'host': 'db',
    'port': 5432,
    'database': 'exam_db',
    'user': 'exam_user',
    'password': 'exam_pass123'
}

# 扩展的分类规则（针对"其他"类别）
EXTENDED_CATEGORIES = {
    '密码标准与规范': {
        'keywords': [
            'gb/t', 'gmt', 'gb', '标准', '规范', '国标', '行标',
            'gm/t', 'gbt', 'iso', 'iec', 'rfc',
            '技术规范', '管理规范', '实施指南', '标准体系',
            '检测规范', '测评规范', '密码标准'
        ],
        'weight': 2
    },
    '密码检测与评估': {
        'keywords': [
            '测评', '评估', '检测', '认证', '安全性评估',
            '等级保护', '风险评估', '密评', '商用密码应用安全性评估',
            '评估方法', '评估准则', '评估标准', '测评标准',
            '合规性', '符合性', '验证', '测试'
        ],
        'weight': 2
    },
    '密码法': {
        'keywords': [
            '密码法', '《密码法》', '中华人民共和国密码法',
            '密码法规定', '根据密码法', '按照密码法'
        ],
        'weight': 3
    },
    '商用密码管理条例': {
        'keywords': [
            '商用密码管理条例', '《商用密码管理条例》',
            '条例规定', '管理条例', '条例要求',
            '密钥管理', '商用密码产品', '商用密码应用'
        ],
        'weight': 3
    },
    '十五五规划建议': {
        'keywords': [
            '十五五', '十五五规划', '十五五时期',
            '《建议》', '规划建议', '夯实基础、全面发力'
        ],
        'weight': 3
    },
    '中共二十届四中全会': {
        'keywords': [
            '二十届四中全会', '中共二十届四中全会',
            '党的二十届四中全会', '四中全会', '四中全会指出'
        ],
        'weight': 3
    }
}

def optimize_other_category(question_text, options_text="", knowledge_point=""):
    """优化"其他"类别的分类"""
    text = (str(question_text) + " " + str(options_text) + " " + str(knowledge_point)).lower()

    # 计算每个类别的加权分数
    scores = {}
    for category, config in EXTENDED_CATEGORIES.items():
        score = 0
        for keyword in config['keywords']:
            if keyword.lower() in text:
                score += config.get('weight', 1)
        scores[category] = score

    # 获取最高分的分类
    max_score = max(scores.values())
    if max_score > 0:
        return max(scores, key=scores.get)

    # 如果仍然无法分类，基于题目特征进行启发式分类
    if '测试' in text or '考试' in text:
        return '密码检测与评估'
    elif '系统' in text or '应用' in text:
        return '密码应用'
    elif '管理' in text or '监督' in text:
        return '密码管理与监督'
    else:
        return '综合与基础'

def optimize_classification():
    """优化分类结果"""
    try:
        print("=" * 80)
        print("优化分类结果 - 处理'其他'类别")
        print("=" * 80)

        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()

        # 获取所有"其他"类别的题目
        print("\n读取'其他'类别的题目...")
        cursor.execute("""
            SELECT id, question_text, option_a, option_b, option_c, option_d, knowledge_point, law_category, tech_category
            FROM questions
            WHERE law_category = '其他'
        """)
        questions = cursor.fetchall()
        print(f"✓ 读取到 {len(questions)} 道'其他'类别的题目")

        updated = 0
        changes = {}

        print("\n开始重新分类...")

        for q_id, q_text, opt_a, opt_b, opt_c, opt_d, knowledge, law_cat, tech_cat in questions:
            # 组合选项文本
            options = f"{opt_a or ''} {opt_b or ''} {opt_c or ''} {opt_d or ''}"

            # 优化分类
            new_law_cat = optimize_other_category(q_text, options, knowledge)

            if new_law_cat != '其他':
                # 更新数据库
                cursor.execute("""
                    UPDATE questions
                    SET law_category = %s
                    WHERE id = %s
                """, (new_law_cat, q_id))

                updated += 1
                changes[new_law_cat] = changes.get(new_law_cat, 0) + 1

                if updated % 100 == 0:
                    conn.commit()
                    print(f"  已更新 {updated}/{len(questions)} 题...")

        # 最终提交
        conn.commit()

        # 显示结果
        print(f"\n{'=' * 80}")
        print("优化完成！")
        print(f"{'=' * 80}")
        print(f"✅ 成功更新: {updated} 题")

        if changes:
            print(f"\n📊 重新分类结果:")
            for cat, count in sorted(changes.items(), key=lambda x: x[1], reverse=True):
                percentage = (count / updated * 100) if updated > 0 else 0
                print(f"   {cat}: +{count} 题 ({percentage:.1f}%)")

        # 显示优化后的总体分布
        cursor.execute("""
            SELECT law_category, COUNT(*) as count
            FROM questions
            GROUP BY law_category
            ORDER BY count DESC
        """)
        final_stats = cursor.fetchall()

        print(f"\n📚 优化后的法律法规大类分布:")
        total = sum(count for _, count in final_stats)
        for cat, count in final_stats:
            percentage = (count / total * 100) if total > 0 else 0
            print(f"   {cat}: {count} 题 ({percentage:.1f}%)")

        conn.close()
        print(f"\n✅ 优化完成！")

    except Exception as e:
        print(f"❌ 优化失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    optimize_classification()
