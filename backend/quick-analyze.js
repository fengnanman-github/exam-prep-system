const XLSX = require('xlsx');
const fs = require('fs');

console.log('正在读取Excel文件（前50行）...\n');

try {
  const filePath = '/home/hduser/exam-prep-system-package-20260330/商用密码应用安全性评估从业人员考核题库-参考答案.xlsx';
  const workbook = XLSX.readFile(filePath, { bookRows: false });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 只读取前50行
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  range.e.r = Math.min(range.e.r, 50);  // 限制到第50行

  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    range: range
  });

  console.log(`✓ 总行数: ${XLSX.utils.sheet_to_json(worksheet, { header: 1 }).length}`);
  console.log(`✓ 分析行数: ${data.length}\n`);

  // 表头
  console.log('表头信息:');
  const headers = data[0];
  headers.forEach((h, i) => {
    if (h) console.log(`  列${i + 1}: ${h}`);
  });

  // 数据示例
  console.log('\n前5行数据:');
  for (let i = 1; i < Math.min(6, data.length); i++) {
    console.log(`\n--- 第${i + 1}行 ---`);
    const row = data[i];
    row.forEach((cell, colIndex) => {
      if (cell !== undefined && cell !== null && String(cell).trim()) {
        const header = headers[colIndex] || `列${colIndex + 1}`;
        console.log(`  ${header}: ${String(cell).substring(0, 60)}`);
      }
    });
  }

  // 统计前100行的题型
  const typeColumnIndex = headers.findIndex(h => h && (h.includes('题型') || h.includes('类型') || h.includes('题目类型')));
  console.log(`\n题型列索引: ${typeColumnIndex}`);

  if (typeColumnIndex >= 0) {
    const typeCount = {};
    for (let i = 1; i < Math.min(101, data.length); i++) {
      const type = data[i][typeColumnIndex];
      if (type) {
        typeCount[type] = (typeCount[type] || 0) + 1;
      }
    }
    console.log('\n题型分布（前100行样本）:');
    Object.entries(typeCount).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}题`);
    });
  }

  console.log('\n分析完成！');

} catch (error) {
  console.error('错误:', error.message);
  process.exit(1);
}
