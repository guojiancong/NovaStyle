/**
 * 批量模式模拟测试
 *
 * 测试目标：验证分块 + 并发处理 + 合并后的内容是否与原文完全一致
 *
 * 测试配置：
 * - 分块大小：2000
 * - 并发数：3
 * - 转换方法：原内容完整输出 + 0-10s 随机延时
 * - 期望结果：合并后内容与原文完全一致
 */

import fs from 'fs';

// ============ 从 aiService.ts 复制的分块逻辑（已修复换行符兼容性问题）============

/**
 * 检测文本的换行符类型
 */
function detectLineEnding(text) {
  if (text.includes('\r\n')) {
    return 'crlf';
  }
  return 'lf';
}

/**
 * 检测章节边界
 * 已修复：支持 Windows (\r\n) 和 Unix (\n) 换行符
 */
function detectChapterBoundaries(text) {
  const boundaries = [0];

  // 使用 \r?\n 兼容两种换行符
  const chineseChapterPattern = /(?:^|\r?\n)\s*(第 [一二三四五六七八九十百千万零 0-9]+\s*[章节卷回]|楔子 | 序章 | 前言 | 引言 | 内容简介 | 目录 | 番外 | 后记 | 尾声)/gi;
  const englishChapterPattern = /(?:^|\r?\n)\s*(Chapter\s*\d+|Prologue|Epilogue|Introduction|Preface|Contents|Appendix)/gi;

  let match;
  while ((match = chineseChapterPattern.exec(text)) !== null) {
    boundaries.push(match.index);
  }
  while ((match = englishChapterPattern.exec(text)) !== null) {
    boundaries.push(match.index);
  }

  // 排序并去重
  const sorted = boundaries.sort((a, b) => a - b);
  const unique = sorted.filter((v, i, arr) => i === 0 || v !== arr[i - 1]);
  return unique;
}

/**
 * 寻找最佳分割点
 * 已修复：支持 Windows (\r\n) 和 Unix (\n) 换行符
 * 确保不在段落分隔符中间分割
 */
function findBestSplitPoint(text, targetSize) {
  let splitPos = targetSize;
  const lineEnding = detectLineEnding(text);

  // 1. 优先在段落边界分割（双换行符）
  let bestSplit = -1;

  for (let i = Math.floor(targetSize * 1.2); i >= targetSize * 0.6 && i >= 0; i--) {
    // 检查 \n\n (Unix)
    if (text[i - 1] === '\n' && text[i] === '\n') {
      bestSplit = i;
      break;
    }
    // 检查 \r\n\r\n (Windows) - 完整匹配
    if (lineEnding === 'crlf' && i >= 3 &&
        text[i - 3] === '\r' && text[i - 2] === '\n' &&
        text[i - 1] === '\r' && text[i] === '\n') {
      bestSplit = i + 1;
      break;
    }
  }

  if (bestSplit > 0) {
    return bestSplit;
  }

  // 2. 其次在句子边界分割
  const sentencePattern = /[。！？.!?][\s\r\n]*/g;
  let lastSentenceEnd = -1;
  let match;
  while ((match = sentencePattern.exec(text)) !== null) {
    if (match.index < targetSize * 0.6) continue;
    if (match.index > targetSize * 1.2) break;
    lastSentenceEnd = match.index + match[0].length;
  }

  if (lastSentenceEnd > 0) {
    return lastSentenceEnd;
  }

  // 3. 再次在单行边界分割（避免在段落分隔符中间）
  let newlinePos = -1;
  for (let i = Math.floor(targetSize); i >= targetSize * 0.6 && i >= 0; i--) {
    if (text[i] === '\n') {
      if (lineEnding === 'crlf' && i >= 1 && text[i - 1] === '\r') {
        // 继续向前检查是否有 \r\n\r\n
        if (i >= 3 && text[i - 3] === '\r' && text[i - 2] === '\n') {
          continue; // 跳过，这是段落分隔符的一部分
        }
        newlinePos = i + 1;
        break;
      } else if (lineEnding !== 'crlf' && text[i - 1] !== '\n') {
        newlinePos = i + 1;
        break;
      }
    }
  }

  if (newlinePos > 0) {
    return newlinePos;
  }

  // 4. 最后在标点处分割
  const lastPunctuation = text.slice(0, targetSize).search(/[。！？.!?][^。！？.!?]*$/);
  if (lastPunctuation > targetSize * 0.6) {
    return lastPunctuation + 1;
  }

  return splitPos;
}

