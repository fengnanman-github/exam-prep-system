  #!/bin/bash
  set -e
  FILE="frontend/src/components/PracticeMode.vue"
  cp "$FILE" "$FILE.backup-$(date +%Y%m%d-%H%M%S)"

  python3 << 'PYEOF'
  import re
  with open("frontend/src/components/PracticeMode.vue", 'r', encoding='utf-8') as f:
      content = f.read()

  # 删除第一个重复方法
  content = re.sub(r'\tasync loadQuestion\(\) \{[^}]*?resetHint\(\)[^}]*?\},\n\n\t// 多选题：切换选项', '\t\t// 多选题：切换选项', content, flags=re.DOTALL)

  # 删除第二个重复方法
  content = re.sub(r'\tasync loadQuestion\(\) \{[^}]*?this\.noNewQuestions = true[^}]*?\}\t\t\},\n\n\t// 提示功能', '\t\t// 提示功能', content, flags=re.DOTALL)

  # 添加笔记状态重置
  content = re.sub(r'(this\.loading = false\n\t\t),', r'\1\n\n\t\t// 重置笔记状态\n\t\tthis.currentNote = \'\'\n\t\tthis.showNoteInput = false', content)

  # 添加完整状态重置
  content = re.sub(r'(// 重置答案状态\n\t\tthis\.userAnswer = null\n\t\tthis\.selectedOptions = \[\]\n\t\t)this\.resetHint\(\)\n\n\t\t//
  重置笔记状态（不在加载时自动获取笔记）', r'\1this.selectedAnswer = null\n\t\tthis.isCorrect = false\n\t\tthis.explanation = \'\'\n\n\t\t//
  重置提示状态\n\t\tthis.hintLevel = 0\n\t\tthis.hintData = null\n\t\tthis.showHint = false\n\n\t\tthis.resetHint()\n\n\t\t// 重置笔记状态', content)

  with open("frontend/src/components/PracticeMode.vue", 'w', encoding='utf-8') as f:
      f.write(content)
  print("✓ 修复已应用")
  PYEOF

  echo "✓ 验证修复..."
  grep -q "重置笔记状态" frontend/src/components/PracticeMode.vue && echo "✓ 笔记状态重置已添加"
  grep -q "this.selectedAnswer = null" frontend/src/components/PracticeMode.vue && echo "✓ 完整状态重置已添加"
  [ $(grep -c "async loadQuestion()" frontend/src/components/PracticeMode.vue) -eq 1 ] && echo "✓ 重复方法已删除"

  echo "🚀 重建前端..."
  docker-compose up -d --build frontend
  echo "✓ 修复完成！访问 http://localhost:18080 测试"

