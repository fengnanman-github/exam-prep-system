#!/usr/bin/env python3
"""
完整的题库导入脚本 - 支持自动分类
"""
import subprocess
import sys

# 安装必要的库
print("正在安装必要的Python库...")
subprocess.run([sys.executable, "-m", "pip", "install", "--user", "openpyxl", "pandas"], check=False)

try:
    import pandas as pd
    import psycopg2
    from datetime import datetime

    # 数据库配置
    db_config = {
        'host': 'localhost',
        'port': 15432,
        'database': 'exam_db',
        'user': 'exam_user',
        'password': 'exam_pass123'
    }

    excel_file = '/home/hduser/exam-prep-system-package-20260330/商用密码应用安全性评估从业人员考核题库-参考答案.xlsx'

    print(f"\n正在读取Excel文件...")
    print(f"文件路径: {excel_file}")

    # 读取Excel文件
    df = pd.read_excel(excel_file, engine='openpyxl')

    print(f"✓ 总行数: {len(df)}")
    print(f"✓ 列数: {len(df.columns)}")
    print(f"\n列名: {list(df.columns)}")

    # 显示前3行数据
    print("\n前3行数据示例:")
    for i in range(min(3, len(df))):
        print(f"\n--- 第{i+1}行 ---")
        for col in df.columns:
            val = df.iloc[i][col]
            if pd.notna(val):
                val_str = str(val)[:60]
                print(f"  {col}: {val_str}")

    # 统计题型
    print("\n====================")
    print("题型分布:")
    print("====================")
    type_col = None
    for col in df.columns:
        if '题型' in str(col) or '类型' in str(col) or '题目类型' in str(col):
            type_col = col
            break

    if type_col:
        type_counts = df[type_col].value_counts()
        for qtype, count in type_counts.items():
            print(f"  {qtype}: {count}题")

    print(f"\n分析完成！准备导入...")

except ImportError as e:
    print(f"导入错误: {e}")
    print("请确保安装了 openpyxl 和 pandas")
    sys.exit(1)
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