/**
 * 细分大章节
 */
function splitLargeChapter(chapter, targetSize) {
  const chunks = [];
  let remaining = chapter;

  while (remaining.length > targetSize) {
    const splitPos = findBestSplitPoint(remaining, targetSize);
    const chunk = remaining.slice(0, splitPos);
    chunks.push(chunk);
    remaining = remaining.slice(splitPos);
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

/**
 * 智能分块策略
 */
function smartChunk(text, targetSize) {
  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= targetSize) {
      chunks.push(remaining);
      remaining = '';
      break;
    }

    const splitPos = findBestSplitPoint(remaining, targetSize);
    const chunk = remaining.slice(0, splitPos);
    chunks.push(chunk);
    remaining = remaining.slice(splitPos);
  }

  return chunks;
}

/**
 * 文本分块函数
 */
function chunkText(text, targetSize = 2000) {
  const chunks = [];

  // 1. 首先检测所有章节边界
  const chapterBoundaries = detectChapterBoundaries(text);

  // 2. 如果章节数量合理，直接按章节分块
  if (chapterBoundaries.length > 1) {
    const chapterChunks = [];
    for (let i = 0; i < chapterBoundaries.length; i++) {
      const start = chapterBoundaries[i];
      const end = i + 1 < chapterBoundaries.length ? chapterBoundaries[i + 1] : text.length;
      const chapter = text.slice(start, end);

      if (chapter.length > targetSize * 1.5) {
        const subChunks = splitLargeChapter(chapter, targetSize);
        chapterChunks.push(...subChunks);
      } else {
        chapterChunks.push(chapter);
      }
    }

    return chapterChunks;
  }

  // 3. 回退到智能分块策略
  return smartChunk(text, targetSize);
}

/**
 * 智能合并分块结果
 * 新增：自动检测并处理分块边界的换行符
 */
function smartJoinChunks(chunks) {
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0];

  const lineEnding = detectLineEnding(chunks[0]);
  const paragraphSeparator = lineEnding === 'crlf' ? '\r\n\r\n' : '\n\n';
  const singleNewline = lineEnding === 'crlf' ? '\r\n' : '\n';

  const result = [];

  for (let i = 0; i < chunks.length; i++) {
    const currentChunk = chunks[i];

    if (i === 0) {
      // 第一个分块：移除末尾可能多余的段落分隔符
      if (currentChunk.endsWith(paragraphSeparator)) {
        result.push(currentChunk.slice(0, -paragraphSeparator.length));
      } else {
        result.push(currentChunk);
      }
    } else {
      const prevChunk = result[result.length - 1];
      let chunkToAdd = currentChunk;

      // 如果当前块开头有段落分隔符或单行换行符，移除它们
      if (currentChunk.startsWith(paragraphSeparator)) {
        chunkToAdd = currentChunk.slice(paragraphSeparator.length);
      } else if (currentChunk.startsWith(singleNewline)) {
        chunkToAdd = currentChunk.slice(singleNewline.length);
      }

      // 检查前一个块末尾是否已有段落分隔符
      if (prevChunk.endsWith(paragraphSeparator)) {
        result[result.length - 1] = prevChunk + chunkToAdd;
      } else {
        result[result.length - 1] = prevChunk + paragraphSeparator + chunkToAdd;
      }
    }
  }

  return result.join('');
}

// ============ 模拟批量处理逻辑 ============

/**
 * 模拟 rewriteTextChunk：原内容完整输出 + 随机延时
 */
async function mockRewriteTextChunk(text, delay) {
  await new Promise(resolve => setTimeout(resolve, delay));
  return text; // 原内容完整输出
}

/**
 * 模拟 processChunksWithDependencies（已移除风格一致性）
 */
