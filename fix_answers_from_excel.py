#!/usr/bin/env python3
"""
密评备考系统 - 答案一致性修复工具
从Excel题库批量更新数据库中的答案
"""
import openpyxl
import psycopg2
import psycopg2.extras
from datetime import datetime
import json
import sys

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'port': 15432,
    'database': 'exam_db',
    'user': 'exam_user',
    'password': 'exam_pass123'
}

# Excel文件路径
EXCEL_FILE = '/app/商用密码应用安全性评估从业人员考核题库-参考答案.xlsx'

class AnswerFixer:
    def __init__(self):
        self.excel_answers = {}
        self.db_answers = {}
        self.mismatches = []
        self.conn = None

    def connect_db(self):
        """连接数据库"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            print("✓ 数据库连接成功")
            return True
        except Exception as e:
            print(f"✗ 数据库连接失败: {e}")
            return False

    def load_excel_answers(self):
        """从Excel加载答案"""
        print(f"\n正在读取Excel文件: {EXCEL_FILE}")
        wb = openpyxl.load_workbook(EXCEL_FILE, read_only=True)
        sheet = wb.active

        count = 0
        for row_idx, row in enumerate(sheet.iter_rows(min_row=3, values_only=True), 3):
            seq_no = row[0]  # 序号列
            answer = row[7] if len(row) > 7 else None  # 答案列

            if seq_no and answer:
                try:
                    seq_no = int(float(seq_no))
                    answer_str = str(answer).strip().upper()
                    # 验证答案格式
                    if self._validate_answer(answer_str):
                        self.excel_answers[seq_no] = answer_str
                        count += 1
                except (ValueError, TypeError):
                    pass

            if row_idx % 500 == 0:
                print(f"  已处理 {row_idx} 行...")

        wb.close()
        print(f"✓ Excel加载完成: {count} 道题目")
        return count > 0

    def load_db_answers(self):
        """从数据库加载答案"""
        print("\n正在从数据库加载答案...")
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("SELECT id, question_no, correct_answer FROM questions ORDER BY question_no::int")
        rows = cur.fetchall()

        for row in rows:
            try:
                q_no = int(row['question_no'])
                self.db_answers[q_no] = {
                    'id': row['id'],
                    'answer': row['correct_answer'].strip().upper()
                }
            except (ValueError, TypeError):
                pass

        cur.close()
        print(f"✓ 数据库加载完成: {len(self.db_answers)} 道题目")
        return len(self.db_answers) > 0

    def _validate_answer(self, answer):
        """验证答案格式是否有效"""
        if not answer:
            return False

        # 标准化答案
        normalized = answer.replace(' ', '').replace('\t', '').replace('、', '').replace('，', '')

        # 检查字符是否都在A-D范围内
        if not all(c in 'ABCD' for c in normalized):
            return False

        # 检查是否有重复字符（如BCDBC）
        if len(set(normalized)) != len(normalized):
            return False

        # 长度检查（单选1个字符，多选2-4个字符）
        if len(normalized) < 1 or len(normalized) > 4:
            return False

        return True

    def normalize_answer(self, answer):
        """标准化答案"""
        if not answer:
            return ''
        # 排序多选答案（如ACD -> ACD）
        return ''.join(sorted(answer.replace(' ', '').replace('\t', '')))

    def compare_answers(self):
        """对比答案"""
        print("\n正在对比答案...")

        for q_no in self.excel_answers:
            if q_no in self.db_answers:
                excel_ans = self.normalize_answer(self.excel_answers[q_no])
                db_ans = self.normalize_answer(self.db_answers[q_no]['answer'])

                if excel_ans != db_ans:
                    self.mismatches.append({
                        'question_no': q_no,
                        'db_id': self.db_answers[q_no]['id'],
                        'excel_answer': self.excel_answers[q_no],
                        'db_answer': self.db_answers[q_no]['answer'],
                        'excel_normalized': excel_ans,
                        'db_normalized': db_ans
                    })

        matched = len(self.excel_answers) - len(self.mismatches)
        consistency = (matched / len(self.excel_answers) * 100) if self.excel_answers else 0

        print(f"\n对比结果:")
        print(f"  Excel题库总数: {len(self.excel_answers)}")
        print(f"  数据库题库总数: {len(self.db_answers)}")
        print(f"  答案一致: {matched} 题")
        print(f"  答案不一致: {len(self.mismatches)} 题")
        print(f"  一致率: {consistency:.2f}%")

        return len(self.mismatches) > 0

    def show_mismatches(self, limit=50):
        """显示不一致的题目"""
        if not self.mismatches:
            print("\n✓ 所有答案一致，无需修复")
            return

        print(f"\n前{min(limit, len(self.mismatches))}道不一致的题目:")
        print("-" * 80)
        print(f"{'序号':<8}{'数据库答案':<15}{'Excel答案':<15}")
        print("-" * 80)

        for m in self.mismatches[:limit]:
            print(f"{m['question_no']:<8}{m['db_answer']:<15}{m['excel_answer']:<15}")

    def backup_before_fix(self):
        """修复前备份"""
        print("\n正在创建备份...")
        cur = self.conn.cursor()

        # 创建备份表
        cur.execute("""
            DROP TABLE IF EXISTS questions_answer_backup_20260331;
            CREATE TABLE questions_answer_backup_20260331 AS
            SELECT id, question_no, correct_answer, NOW() as backup_time
            FROM questions;
        """)
        self.conn.commit()

        # 导出备份文件
        cur.execute("COPY (SELECT id, question_no, correct_answer FROM questions ORDER BY id) TO '/tmp/answers_backup_before_fix.csv' WITH CSV;")
        self.conn.commit()

        cur.close()
        print("✓ 备份完成 (备份表: questions_answer_backup_20260331)")
        print("✓ 备份文件: /tmp/answers_backup_before_fix.csv")
        return True

    def fix_answers(self):
        """修复不正确的答案"""
        if not self.mismatches:
            print("\n没有需要修复的答案")
            return True

        print(f"\n准备修复 {len(self.mismatches)} 道题目的答案...")
        confirm = input("确认执行修复? (输入 'yes' 确认): ")

        if confirm.lower() != 'yes':
            print("取消修复操作")
            return False

        cur = self.conn.cursor()

        # 创建修复日志表
        cur.execute("""
            CREATE TABLE IF NOT EXISTS answer_fix_log (
                id SERIAL PRIMARY KEY,
                question_id INTEGER,
                question_no VARCHAR(50),
                old_answer VARCHAR(50),
                new_answer VARCHAR(50),
                fixed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 执行修复
        fixed_count = 0
        for m in self.mismatches:
            try:
                # 更新答案
                cur.execute("""
                    UPDATE questions
                    SET correct_answer = %s
                    WHERE id = %s
                """, (m['excel_answer'], m['db_id']))

                # 记录日志
                cur.execute("""
                    INSERT INTO answer_fix_log (question_id, question_no, old_answer, new_answer)
                    VALUES (%s, %s, %s, %s)
                """, (m['db_id'], str(m['question_no']), m['db_answer'], m['excel_answer']))

                fixed_count += 1

                if fixed_count % 100 == 0:
                    self.conn.commit()
                    print(f"  已修复 {fixed_count}/{len(self.mismatches)}...")

            except Exception as e:
                print(f"  ✗ 修复题目{m['question_no']}失败: {e}")
                self.conn.rollback()

        self.conn.commit()
        cur.close()

        print(f"\n✓ 修复完成: {fixed_count}/{len(self.mismatches)} 道题目")
        return True

    def export_report(self):
        """导出修复报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'statistics': {
                'total_questions': len(self.excel_answers),
                'mismatches': len(self.mismatches),
                'consistency_rate': f"{(1 - len(self.mismatches)/len(self.excel_answers))*100:.2f}%"
            },
            'mismatches': self.mismatches
        }

        report_file = f"/tmp/answer_fix_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"\n✓ 修复报告已保存: {report_file}")
        return report_file

    def run(self):
        """执行完整修复流程"""
        print("="*60)
        print("密评备考系统 - 答案一致性修复工具")
        print("="*60)

        # 1. 连接数据库
        if not self.connect_db():
            return False

        # 2. 加载数据
        if not self.load_excel_answers():
            print("✗ Excel加载失败")
            return False

        if not self.load_db_answers():
            print("✗ 数据库加载失败")
            return False

        # 3. 对比答案
        has_mismatches = self.compare_answers()

        if has_mismatches:
            # 4. 显示不一致
            self.show_mismatches()

            # 5. 备份
            self.backup_before_fix()

            # 6. 执行修复
            self.fix_answers()

            # 7. 导出报告
            self.export_report()
        else:
            print("\n✓ 所有答案一致，无需修复")

        # 清理
        if self.conn:
            self.conn.close()
            print("\n✓ 数据库连接已关闭")

        return True


def main():
    fixer = AnswerFixer()
    success = fixer.run()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
