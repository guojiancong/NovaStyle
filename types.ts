
export interface StyleConfig {
  id: string;
  label: string;
  prompt: string;
  language?: 'zh' | 'en' | 'all';
}

export const DefaultStyles: StyleConfig[] = [
  // --- 中文风格 ---
  {
    id: 'tongsu',
    label: '通俗风格',
    language: 'zh',
    prompt: '通俗风格：简洁通顺，保留人物物品名称。'
  },
  {
    id: 'jin-yong',
    label: '金庸武侠',
    language: 'zh',
    prompt: '金庸武侠风格：半文半白，用词考究，注重武学意境。'
  },
  {
    id: 'gu-long',
    label: '古龙浪子',
    language: 'zh',
    prompt: '古龙风格：句式极短，节奏感强，多用对话推动剧情。'
  },
  {
    id: 'ma-boyong',
    label: '马伯庸考据',
    language: 'zh',
    prompt: '马伯庸风格：历史细节严谨的悬疑叙事，逻辑缜密。'
  },
  {
    id: 'mo-yan',
    label: '莫言幻觉',
    language: 'zh',
    prompt: '莫言风格：语言瑰丽野性，感官描写强烈。'
  },
  {
    id: 'lu-xun',
    label: '鲁迅',
    language: 'zh',
    prompt: '鲁迅风格：语言辛辣讽刺，笔触深沉锋利。'
  },
  {
    id: 'qian-zhongshu',
    label: '钱钟书',
    language: 'zh',
    prompt: '钱钟书风格：学者式机锋与幽默，比喻精妙。'
  },
  {
    id: 'san-mao',
    label: '三毛洒脱',
    language: 'zh',
    prompt: '三毛风格：语言质朴真挚，充满异域风情。'
  },
  {
    id: 'liu-cixin',
    label: '刘慈欣科幻',
    language: 'zh',
    prompt: '大刘科幻风格：宏大叙事，跨越时空尺度。'
  },
  {
    id: 'wang-xiaobo',
    label: '王小波',
    language: 'zh',
    prompt: '王小波风格：幽默富有哲理，语言直白。'
  },
  {
    id: 'eileen-chang',
    label: '张爱玲',
    language: 'zh',
    prompt: '张爱玲风格：华丽而荒凉的意象，刻薄敏锐。'
  },
  {
    id: 'yu-hua',
    label: '余华',
    language: 'zh',
    prompt: '余华风格：语言平实直白，近乎残酷的冷静。'
  },
  {
    id: 'lan-ling',
    label: '兰陵笑笑生',
    language: 'zh',
    prompt: '《金瓶梅》风格：市井气息浓厚，详尽描写日常生活。'
  },
  {
    id: 'hong-lou-meng',
    label: '红楼梦',
    language: 'zh',
    prompt: '《红楼梦》风格：极致典雅的古典白话，注重细节描写。'
  },
  {
    id: 'xuanhuan',
    label: '玄幻修真',
    language: 'zh',
    prompt: '玄幻修真风格：宏大世界观，修炼等级分明，战斗场面华丽。'
  },
  {
    id: 'reqxue',
    label: '热血竞技',
    language: 'zh',
    prompt: '热血竞技风格：节奏明快，充满激情。'
  },
  {
    id: 'dushi',
    label: '都市异能',
    language: 'zh',
    prompt: '都市异能风格：现代都市背景，节奏紧凑爽点密集。'
  },
  {
    id: 'xianxia',
    label: '仙侠修真',
    language: 'zh',
    prompt: '仙侠修真风格：飘逸出尘，语言优美意境深远。'
  },
  {
    id: 'kongbu',
    label: '悬疑恐怖',
    language: 'zh',
    prompt: '悬疑恐怖风格：氛围阴森，悬念迭起。'
  },
  {
    id: 'tianwen',
    label: '甜宠言情',
    language: 'zh',
    prompt: '甜宠言情风格：温馨甜蜜，强调男女主互动。'
  },

  // --- 英文风格 ---
  {
    id: 'hemingway-en',
    label: 'Hemingway Style',
    language: 'en',
    prompt: 'Ernest Hemingway style: Direct, simple, vigorous. Short sentences, focus on objective action.'
  },
  {
    id: 'shakespeare-en',
    label: 'Shakespearean',
    language: 'en',
    prompt: 'William Shakespeare style: Early Modern English, rich metaphors, poetic meter, archaic vocabulary.'
  },
  {
    id: 'oscar-wilde-en',
    label: 'Oscar Wilde wit',
    language: 'en',
    prompt: 'Oscar Wilde style: Sparkling wit, sharp epigrams, sophisticated aestheticism.'
  },
  {
    id: 'lovecraft-en',
    label: 'Lovecraftian Horror',
    language: 'en',
    prompt: 'H.P. Lovecraft style: Cosmic horror with dread. Use archaic, polysyllabic adjectives.'
  },

  // --- 通用/翻译风格 ---
  {
    id: 'marquez',
    label: '马尔克斯 (魔幻现实)',
    language: 'all',
    prompt: '马尔克斯风格：波澜壮阔的叙事，语言富有韵律感。'
  },
  {
    id: 'murakami',
    label: '村上春树 (都市疏离)',
    language: 'all',
    prompt: '村上春树风格：现代感强的简洁叙事，充满都市孤独感。'
  },
  {
    id: 'kafka',
    label: '卡夫卡 (荒诞)',
    language: 'all',
    prompt: '卡夫卡风格：荒诞压抑的逻辑，冷静叙述极不寻常的事物。'
  },
];

export enum ProviderType {
  GEMINI = 'Google Gemini',
  OPENAI_COMPATIBLE = 'OpenAI 兼容 (DeepSeek/Qwen等)',
}

export enum ModelType {
  FLASH_3 = 'gemini-3-flash-preview',
  PRO_3 = 'gemini-3-pro-preview',
  FLASH_LITE_25 = 'gemini-flash-lite-latest',
}

export const ModelMetadata: Record<string, { name: string; description: string }> = {
  [ModelType.FLASH_3]: { name: 'Gemini 3 Flash', description: '速度与智能的完美平衡' },
  [ModelType.PRO_3]: { name: 'Gemini 3 Pro', description: '最强逻辑与文学素养' },
  [ModelType.FLASH_LITE_25]: { name: 'Gemini Flash Lite', description: '极致响应速度' },
};

export interface CustomModel {
  id: string;
  label: string;
  baseUrl: string;
  modelName: string;
  apiKey: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentChunk: string;
  totalChunks: number;
  error?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  content: string;
}