async function processChunksWithDependencies(chunks, concurrency = 3) {
  const allResults = new Array(chunks.length);

  // 创建依赖组：每个组的大小等于并发数
  const groups = [];
  for (let i = 0; i < chunks.length; i += concurrency) {
    const groupSize = Math.min(concurrency, chunks.length - i);
    const group = Array.from({ length: groupSize }, (_, j) => i + j);
    groups.push(group);
  }

  console.log(`\n创建了 ${groups.length} 个组，并发数: ${concurrency}`);
  groups.forEach((group, idx) => {
    console.log(`  组 ${idx + 1}: 包含分块 ${group.join(', ')}`);
  });

  // 按顺序处理每个组（组间串行）
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];

    // 并行处理本组内的chunks（组内并行）
    await Promise.all(
      group.map(async (chunkIndexInGroup, i) => {
        const actualIndex = group[i];
        const randomDelay = Math.floor(Math.random() * 10000);

        console.log(`  [${new Date().toISOString()}] 开始处理分块 ${actualIndex}，延时 ${(randomDelay / 1000).toFixed(1)}s`);

        const result = await mockRewriteTextChunk(chunks[actualIndex], randomDelay);

        allResults[actualIndex] = result;
        console.log(`  [${new Date().toISOString()}] 分块 ${actualIndex} 处理完成`);
      })
    );
  }

  return allResults;
}

// ============ 测试执行 ============

