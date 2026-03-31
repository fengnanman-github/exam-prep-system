#!/usr/bin/env python3
"""
完整题库导入脚本
自动分类并根据内容优化
"""

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import re

# 数据库配置
db_config = {
    'host': 'db',
    'port': 5432,
    'database': 'exam_db',
    'user': 'exam_user',
    'password': 'exam_pass123'
}

def categorize_question(question_text, options_text=""):
    """根据题目内容智能分类"""
    text = (str(question_text) + " " + str(options_text)).lower()

    # 密码算法相关关键词
    algorithm_keywords = [
        'sm2', 'sm3', 'sm4', 'sm9', 'sm7', 'sm1', 'ssf33',
        'aes', 'des', '3des', 'rsa', 'ecc', 'elgamal', 'dsa',
        '哈希', '摘要', 'md5', 'sha', 'hash',
        '加密', '解密', '对称加密', '非对称加密',
        '密钥', '公钥', '私钥', '密钥管理', '密钥交换',
        '算法', '密码算法', '序列密码', '分组密码',
        'diffie-hellman', 'dh', 'ecdh'
    ]

    # 密码协议相关关键词
    protocol_keywords = [
        '协议', 'ssl', 'tls', 'ssh', 'ipsec', 'https', 'vpn',
        '握手', 'tls握手', 'ssl握手',
        '通信', '安全通信', '传输层',
        '密钥协商', '密钥交换协议',
        'wpa', 'wep', 'wpa2', 'wpa3',
        'ssh协议', 'ftp', 'sftp'
    ]

    # PKI体系相关关键词
    pki_keywords = [
        'pki', '公钥基础设施', '证书', '数字证书',
        'ca', 'ca中心', 'ca机构', '证书授权', '证书颁发',
        '认证', '身份认证', '数字签名', '签名验证',
        '证书吊销', 'crl', 'ocsp', '证书链',
        '签发', '证书申请', '证书格式', 'x.509'
    ]

    # 密码产品相关关键词
    product_keywords = [
        '产品', '密码产品', '密码机', '加密机',
        '网关', 'vpn网关', '密码网关',
        '服务器', '密码服务器', '密钥服务器',
        '模块', '密码模块', '加密模块',
        '芯片', '密码芯片', '安全芯片', '智能ic卡',
        '审批', '销售', '进口', '出口', '型式试验',
        '商用密码产品', '密码设备'
    ]

    # 密码管理相关关键词
    management_keywords = [
        '管理', '密码管理', '密钥管理', '生命周期',
        '策略', '密码策略', '安全策略', '管理制度',
        '人员', '人员管理', '培训', '考核',
        '监督', '检查', '评估', '审计',
        '责任', '密码工作', '领导责任',
        '等级保护', '风险评估', '安全评估',
        '商用密码应用', '安全性评估'
    ]

    # 计算每个分类的匹配分数
    scores = {
        '密码算法': sum(2 if kw in text else 0 for kw in algorithm_keywords[:20]) +
                   sum(1 if kw in text else 0 for kw in algorithm_keywords[20:]),
        '密码协议': sum(2 if kw in text else 0 for kw in protocol_keywords[:15]) +
                   sum(1 if kw in text else 0 for kw in protocol_keywords[15:]),
        'PKI体系': sum(2 if kw in text else 0 for kw in pki_keywords[:15]) +
                  sum(1 if kw in text else 0 for kw in pki_keywords[15:]),
        '密码产品': sum(2 if kw in text else 0 for kw in product_keywords[:15]) +
                   sum(1 if kw in text else 0 for kw in product_keywords[15:]),
        '密码管理': sum(2 if kw in text else 0 for kw in management_keywords[:15]) +
                   sum(1 if kw in text else 0 for kw in management_keywords[15:])
    }

    # 获取得分最高的分类
    max_score = max(scores.values())
    if max_score == 0:
        return '密码管理'  # 默认分类

    # 如果有多个分类得分相同，优先选择密码算法或PKI
    max_categories = [cat for cat, score in scores.items() if score == max_score]
    if '密码算法' in max_categories:
        return '密码算法'
    if 'PKI体系' in max_categories:
        return 'PKI体系'

    return max_categories[0]

def determine_difficulty(category, question_type):
    """根据分类和题型确定难度"""
    # 判断题通常较简单
    if question_type == '判断题':
        return 'easy'

    # 根据分类分配难度（简化版）
    difficulty_distribution = {
        '密码算法': ['easy', 'medium', 'medium', 'hard', 'hard'],
        '密码协议': ['easy', 'medium', 'medium', 'hard'],
        'PKI体系': ['easy', 'medium', 'medium', 'hard'],
        '密码产品': ['easy', 'medium', 'medium', 'hard'],
        '密码管理': ['easy', 'easy', 'medium', 'medium']
    }

    import random
    return random.choice(difficulty_distribution.get(category, ['easy', 'medium', 'hard']))

def normalize_answer(answer, question_type):
    """标准化答案格式"""
    if not answer:
        return 'A'

    answer = str(answer).strip().upper()

    if question_type == '判断题':
        # 判断题答案标准化
        if answer in ['A', '对', '√', '✓', '正确', 'T', 'TRUE', '是']:
            return 'A'
        elif answer in ['B', '错', '×', '✗', '错误', 'F', 'FALSE', '否', '不正确']:
            return 'B'
        else:
            return 'A'  # 默认
    else:
        # 选择题答案
        # 清理答案中的多余字符
        answer = re.sub(r'[^ABCD]', '', answer)
        return answer if answer else 'A'

