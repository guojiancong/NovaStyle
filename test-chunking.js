// 测试智能分块功能
import { chunkText } from './aiService.js';
import { readFileSync } from 'fs';

console.log('🧪 NovaStyle v2.0 智能分块测试\n');

// 读取测试文件
const testText = readFileSync('./test-input.txt', 'utf-8');
console.log(`📄 原始文本长度：${testText.length} 字`);

// 智能分块
const chunks = chunkText(testText, 2000);
console.log(`\n📦 分块结果：${chunks.length} 块`);

chunks.forEach((chunk, i) => {
  const firstLine = chunk.split('\n')[0];
  console.log(`   块 ${i + 1}: ${chunk.length} 字 - 开头："${firstLine.slice(0, 30)}..."`);
});

// 统计
const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
const avgChunkSize = Math.round(totalChars / chunks.length);
console.log(`\n📊 统计:`);
console.log(`   总字数：${totalChars}`);
console.log(`   平均块大小：${avgChunkSize} 字`);
console.log(`   最小块：${Math.min(...chunks.map(c => c.length))} 字`);
console.log(`   最大块：${Math.max(...chunks.map(c => c.length))} 字`);

console.log('\n✅ 测试完成！');