async function runTest() {
  console.log('='.repeat(60));
  console.log('批量模式模拟测试');
  console.log('='.repeat(60));

  // 测试配置
  const TARGET_SIZE = 2000;
  const CONCURRENCY = 3;

  // 读取测试文本
  let originalText = fs.readFileSync('./test-input.txt', 'utf-8');

  // 如果文本太小，重复拼接以触发分块逻辑
  // 目标：至少 40000+ 字符，产生 15+ 个分块
  const MIN_LENGTH = TARGET_SIZE * 16;
  if (originalText.length < MIN_LENGTH) {
    const repeatCount = Math.ceil(MIN_LENGTH / originalText.length);
    const originalForRepeat = originalText;
    originalText = originalText.repeat(repeatCount);
    console.log(`\n原始文本长度: ${originalForRepeat.length} 字符 (重复 ${repeatCount} 次以触发分块)`);
    console.log(`扩展后长度: ${originalText.length} 字符`);
  } else {
    console.log(`\n原始文本长度: ${originalText.length} 字符`);
  }

  // 1. 分块测试
  console.log('\n' + '-'.repeat(60));
  console.log('第1步：分块测试');
  console.log('-'.repeat(60));

  const chunks = chunkText(originalText, TARGET_SIZE);
  console.log(`\n分块结果：共 ${chunks.length} 个块`);

  chunks.forEach((chunk, idx) => {
    console.log(`  块 ${idx + 1}: ${chunk.length} 字符`);
    // 显示边界内容
    const startPreview = chunk.slice(0, 50).replace(/\n/g, '\\n');
    const endPreview = chunk.slice(-50).replace(/\n/g, '\\n');
    console.log(`    开头: "${startPreview}"`);
    console.log(`    末尾: "${endPreview}"`);
  });

  // 验证分块完整性
  const totalChunkLength = chunks.reduce((sum, c) => sum + c.length, 0);
  console.log(`\n分块总长度: ${totalChunkLength}，原始长度: ${originalText.length}`);
  if (totalChunkLength !== originalText.length) {
    console.log(`❌ 错误：分块总长度与原文长度不一致！差异: ${originalText.length - totalChunkLength}`);
  } else {
    console.log(`✓ 分块完整性检查通过`);
  }

  // 2. 并发处理测试
  console.log('\n' + '-'.repeat(60));
  console.log('第2步：并发处理测试');
  console.log('-'.repeat(60));

  const startTime = Date.now();
  const results = await processChunksWithDependencies(chunks, CONCURRENCY, false);
  const endTime = Date.now();

  console.log(`\n处理完成，耗时: ${((endTime - startTime) / 1000).toFixed(2)}s`);
  console.log(`结果数量: ${results.length}`);

  // 3. 合并测试（使用智能合并）
  console.log('\n' + '-'.repeat(60));
  console.log('第3步：合并测试（使用智能合并）');
  console.log('-'.repeat(60));

  // 使用智能合并函数
  const mergedText = smartJoinChunks(results);
  console.log(`合并后文本长度: ${mergedText.length} 字符`);

  // 分析合并后相邻块之间的分隔符
  console.log('\n合并后相邻块边界分析：');
  for (let i = 0; i < chunks.length - 1; i++) {
    const chunkLen = chunks[i].length;
    const boundary = mergedText.slice(chunkLen + i * 2, chunkLen + i * 2 + 20).replace(/\n/g, '\\n');
    console.log(`  第 ${i + 1}→${i + 2} 个块边界: "${boundary}"`);
  }

  // 4. 验证结果
  console.log('\n' + '='.repeat(60));
  console.log('验证结果');
  console.log('='.repeat(60));

  // 检查长度
  if (mergedText.length !== originalText.length) {
    console.log(`❌ 长度不一致！`);
    console.log(`   原始文本: ${originalText.length} 字符`);
    console.log(`   合并文本: ${mergedText.length} 字符`);
    console.log(`   差异: ${mergedText.length - originalText.length} 字符`);
    console.log(`\n⚠️  问题分析：`);

    // 统计 CRLF 情况
    let originalCRLF = (originalText.match(/\r\n\r\n/g) || []).length;
    let mergedCRLF = (mergedText.match(/\r\n\r\n/g) || []).length;
    console.log(`   原文中的 \\r\\n\\r\\n 数量: ${originalCRLF}`);
    console.log(`   合并后的 \\r\\n\\r\\n 数量: ${mergedCRLF}`);
    console.log(`   差异: ${mergedCRLF - originalCRLF}`);

    // 找出具体差异位置
    let firstDiff = -1;
    for (let i = 0; i < Math.max(mergedText.length, originalText.length); i++) {
      if (mergedText[i] !== originalText[i]) {
        firstDiff = i;
        break;
      }
    }

    if (firstDiff >= 0) {
      console.log(`\n第一个差异位置: ${firstDiff}`);
      console.log(`原文片段: "${originalText.slice(Math.max(0, firstDiff - 20), firstDiff + 80).replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`);
      console.log(`合并片段: "${mergedText.slice(Math.max(0, firstDiff - 20), firstDiff + 80).replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`);
    }
  } else {
    console.log(`✓ 长度一致: ${mergedText.length} 字符`);
  }

  // 全文对比
  console.log('\n全文对比：');
  if (mergedText === originalText) {
    console.log(`✓ 合并后文本与原文完全一致！`);
  } else {
    console.log(`❌ 合并后文本与原文不一致！`);

    // 找出所有差异位置
    const diffPositions = [];
    const maxLen = Math.max(mergedText.length, originalText.length);
    for (let i = 0; i < maxLen; i++) {
      if (mergedText[i] !== originalText[i]) {
        diffPositions.push(i);
      }
    }
    console.log(`\n差异位置数量: ${diffPositions.length}`);
    if (diffPositions.length > 0 && diffPositions.length <= 10) {
      console.log(`差异位置: ${diffPositions.join(', ')}`);
    }
  }

  // 输出最终结果
  console.log('\n' + '='.repeat(60));
  if (mergedText === originalText) {
    console.log('🎉 测试通过！批量模式工作正常，没有重复或遗漏内容。');
  } else {
    console.log('⚠️  测试失败！存在内容格式问题。');
    console.log('\n问题类型分析：');
    console.log('  - 分块本身是完整的');
    console.log('  - 问题在于合并时分隔符处理导致多余的换行符');
    console.log('\n建议修复方案：');
    console.log('  1. 在合并前，检查分块末尾是否已包含 \\n\\n');
    console.log('  2. 如果分块末尾已有 \\n\\n，合并时减少一个分隔符');
    console.log('  3. 或者在分块时智能处理边界，避免重复分隔符');
    console.log('\n注意：如果AI处理后的内容与原始内容一致，此问题会导致最终');
    console.log('      输出的文本比原始文本多出额外的换行符。');
  }
  console.log('='.repeat(60));

  // 保存详细报告
  const report = {
    testDate: new Date().toISOString(),
    config: {
      targetSize: TARGET_SIZE,
      concurrency: CONCURRENCY,
    },
    results: {
      originalLength: originalText.length,
      mergedLength: mergedText.length,
      chunksCount: chunks.length,
      lengthMatch: mergedText.length === originalText.length,
      contentMatch: mergedText === originalText,
    },
    processingTime: endTime - startTime,
  };

  fs.writeFileSync('./test-report.json', JSON.stringify(report, null, 2));
  console.log(`\n详细报告已保存到 test-report.json`);
}

runTest().catch(console.error);
