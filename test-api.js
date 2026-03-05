// API 功能测试脚本
import { rewriteTextChunk } from './aiService.js';
import { ProviderType } from './types.js';

const TEST_API_KEY = 'sk-TXMpVEGrgsJxQFyAKcB5C36ljopOXkIsyupT2T8qRsG5UULy';
const TEST_BASE_URL = 'https://api.chatanywhere.tech/v1';
const TEST_MODEL = 'deepseek-chat';

console.log('🧪 NovaStyle API 功能测试\n');
console.log('📡 API 地址:', TEST_BASE_URL);
console.log('🔑 API Key:', TEST_API_KEY.slice(0, 10) + '...\n');

// 测试文本
const testText = `第一章 初出茅庐

李明站在山脚下，望着眼前的青云山，心中充满了期待。这是他第一次独自外出历练。

"徒儿，此去青云山，路途遥远，你要记住，遇事不要冲动。"师父的话还在耳边回响。

李明深吸一口气，踏上了山间小路。路边的野花开得正艳，鸟儿在枝头欢快地歌唱。`;

const stylePrompt = '金庸武侠风格：半文半白的雅致叙事，用词考究，富有古典文学底蕴。注重武学招式的意境描写。';

async function testAPI() {
  try {
    console.log('📝 测试文本:', testText.slice(0, 50) + '...\n');
    console.log('🎨 风格:', '金庸武侠\n');
    console.log('⏳ 开始转换...\n');

    let result = '';
    const startTime = Date.now();

    await rewriteTextChunk(
      testText,
      stylePrompt,
      ProviderType.OPENAI_COMPATIBLE,
      TEST_MODEL,
      {
        id: 'test',
        label: 'Test Model',
        baseUrl: TEST_BASE_URL,
        modelName: TEST_MODEL,
        apiKey: TEST_API_KEY
      },
      (chunk) => {
        process.stdout.write(chunk);
        result += chunk;
      }
    );

    const elapsed = Date.now() - startTime;
    console.log('\n\n✅ 转换完成！');
    console.log(`⏱️  耗时：${(elapsed / 1000).toFixed(2)}秒`);
    console.log(`📊 输出长度：${result.length}字`);
    console.log(`💰 预估 Token: 输入~${Math.round(testText.length * 0.5)}, 输出~${Math.round(result.length * 0.5)}`);
    console.log(`💵 预估费用：¥${((testText.length * 0.5 + result.length * 0.5) * 0.002 / 1000).toFixed(6)}\n`);

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('请检查:');
    console.error('1. API Key 是否有效');
    console.error('2. 网络连接是否正常');
    console.error('3. API 地址是否正确');
  }
}

testAPI();
