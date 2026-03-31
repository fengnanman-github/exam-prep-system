#!/usr/bin/env python3
"""
智能分类脚本 - 基于法律法规和技术领域的两级分类体系
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

# 法律法规大类定义
LAW_CATEGORIES = {
    '密码法': {
        'keywords': [
            '密码法', '《密码法》', '中华人民共和国密码法',
            '密码法规定', '根据密码法', '按照密码法',
            '密码法第三', '密码法第', '密码法要求'
        ],
        'laws': ['密码法']
    },
    '商用密码管理条例': {
        'keywords': [
            '商用密码管理条例', '《商用密码管理条例》', '条例规定',
            '商用密码管理条例》', '管理条例', '条例要求',
            '密钥管理', '商用密码产品', '商用密码应用',
            '条例第二', '条例第'
        ],
        'laws': ['商用密码管理条例', '条例']
    },
    '电子印章管理办法': {
        'keywords': [
            '电子印章', '电子印章管理办法', '《电子印章管理办法》',
            '印章管理', '电子签名', '电子印章的', '印章系统',
            '印章制作', '印章备案', '电子印章应用'
        ],
        'laws': ['电子印章管理办法']
    },
    '电子政务电子认证服务管理办法': {
        'keywords': [
            '电子政务', '电子认证服务', '《电子政务电子认证服务管理办法》',
            '电子认证服务管理办法', '电子政务系统', '政务服务',
            '认证服务', '电子认证服务', '政务电子认证'
        ],
        'laws': ['电子政务电子认证服务管理办法', '电子认证服务管理办法']
    },
    '关键信息基础设施商用密码使用管理规定': {
        'keywords': [
            '关键信息基础设施', '关键信息', '关基', '关保条例',
            '基础设施', '商用密码使用', '使用管理规定',
            '关键信息基础设施商用密码', '关基密码'
        ],
        'laws': ['关键信息基础设施商用密码使用管理规定', '关基']
    },
    '商用密码领域违法线索投诉举报处理办法': {
        'keywords': [
            '投诉举报', '违法线索', '举报处理', '《商用密码领域违法线索',
            '投诉', '举报', '违法行为', '违法线索',
            '举报处理办法', '处理办法'
        ],
        'laws': ['商用密码领域违法线索投诉举报处理办法', '投诉举报']
    },
    '十五五规划建议': {
        'keywords': [
            '十五五', '十五五规划', '十五五时期', '十五五时期',
            '十五五时期我国', '《建议》', '规划建议',
            '国民经济和社会发展第十五个五年规划', '十五五建议',
            '夯实基础、全面发力'
        ],
        'laws': ['十五五', '规划建议']
    },
    '中共二十届四中全会': {
        'keywords': [
            '二十届四中全会', '中共二十届四中全会', '党的二十届四中全会',
            '四中全会', '二十届四中', '二十届中央委员会',
            '四中全会指出', '四中全会强调', '四中全会通过'
        ],
        'laws': ['二十届四中全会', '四中全会']
    }
}

# 技术专业类别定义
TECH_CATEGORIES = {
    '密码算法': {
        'keywords': [
            'sm2', 'sm3', 'sm4', 'sm9', 'sm7', 'sm1', 'ssf33',
            'aes', 'des', '3des', 'rsa', 'ecc', 'elgamal',
            '哈希', '摘要', 'md5', 'sha', 'hash', '杂凑',
            '加密', '解密', '对称加密', '非对称加密',
            '密钥生成', '密钥分发', '密钥协商',
            '序列密码', '分组密码', '公钥密码', '私钥密码',
            'diffie-hellman', 'dh', 'ecdh', '数字签名',
            '消息认证码', 'mac', 'hmac'
        ],
        'description': '密码算法理论与应用'
    },
    '密码协议': {
        'keywords': [
            '协议', 'ssl', 'tls', 'ssh', 'ipsec', 'https', 'vpn',
            '握手协议', '密钥交换协议', '身份认证协议',
            '安全通信协议', '传输层安全', '网络层安全',
            'wpa', 'wep', 'wpa2', 'wpa3', 'wifi安全',
            'tls握手', 'ssl协议', '密码协议', '安全协议'
        ],
        'description': '密码通信协议与标准'
    },
    'PKI与证书': {
        'keywords': [
            'pki', '公钥基础设施', '数字证书', '证书',
            'ca', 'ca中心', 'ca机构', '证书授权', '证书颁发',
            '身份认证', '签名验证', '证书吊销', 'crl', 'ocsp',
            '证书链', 'x.509', '证书格式', '证书申请',
            '根证书', '中间证书', '终端证书', '证书策略'
        ],
        'description': 'PKI体系与数字证书管理'
    },
    '密码产品': {
        'keywords': [
            '密码产品', '商用密码产品', '密码机', '加密机',
            '密码网关', 'vpn网关', '网关',
            '密码服务器', '密钥服务器', '服务器',
            '密码模块', '加密模块', '模块',
            '密码芯片', '安全芯片', '芯片',
            '智能ic卡', '智能卡', 'ic卡',
            '密码键盘', '密码设备', '审批', '型式试验'
        ],
        'description': '密码产品与设备'
    },
    '密钥管理': {
        'keywords': [
            '密钥管理', '密钥生命周期', '密钥生成', '密钥存储',
            '密钥分发', '密钥协商', '密钥更新', '密钥销毁',
            '密钥备份', '密钥恢复', '密钥 escrow',
            '主密钥', '加密密钥', '解密密钥',
            '会话密钥', '临时密钥', '长期密钥'
        ],
        'description': '密钥全生命周期管理'
    },
    '密码应用': {
        'keywords': [
            '密码应用', '应用系统', '信息系统',
            '应用场景', '业务系统', '应用层',
            '数据加密', '存储加密', '传输加密',
            '身份鉴别', '访问控制', '安全审计',
            '应用安全', '系统集成', '密码应用安全性'
        ],
        'description': '密码在信息系统中的应用'
    },
    '密码检测与评估': {
        'keywords': [
            '检测', '评估', '测评', '认证',
            '密码检测', '安全性评估', '合规性',
            '等级保护', '风险评估', '安全评估',
            '商用密码应用安全性评估', '密评',
            '评估方法', '评估准则', '评估标准',
            '检测规范', '测试', '验证'
        ],
        'description': '密码产品与系统检测评估'
    },
    '密码标准与规范': {
        'keywords': [
            'gb/t', 'gmt', 'gb', '标准', '规范',
            '国标', '行标', '标准体系',
            '技术规范', '管理规范', '实施指南',
            'gm/t', 'gbt', '密码标准',
            'iso', 'iec', 'rfc', '标准文件'
        ],
        'description': '密码相关标准与规范'
    },
    '密码管理与监督': {
        'keywords': [
            '密码管理', '管理', '监督', '监管',
            '行政管理', '行业管理', '监督管理',
            '密码工作', '领导责任', '管理体制',
            '管理策略', '管理制度', '管理要求',
            '人员管理', '培训', '考核', '监督检查'
        ],
        'description': '密码工作管理与监督'
    },
    '综合与基础': {
        'keywords': [
            '基础', '概述', '介绍', '基本概念',
            '发展历程', '发展趋势', '技术体系',
            '总体要求', '基本原则', '总体架构',
            '综合', '其他', '通用'
        ],
        'description': '综合基础与概述'
    }
}

def classify_question_law(question_text, options_text="", knowledge_point=""):
    """根据法律法规内容分类"""
    text = (str(question_text) + " " + str(options_text) + " " + str(knowledge_point)).lower()

    # 计算每个大类的匹配分数
    scores = {}
    for category, config in LAW_CATEGORIES.items():
        score = 0
        for keyword in config['keywords']:
            if keyword.lower() in text:
                # 高优先级关键词（完整法律名称）得分更高
                if len(keyword) > 8:  # 较长的关键词通常是完整名称
                    score += 3
                else:
                    score += 1
        scores[category] = score

    # 获取最高分的分类
    max_score = max(scores.values())
    if max_score == 0:
        return '其他'  # 无法分类

    # 返回得分最高的分类
    return max(scores, key=scores.get)

def classify_question_tech(question_text, options_text="", knowledge_point=""):
    """根据技术领域分类"""
    text = (str(question_text) + " " + str(options_text) + " " + str(knowledge_point)).lower()

    # 计算每个技术类别的匹配分数
    scores = {}
    for category, config in TECH_CATEGORIES.items():
        score = 0
        for keyword in config['keywords']:
            if keyword.lower() in text:
                score += 1
        scores[category] = score

    # 获取最高分的分类
    max_score = max(scores.values())
    if max_score == 0:
        return '综合与基础'  # 默认分类

    # 如果有多个类别得分相同且最高，优先选择更具体的分类
    max_categories = [cat for cat, score in scores.items() if score == max_score]

    # 优先级顺序（从具体到一般）
    priority_order = [
        '密码算法', '密钥管理', '密码协议', 'PKI与证书',
        '密码产品', '密码应用', '密码检测与评估',
        '密码标准与规范', '密码管理与监督', '综合与基础'
    ]

    for cat in priority_order:
        if cat in max_categories:
            return cat

    return max_categories[0]

def reclassify_all_questions():
    """重新分类所有题目"""
    try:
        print("=" * 80)
        print("开始智能重新分类")
        print("=" * 80)

        # 连接数据库
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()

        # 获取所有题目
        print("\n读取题目...")
        cursor.execute("SELECT id, question_text, option_a, option_b, option_c, option_d, knowledge_point FROM questions")
        questions = cursor.fetchall()
        print(f"✓ 读取到 {len(questions)} 道题目")

        # 统计信息
        law_stats = {}
        tech_stats = {}
        combined_stats = {}
        updated = 0

        print("\n开始分类...")

        for q_id, q_text, opt_a, opt_b, opt_c, opt_d, knowledge in questions:
            # 组合选项文本
            options = f"{opt_a or ''} {opt_b or ''} {opt_c or ''} {opt_d or ''}"

            # 分类
            law_cat = classify_question_law(q_text, options, knowledge)
            tech_cat = classify_question_tech(q_text, options, knowledge)

            # 更新数据库
            cursor.execute("""
                UPDATE questions
                SET law_category = %s, tech_category = %s
                WHERE id = %s
            """, (law_cat, tech_cat, q_id))

            updated += 1

            # 统计
            law_stats[law_cat] = law_stats.get(law_cat, 0) + 1
            tech_stats[tech_cat] = tech_stats.get(tech_cat, 0) + 1

            combined = f"{law_cat} > {tech_cat}"
            combined_stats[combined] = combined_stats.get(combined, 0) + 1

            # 每500条提交一次
            if updated % 500 == 0:
                conn.commit()
                print(f"  已处理 {updated}/{len(questions)} 题...")

        # 最终提交
        conn.commit()

        # 显示统计结果
        print(f"\n{'=' * 80}")
        print("分类完成！")
        print(f"{'=' * 80}")
        print(f"✅ 成功处理: {updated} 题")

        print(f"\n📚 法律法规大类分布:")
        for cat, count in sorted(law_stats.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / updated * 100) if updated > 0 else 0
            print(f"   {cat}: {count} 题 ({percentage:.1f}%)")

        print(f"\n🔧 技术专业类别分布:")
        for cat, count in sorted(tech_stats.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / updated * 100) if updated > 0 else 0
            print(f"   {cat}: {count} 题 ({percentage:.1f}%)")

        print(f"\n📊 主要组合分类 (Top 15):")
        sorted_combined = sorted(combined_stats.items(), key=lambda x: x[1], reverse=True)[:15]
        for combo, count in sorted_combined:
            percentage = (count / updated * 100) if updated > 0 else 0
            print(f"   {combo}: {count} 题 ({percentage:.1f}%)")

        conn.close()
        print(f"\n✅ 分类完成！")

    except Exception as e:
        print(f"❌ 分类失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reclassify_all_questions()
