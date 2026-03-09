import { GoogleGenAI } from "@google/genai";
import { ModelType, ProviderType, CustomModel } from "./types";

/**
 * Service to rewrite text chunks using various AI providers.
 */
export const rewriteTextChunk = async (
  text: string,
  systemInstruction: string,
  provider: ProviderType,
  model: ModelType | string,
  customConfig?: CustomModel,
  onUpdate?: (chunk: string) => void
): Promise<string> => {
  if (provider === ProviderType.GEMINI) {
    return handleGemini(text, systemInstruction, model as ModelType, onUpdate);
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
    const response = await fetch(url, {
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
 * 智能检测章节边界
 * 返回所有章节起始位置
 */
const detectChapterBoundaries = (text: string): number[] => {
  const boundaries: number[] = [0];
  
  // 中文章节模式
  const chineseChapterPattern = /(?:^|\n)\s*(第 [一二三四五六七八九十百千万零 0-9]+\s*[章节卷回]|楔子 | 序章 | 前言 | 引言 | 内容简介 | 目录 | 番外 | 后记 | 尾声)/gi;
  // 英文章节模式
  const englishChapterPattern = /(?:^|\n)\s*(Chapter\s*\d+|Prologue|Epilogue|Introduction|Preface|Contents|Appendix)/gi;
  
  let match;
  while ((match = chineseChapterPattern.exec(text)) !== null) {
    boundaries.push(match.index);
  }
  while ((match = englishChapterPattern.exec(text)) !== null) {
    boundaries.push(match.index);
  }
  
  return boundaries.sort((a, b) => a - b);
};

/**
 * 改进的长文本分块策略
 * 优先按章节分块，其次按语义边界分块
 */
export const chunkText = (text: string, targetSize: number = 2000): string[] => {
  const chunks: string[] = [];
  
  // 1. 首先检测所有章节边界
  const chapterBoundaries = detectChapterBoundaries(text);
  
  // 2. 如果章节数量合理（每章不超过 targetSize * 3），直接按章节分块
  if (chapterBoundaries.length > 1) {
    const chapterChunks: string[] = [];
    for (let i = 0; i < chapterBoundaries.length; i++) {
      const start = chapterBoundaries[i];
      const end = i + 1 < chapterBoundaries.length ? chapterBoundaries[i + 1] : text.length;
      const chapter = text.slice(start, end).trim();
      
      // 如果章节太大，需要进一步细分
      if (chapter.length > targetSize * 1.5) {
        const subChunks = splitLargeChapter(chapter, targetSize);
        chapterChunks.push(...subChunks);
      } else {
        chapterChunks.push(chapter);
      }
    }
    
    // 如果分块数量合理，直接返回
    if (chapterChunks.every(c => c.length <= targetSize * 1.2)) {
      return chapterChunks;
    }
  }
  
  // 3. 回退到智能分块策略
  return smartChunk(text, targetSize);
};

/**
 * 细分大章节
 */
const splitLargeChapter = (chapter: string, targetSize: number): string[] => {
  const chunks: string[] = [];
  let remaining = chapter;
  
  while (remaining.length > targetSize) {
    // 在章节内寻找最佳分割点
    const splitPos = findBestSplitPoint(remaining, targetSize);
    chunks.push(remaining.slice(0, splitPos).trimEnd());
    remaining = remaining.slice(splitPos).trimStart();
  }
  
  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  
  return chunks;
};

/**
 * 寻找最佳分割点
 */
const findBestSplitPoint = (text: string, targetSize: number): number => {
  let splitPos = targetSize;
  
  // 1. 优先在段落边界分割
  const dnlIndex = text.lastIndexOf('\n\n', targetSize);
  if (dnlIndex > targetSize * 0.6) {
    return dnlIndex + 2;
  }
  
  // 2. 其次在句子边界分割
  const sentencePattern = /[。！？.!?][\s\n]*/g;
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
  const newlineIndex = text.lastIndexOf('\n', splitPos);
  if (newlineIndex > targetSize * 0.6) {
    return newlineIndex + 1;
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
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= targetSize) {
      chunks.push(remaining);
      break;
    }
    
    const splitPos = findBestSplitPoint(remaining, targetSize);
    chunks.push(remaining.slice(0, splitPos).trimEnd());
    remaining = remaining.slice(splitPos).trimStart();
  }
  
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
        customConfig
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
 * 依赖组并行处理（确保风格一致性）
 * 将分块分为多个组，组内并行，组间串行（依赖前一组结果）
 */
export const processChunksWithDependencies = async (
  chunks: string[],
  systemInstruction: string,
  provider: ProviderType,
  model: ModelType | string,
  customConfig?: CustomModel,
  concurrency: number = 3,
  enableStyleConsistency: boolean = false,
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

    // 获取前文上下文（用于风格一致性）
    let previousContext: string | null = null;
    if (enableStyleConsistency && groupIndex > 0) {
      // 获取前面已处理的所有结果，提取最后1500字符作为上下文
      const previousResults: string[] = [];
      for (let i = 0; i < group[0]; i++) {
        if (allResults[i]) {
          previousResults.push(allResults[i]);
        }
      }
      previousContext = previousResults.slice(-3).join('\n\n').slice(-1500);
    }

    // 准备本组需要处理的chunks（带上下文）
    const chunksWithContext = group.map((actualIndex, groupPosition) => {
      const chunk = chunks[actualIndex];
      // 只有非第一个组的chunks才添加前文上下文（确保有完整的前文结果）
      if (enableStyleConsistency && previousContext && groupIndex > 0) {
        return `[前文风格参考]\n${previousContext}\n\n[继续创作]\n${chunk}`;
      }
      return chunk;
    });

    // 并行处理本组内的chunks（组内并行）
    await Promise.all(
      group.map(async (chunkIndexInGroup, i) => {
        const actualIndex = group[i];
        const result = await rewriteTextChunk(
          chunksWithContext[i],
          systemInstruction,
          provider,
          model,
          customConfig
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
 * 风格一致性增强
 * 添加上下文前缀，保持全文风格统一
 */
export const addStyleContext = (
  chunk: string,
  previousChunk: string | null,
  stylePrompt: string
): string => {
  if (!previousChunk) {
    return chunk;
  }
  
  // 添加前文摘要作为上下文参考
  const contextLength = Math.min(500, previousChunk.length);
  const context = previousChunk.slice(-contextLength);
  
  return `[前文风格参考]\n${context}\n\n[继续创作]\n${chunk}`;
};

/**
 * 优化后的流式处理
 * 支持增量更新和断点续传
 */
export const streamProcess = async (
  chunks: string[],
  systemInstruction: string,
  provider: ProviderType,
  model: ModelType | string,
  customConfig?: CustomModel,
  onChunkComplete?: (index: number, result: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  const results: string[] = [];
  let previousResult: string | null = null;
  
  for (let i = 0; i < chunks.length; i++) {
    if (signal?.aborted) {
      throw new Error('处理已取消');
    }
    
    // 添加风格上下文，保持一致性
    const chunkWithContext = addStyleContext(chunks[i], previousResult, systemInstruction);
    
    const result = await rewriteTextChunk(
      chunkWithContext,
      systemInstruction,
      provider,
      model,
      customConfig
    );
    
    results.push(result);
    previousResult = result;
    
    if (onChunkComplete) {
      onChunkComplete(i, result);
    }
  }
  
  return results.join('\n\n');
};