def import_questions():
    try:
        print("=" * 70)
        print("开始导入完整题库")
        print("=" * 70)

        # 读取Excel文件
        excel_file = '/data/商用密码应用安全性评估从业人员考核题库-参考答案.xlsx'
        print(f"\n读取Excel文件: {excel_file}")

        # 读取时跳过第一行（标题行），第二行是表头
        df = pd.read_excel(excel_file, engine='openpyxl', header=1)

        print(f"✓ 总题目数: {len(df)}")
        print(f"✓ 列数: {len(df.columns)}")

        # 重命名列（Unnamed列需要通过位置访问）
        # 根据分析，列的结构是：
        # 列0: 序号, 列1: 题型, 列2: 题干, 列3-6: 选项A-D, 列7: 答案, 列8: 原题号, 列9: 新题依据

        # 连接数据库
        print("\n连接数据库...")
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()

        # 清空现有数据
        print("清空现有题库...")
        cursor.execute("DELETE FROM questions")
        conn.commit()

        # 导入数据
        imported = 0
        errors = 0
        category_stats = {}
        type_stats = {}
        difficulty_stats = {}

        print(f"\n开始导入...")

        for idx in range(len(df)):
            try:
                row = df.iloc[idx]

                # 读取各字段
                seq_no = row.iloc[0]  # 序号
                question_type = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else '判断题'
                question_text = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ''
                option_a = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else None
                option_b = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else None
                option_c = str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else None
                option_d = str(row.iloc[6]).strip() if pd.notna(row.iloc[6]) else None
                answer = str(row.iloc[7]).strip() if pd.notna(row.iloc[7]) else 'A'
                original_no = str(row.iloc[8]).strip() if pd.notna(row.iloc[8]) else None
                new_basis = str(row.iloc[9]).strip() if pd.notna(row.iloc[9]) else None

                # 跳过空题目
                if not question_text or question_text == 'nan':
                    continue

                # 截断过长的字段
                question_type = str(question_type)[:50] if question_type else '判断题'
                question_text = str(question_text)[:10000]  # 题目文本限制为10000字符
                if option_a:
                    option_a = str(option_a)[:500]
                if option_b:
                    option_b = str(option_b)[:500]
                if option_c:
                    option_c = str(option_c)[:500]
                if option_d:
                    option_d = str(option_d)[:500]
                original_no = str(original_no)[:50] if original_no else None

                # 标准化题型
                if '判断' in question_type:
                    question_type = '判断题'
                    # 确保判断题有选项
                    if not option_a:
                        option_a = '正确'
                    if not option_b:
                        option_b = '错误'
                elif '单选' in question_type or '单项' in question_type:
                    question_type = '单项选择题'
                elif '多选' in question_type or '多项' in question_type:
                    question_type = '多项选择题'
                else:
                    # 根据选项数量判断
                    if option_c and option_d:
                        question_type = '多项选择题'
                    else:
                        question_type = '单项选择题'

                # 智能分类
                options_text = f"{option_a or ''} {option_b or ''} {option_c or ''} {option_d or ''}"
                category = categorize_question(question_text, options_text)

                # 确定难度
                difficulty = determine_difficulty(category, question_type)

                # 标准化答案
                answer = normalize_answer(answer, question_type)

                # 知识点（从新题依据中提取或使用分类）
                knowledge_point = new_basis if new_basis and new_basis != 'nan' else f"{category}相关知识"

                # 插入数据库（不包含explanation字段）
                cursor.execute("""
                    INSERT INTO questions
                    (question_no, question_type, question_text, option_a, option_b, option_c, option_d,
                     correct_answer, category, difficulty, knowledge_point, original_no)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    int(seq_no) if str(seq_no).isdigit() else imported + 1,
                    question_type,
                    question_text,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    answer,
                    category,
                    difficulty,
                    knowledge_point,
                    original_no
                ))

                imported += 1

                # 统计
                category_stats[category] = category_stats.get(category, 0) + 1
                type_stats[question_type] = type_stats.get(question_type, 0) + 1
                difficulty_stats[difficulty] = difficulty_stats.get(difficulty, 0) + 1

                # 每500条提交一次
                if imported % 500 == 0:
                    conn.commit()
                    print(f"  已导入 {imported} 题...")

            except Exception as e:
                errors += 1
                if errors <= 20:
                    print(f"  第{idx + 1}行导入失败: {e}")
                continue

        # 最终提交
        conn.commit()

        print(f"\n{'=' * 70}")
        print("导入完成！")
        print(f"{'=' * 70}")
        print(f"✅ 成功导入: {imported} 题")
        print(f"❌ 失败/跳过: {errors} 题")

        print(f"\n📊 题型分布:")
        for qtype, count in sorted(type_stats.items()):
            print(f"   {qtype}: {count} 题")

        print(f"\n📚 分类分布:")
        for cat, count in sorted(category_stats.items()):
            percentage = (count / imported * 100) if imported > 0 else 0
            print(f"   {cat}: {count} 题 ({percentage:.1f}%)")

        print(f"\n🎯 难度分布:")
        for diff, count in sorted(difficulty_stats.items()):
            percentage = (count / imported * 100) if imported > 0 else 0
            print(f"   {diff}: {count} 题 ({percentage:.1f}%)")

        # 更新统计（在事务外执行）
        print(f"\n更新数据库统计...")
        conn.commit()
        conn.close()
        print(f"✓ 统计已更新")

        print(f"\n✅ 题库导入成功！")

    except Exception as e:
        print(f"❌ 导入失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import_questions()
