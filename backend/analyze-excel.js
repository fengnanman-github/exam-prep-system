const XLSX = require('xlsx');
const path = require('path');

console.log('正在读取Excel文件...\n');

try {
  const filePath = '/home/hduser/exam-prep-system-package-20260330/商用密码应用安全性评估从业人员考核题库-参考答案.xlsx';
  const workbook = XLSX.readFile(filePath);

  console.log('工作表列表:');
  workbook.SheetNames.forEach((name, index) => {
    console.log(`  ${index + 1}. ${name}`);
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log(`\n使用工作表: ${sheetName}`);
  console.log(`总行数: ${XLSX.utils.sheet_to_json(worksheet, { header: 1 }).length}`);

  // 读取为JSON格式（前20行）
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('\n表头信息:');
  if (data.length > 0) {
    const headers = data[0];
    headers.forEach((h, i) => {
      if (h) console.log(`  列${i + 1}: ${h}`);
    });
  }

  console.log('\n前5行数据示例:');
  for (let i = 1; i < Math.min(6, data.length); i++) {
    console.log(`\n【第${i + 1}行】`);
    const row = data[i];
    row.forEach((cell, colIndex) => {
      if (cell !== undefined && cell !== null && cell !== '') {
        const header = data[0][colIndex] || `列${colIndex + 1}`;
        const value = String(cell).substring(0, 80);
        console.log(`  ${header}: ${value}`);
      }
    });
  }

  // 统计题型（只分析前500行以快速查看结构）
  console.log('\n====================');
  console.log('题型统计（样本）:');
  console.log('====================');
  const typeCount = {};
  const typeColumnIndex = data[0].findIndex(h => h && (h.includes('题型') || h.includes('类型')));

  const sampleSize = Math.min(data.length, 501);
  for (let i = 1; i < sampleSize; i++) {
    const row = data[i];
    if (row && row[typeColumnIndex]) {
      const type = String(row[typeColumnIndex]).trim();
      typeCount[type] = (typeCount[type] || 0) + 1;
    }
  }

  Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}题`);
    });

  console.log(`\n总题目数: ${data.length - 1}`);

} catch (error) {
  console.error('读取Excel文件失败:', error.message);
  process.exit(1);
}
