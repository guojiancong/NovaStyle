
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
    throw new Error(`自定义模型重塑失败: ${error.message}`);
  }
};

/**
 * Utility to split long text into context-aware chunks.
 * Enhanced to prioritize splitting at chapter boundaries.
 */
export const chunkText = (text: string, targetSize: number = 2000): string[] => {
  const chunks: string[] = [];
  let remaining = text;

  // Pattern for common chapter markers at the start of a line
  const CHAPTER_PATTERN = /\n\s*(第[一二三四五六七八九十百千万零0-9]+\s*[章节卷回]|Chapter\s*\d+|楔子|内容简介|番外)/i;

  while (remaining.length > 0) {
    if (remaining.length <= targetSize) {
      chunks.push(remaining);
      break;
    }

    let splitPos = targetSize;
    
    // 1. Try to split at a chapter marker within the 80% to 120% range of targetSize
    const lookaheadArea = remaining.slice(targetSize * 0.5, targetSize * 1.5);
    const chapterMatch = lookaheadArea.match(CHAPTER_PATTERN);
    
    if (chapterMatch && chapterMatch.index !== undefined) {
      splitPos = (targetSize * 0.5) + chapterMatch.index;
    } else {
      // 2. Fallback: Try to split at double newline
      const dnlIndex = remaining.lastIndexOf('\n\n', targetSize);
      if (dnlIndex > targetSize * 0.5) {
        splitPos = dnlIndex + 2;
      } else {
        // 3. Fallback: Single newline
        const newlineIndex = remaining.lastIndexOf('\n', splitPos);
        if (newlineIndex > targetSize * 0.6) {
          splitPos = newlineIndex + 1;
        } else {
          // 4. Fallback: Punctuation
          const lastPunctuation = remaining.slice(0, targetSize).search(/[。！？.!?][^。！？.!?]*$/);
          if (lastPunctuation > targetSize * 0.6) {
            splitPos = lastPunctuation + 1;
          } else {
            const lastComma = remaining.slice(0, targetSize).search(/[，；,;][^，；,;]*$/);
            if (lastComma > targetSize * 0.6) {
              splitPos = lastComma + 1;
            } else {
              const lastSpace = remaining.lastIndexOf(' ', splitPos);
              if (lastSpace > targetSize * 0.6) {
                splitPos = lastSpace + 1;
              }
            }
          }
        }
      }
    }

    chunks.push(remaining.slice(0, splitPos).trimEnd());
    remaining = remaining.slice(splitPos).trimStart();
  }

  return chunks;
};
