/**
 * 测试中文数字转换功能
 */
const asrService = require('./asrService');

// 测试用例
const testCases = [
  { input: '六', expected: '6' },
  { input: '一千', expected: '1000' },
  { input: '十', expected: '10' },
  { input: '二十三', expected: '23' },
  { input: '一百', expected: '100' },
  { input: '五百六十七', expected: '567' },
  { input: '一千二百三十四', expected: '1234' },
  { input: '三万', expected: '30000' },
  { input: '十万', expected: '100000' },
  { input: '一亿', expected: '100000000' },
  { input: '我有六个苹果', expected: '我有6个苹果' },
  { input: '一千个人', expected: '1000个人' },
  { input: '第二十三章', expected: '第23章' },
  { input: '混合文本abc', expected: '混合文本abc' },
  // 新增：连续单个数字测试
  { input: '六六六', expected: '666' },
  { input: '一二三', expected: '123' },
  { input: '九九九', expected: '999' },
  { input: '零零七', expected: '007' },
  { input: '一二三四五', expected: '12345' },
  { input: '房间号六六六', expected: '房间号666' },
  { input: '密码是一二三四', expected: '密码是1234' },
  // 对比：复杂数字表达式（应该保持原有功能）
  { input: '六百六十六', expected: '666' },
  { input: '一千二百三十四', expected: '1234' }
];

console.log('开始测试中文数字转换功能...\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  const result = asrService.convertChineseNumbersToDigits(testCase.input);
  const passed = result === testCase.expected;

  if (passed) {
    passCount++;
    console.log(`✓ 测试 ${index + 1} 通过`);
  } else {
    failCount++;
    console.log(`✗ 测试 ${index + 1} 失败`);
  }

  console.log(`  输入: "${testCase.input}"`);
  console.log(`  期望: "${testCase.expected}"`);
  console.log(`  实际: "${result}"`);
  console.log('');
});

console.log('='.repeat(50));
console.log(`测试完成: ${passCount} 通过, ${failCount} 失败`);
console.log('='.repeat(50));
