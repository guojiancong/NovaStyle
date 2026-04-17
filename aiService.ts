import { GoogleGenAI } from "@google/genai";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { ModelType, ProviderType, CustomModel, OllamaConfig } from "./types";

// 检测是否在 Tauri 环境中运行
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// 统一的 fetch 封装：Tauri 环境用插件（绕过混合内容限制），浏览器环境用原生 fetch
const safeFetch = isTauri ? tauriFetch : fetch;

/**
 * Service to rewrite text chunks using various AI providers.
 */
export const rewriteTextChunk = async (
  text: string,
  systemInstruction: string,
  provider: ProviderType,
  model: ModelType | string,
  customConfig?: CustomModel,
  ollamaConfig?: OllamaConfig,
  onUpdate?: (chunk: string) => void
): Promise<string> => {
  if (provider === ProviderType.GEMINI) {
    return handleGemini(text, systemInstruction, model as ModelType, onUpdate);
  } else if (provider === ProviderType.OLLAMA) {
    if (!ollamaConfig) throw new Error("未提供 Ollama 配置");
    return handleOllama(text, systemInstruction, ollamaConfig, onUpdate);
  } else {
    if (!customConfig) throw new Error("未提供自定义模型配置");
    return handleOpenAICompatible(text, systemInstruction, customConfig, onUpdate);
  }
};

/**
 * Handle rewrite task using Google Gemini API.
 */
const handleGemini = async (
  text: string, 
  systemInstruction: string, 
  model: ModelType, 
  onUpdate?: (chunk: string) => void
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const result = await ai.models.generateContentStream({
      model: model,
      contents: text,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
        topP: 0.95,
      },
    });

    let fullText = "";
    for await (const chunk of result) {
      const textPart = chunk.text;
      if (textPart) {
        fullText += textPart;
        if (onUpdate) onUpdate(textPart);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Gemini 重塑失败，请检查网络或 API Key 状态。");
  }
};

/**
 * Handle rewrite task using OpenAI-compatible APIs (e.g., DeepSeek, Qwen).
 */
const handleOpenAICompatible = async (
  text: string,
  systemInstruction: string,
  config: CustomModel,
  onUpdate?: (chunk: string) => void
): Promise<string> => {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  try {
    const response = await safeFetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: text }
        ],
        stream: true,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} ${errorData.error?.message || ''}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应流");

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);
            const content = data.choices[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              if (onUpdate) onUpdate(content);
            }
          } catch (e) {
            console.warn("Error parsing chunk", e);
          }
        }
      }
    }

    return fullText;
  } catch (error: any) {
    console.error("OpenAI Compatible Error:", error);
    throw new Error(`自定义模型重塑失败：${error.message}`);
  }
};

/**
 * 获取 Ollama 可用模型列表
 */
export const fetchOllamaModels = async (baseUrl: string): Promise<string[]> => {
  const url = `${baseUrl.replace(/\/$/, '')}/api/tags`;
  const response = await safeFetch(url);
  if (!response.ok) throw new Error(`无法连接到 Ollama 服务 (${response.status})`);
  const data = await response.json();
  return (data.models || []).map((m: any) => m.name || m.model);
};

/**
 * Handle rewrite task using Ollama local model (OpenAI-compatible endpoint).
 */
const handleOllama = async (
  text: string,
  systemInstruction: string,
  config: OllamaConfig,
  onUpdate?: (chunk: string) => void
): Promise<string> => {
  const url = `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  try {
    const response = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: text }
        ],
        stream: true,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Ollama Error: ${response.status} ${errorData.error?.message || ''}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应流");

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              if (onUpdate) onUpdate(content);
            }
          } catch (e) {
            console.warn("Error parsing Ollama chunk", e);
          }
        }
      }
    }

    return fullText;
  } catch (error: any) {
    console.error("Ollama Error:", error);
    throw new Error(`Ollama 重塑失败：${error.message}`);
  }
};

/**
 * 检测文本的换行符类型
 * 返回 'crlf' (Windows \r\n) 或 'lf' (Unix \n)
 */
const detectLineEnding = (text: string): 'crlf' | 'lf' => {
  // 检测是否存在 \r\n
  if (text.includes('\r\n')) {
    return 'crlf';
  }
  return 'lf';
};

/**
 * 智能检测章节边界
 * 支持 Windows (\r\n) 和 Unix (\n) 换行符
 * 返回所有章节起始位置（已排序去重）
 */
const detectChapterBoundaries = (text: string): number[] => {
  const boundaries: number[] = [0];
  const lineEnding = detectLineEnding(text);

  // 根据换行符类型调整正则表达式
  // 使用 \r?\n 来兼容两种换行符
  const newlinePattern = /\r?\n/;

  // 中文章节模式
  const chineseChapterPattern = /(?:^|\r?\n)\s*(第 [一二三四五六七八九十百千万零 0-9]+\s*[章节卷回]|楔子 | 序章 | 前言 | 引言 | 内容简介 | 目录 | 番外 | 后记 | 尾声)/gi;
  // 英文章节模式
  const englishChapterPattern = /(?:^|\r?\n)\s*(Chapter\s*\d+|Prologue|Epilogue|Introduction|Preface|Contents|Appendix)/gi;

  let match;
  while ((match = chineseChapterPattern.exec(text)) !== null) {
    boundaries.push(match.index);
  }
  while ((match = englishChapterPattern.exec(text)) !== null) {
    boundaries.push(match.index);
  }

  // 排序并去重
  const sortedBoundaries = boundaries.sort((a, b) => a - b);
  const uniqueBoundaries = sortedBoundaries.filter((value, index, self) =>
    index === 0 || value !== self[index - 1]
  );

  return uniqueBoundaries;
};

/**
 * 改进的长文本分块策略
 * 优先按章节分块，其次按语义边界分块
 */
export const chunkText = (text: string, targetSize: number = 2000): string[] => {
  console.log(`开始分块，原始文本长度: ${text.length} 字符`);

  const chunks: string[] = [];

  // 1. 首先检测所有章节边界
  const chapterBoundaries = detectChapterBoundaries(text);
  console.log(`检测到 ${chapterBoundaries.length} 个章节边界`);

  // 2. 如果章节数量合理（每章不超过 targetSize * 3），直接按章节分块
  if (chapterBoundaries.length > 1) {
    const chapterChunks: string[] = [];
    for (let i = 0; i < chapterBoundaries.length; i++) {
      const start = chapterBoundaries[i];
      const end = i + 1 < chapterBoundaries.length ? chapterBoundaries[i + 1] : text.length;
      // 不使用 trim()，保留原始格式和空白字符
      const chapter = text.slice(start, end);

      // 如果章节太大，需要进一步细分
      if (chapter.length > targetSize * 1.5) {
        const subChunks = splitLargeChapter(chapter, targetSize);
        chapterChunks.push(...subChunks);
      } else {
        chapterChunks.push(chapter);
      }
    }

    console.log(`章节分块完成，共 ${chapterChunks.length} 个块`);

    // 检查分块的完整性：确保所有内容都被包含
    const totalChapterLength = chapterChunks.reduce((sum, c) => sum + c.length, 0);
    console.log(`章节分块总长度: ${totalChapterLength}, 原始长度: ${text.length}`);

    // 直接返回章节分块结果（不进行大小检查，避免跳过合理的章节分块）
    console.log('使用章节分块结果');
    return chapterChunks;
  }

  // 3. 回退到智能分块策略
  console.log('使用智能分块策略');
  const result = smartChunk(text, targetSize);
  const totalLength = result.reduce((sum, c) => sum + c.length, 0);
  console.log(`智能分块完成，共 ${result.length} 个块，总长度: ${totalLength}`);
  return result;
};

/**
 * 细分大章节
 */
const splitLargeChapter = (chapter: string, targetSize: number): string[] => {
  console.log(`细分大章节，长度: ${chapter.length}, 目标大小: ${targetSize}`);
  const chunks: string[] = [];
  let remaining = chapter;
  let processedLength = 0;

  while (remaining.length > targetSize) {
    // 在章节内寻找最佳分割点
    const splitPos = findBestSplitPoint(remaining, targetSize);
    // 保留原始格式，只在分割点进行基本的分割
    const chunk = remaining.slice(0, splitPos);
    chunks.push(chunk);
    processedLength += chunk.length;
    remaining = remaining.slice(splitPos);

    console.log(`细分块 ${chunks.length}: ${chunk.length} 字符，已处理: ${processedLength}/${chapter.length}`);
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
    processedLength += remaining.length;
  }

  console.log(`细分完成，共 ${chunks.length} 个块，处理长度: ${processedLength}`);
  return chunks;
};

/**
 * 寻找最佳分割点
 * 支持 Windows (\r\n) 和 Unix (\n) 换行符
 * 确保不在段落分隔符中间分割
 */
const findBestSplitPoint = (text: string, targetSize: number): number => {
  let splitPos = targetSize;
  const lineEnding = detectLineEnding(text);

  // 1. 优先在段落边界分割（双换行符）
  // 检测 \n\n 或 \r\n\r\n
  let bestSplit = -1;
  let searchLimit = Math.floor(targetSize * 1.2);

  // 搜索双换行符位置（完整匹配）
  for (let i = searchLimit; i >= targetSize * 0.6 && i >= 0; i--) {
    // 检查 \n\n (Unix)
    if (text[i - 1] === '\n' && text[i] === '\n') {
      bestSplit = i;
      break;
    }
    // 检查 \r\n\r\n (Windows) - 需要完整匹配4个字符
    if (lineEnding === 'crlf' && i >= 3 &&
        text[i - 3] === '\r' && text[i - 2] === '\n' &&
        text[i - 1] === '\r' && text[i] === '\n') {
      bestSplit = i + 1; // 指向第二个 \r\n 的末尾
      break;
    }
  }

  if (bestSplit > 0) {
    return bestSplit;
  }

  // 2. 其次在句子边界分割
  // 句子结束符：。！？.!? 后跟空白或换行
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

  // 3. 再次在单行边界分割
  // 查找最近的换行符，但避免在段落分隔符中间分割
  let newlinePos = -1;
  for (let i = Math.floor(targetSize); i >= targetSize * 0.6 && i >= 0; i--) {
    // 检查是否是段落分隔符的一部分（向前看）
    if (text[i] === '\n') {
      // 如果前面是 \r，则检查是否形成 \r\n\r\n 的一部分
      if (lineEnding === 'crlf' && i >= 1 && text[i - 1] === '\r') {
        // 继续向前检查是否有 \r\n\r\n
        if (i >= 3 && text[i - 3] === '\r' && text[i - 2] === '\n') {
          continue; // 跳过，这是段落分隔符的一部分
        }
        // 是 \r\n，但不是 \r\n\r\n 的一部分
        newlinePos = i + 1;
        break;
      } else if (lineEnding !== 'crlf' && text[i - 1] !== '\n') {
        // Unix 模式，检查前面是否也是 \n（形成 \n\n）
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
};

/**
 * 智能分块策略（回退方案）
 */
const smartChunk = (text: string, targetSize: number): string[] => {
  console.log(`智能分块开始，文本长度: ${text.length}, 目标大小: ${targetSize}`);
  const chunks: string[] = [];
  let remaining = text;
  let processedLength = 0;

  while (remaining.length > 0) {
    if (remaining.length <= targetSize) {
      chunks.push(remaining);
      processedLength += remaining.length;
      remaining = '';
      break;
    }

    const splitPos = findBestSplitPoint(remaining, targetSize);
    const chunk = remaining.slice(0, splitPos);
    chunks.push(chunk);
    processedLength += chunk.length;
    remaining = remaining.slice(splitPos);

    console.log(`分块 ${chunks.length}: ${chunk.length} 字符，已处理: ${processedLength}/${text.length}`);
  }

  console.log(`智能分块完成，共 ${chunks.length} 个块，处理长度: ${processedLength}`);
  return chunks;
};

/**
 * 批量并行处理（提升转换效率）
 * 支持并发控制，避免 API 限流
 */
export const batchRewrite = async (
  chunks: string[],
  systemInstruction: string,
  provider: ProviderType,
  model: ModelType | string,
  customConfig?: CustomModel,
  ollamaConfig?: OllamaConfig,
  concurrency: number = 3,
  onProgress?: (completed: number, total: number, result: string) => void
): Promise<string[]> => {
  const results: string[] = new Array(chunks.length);
  let completed = 0;

  // 使用信号量控制并发数
  const semaphore = {
    count: concurrency,
    wait: async () => {
      while (semaphore.count <= 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      semaphore.count--;
    },
    release: () => {
      semaphore.count++;
    }
  };

  const processChunk = async (index: number) => {
    await semaphore.wait();
    try {
      const result = await rewriteTextChunk(
        chunks[index],
        systemInstruction,
        provider,
        model,
        customConfig,
        ollamaConfig
      );
      results[index] = result;
      completed++;
      if (onProgress) onProgress(completed, chunks.length, result);
      return result;
    } finally {
      semaphore.release();
    }
  };

  // 并行处理所有分块
  await Promise.all(chunks.map((_, i) => processChunk(i)));

  return results;
};

/**
 * 依赖组并行处理
 * 将分块分为多个组，组内并行，组间串行
 */
export const processChunksWithDependencies = async (
  chunks: string[],
  systemInstruction: string,
  provider: ProviderType,
  model: ModelType | string,
  customConfig?: CustomModel,
  ollamaConfig?: OllamaConfig,
  concurrency: number = 3,
  onProgress?: (completed: number, total: number, chunkIndex: number, result: string) => void
): Promise<string[]> => {
  const allResults: string[] = new Array(chunks.length);
  let totalCompleted = 0;
  const totalChunks = chunks.length;

  // 创建依赖组：每个组的大小等于并发数，最后一个组可能较小
  const groups: number[][] = [];
  for (let i = 0; i < chunks.length; i += concurrency) {
    const groupSize = Math.min(concurrency, chunks.length - i);
    const group = Array.from({ length: groupSize }, (_, j) => i + j);
    groups.push(group);
  }

  // 按顺序处理每个组（组间串行）
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];

    // 并行处理本组内的chunks（组内并行）
    await Promise.all(
      group.map(async (chunkIndexInGroup, i) => {
        const actualIndex = group[i];
        const result = await rewriteTextChunk(
          chunks[actualIndex],
          systemInstruction,
          provider,
          model,
          customConfig,
          ollamaConfig
        );

        // 立即存储结果并回调
        allResults[actualIndex] = result;
        totalCompleted++;

        // 每个chunk完成后立即回调
        if (onProgress) {
          onProgress(totalCompleted, totalChunks, actualIndex, result);
        }
      })
    );
  }

  return allResults;
};

/**
 * 智能合并分块结果
 * 自动检测并处理分块边界的换行符，避免重复添加分隔符
 * 支持 Windows (\r\n) 和 Unix (\n) 换行符
 */
export const smartJoinChunks = (chunks: string[]): string => {
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0];

  // 检测文本的换行符类型
  const lineEnding = detectLineEnding(chunks[0]);

  // 定义段落分隔符模式（双换行符）
  const paragraphSeparator = lineEnding === 'crlf' ? '\r\n\r\n' : '\n\n';
  // 定义单行换行符
  const singleNewline = lineEnding === 'crlf' ? '\r\n' : '\n';

  const result: string[] = [];

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
      // 优先移除段落分隔符
      if (currentChunk.startsWith(paragraphSeparator)) {
        chunkToAdd = currentChunk.slice(paragraphSeparator.length);
      } else if (currentChunk.startsWith(singleNewline)) {
        // 如果只以单行换行符开头，也移除它
        chunkToAdd = currentChunk.slice(singleNewline.length);
      }

      // 检查前一个块末尾是否已有段落分隔符
      if (prevChunk.endsWith(paragraphSeparator)) {
        // 前一块末尾已有分隔符，直接添加（不需要添加额外分隔符）
        result[result.length - 1] = prevChunk + chunkToAdd;
      } else {
        // 前一块末尾没有分隔符，添加分隔符
        result[result.length - 1] = prevChunk + paragraphSeparator + chunkToAdd;
      }
    }
  }

  return result.join('');
};

/**
 * 流式顺序处理
 * 顺序处理每个分块
 */
export const streamProcess = async (
  chunks: string[],
  systemInstruction: string,
  provider: ProviderType,
  model: ModelType | string,
  customConfig?: CustomModel,
  ollamaConfig?: OllamaConfig,
  onChunkComplete?: (index: number, result: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  const results: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (signal?.aborted) {
      throw new Error('处理已取消');
    }

    const result = await rewriteTextChunk(
      chunks[i],
      systemInstruction,
      provider,
      model,
      customConfig,
      ollamaConfig
    );

    results.push(result);

    if (onChunkComplete) {
      onChunkComplete(i, result);
    }
  }

  return smartJoinChunks(results);
};
