
export interface StyleConfig {
  id: string;
  label: string;
  prompt: string;
  language?: 'zh' | 'en' | 'all';
}

export const DefaultStyles: StyleConfig[] = [
  // --- 中文风格 ---
  { 
    id: 'jin-yong', 
    label: '金庸武侠', 
    language: 'zh',
    prompt: '金庸武侠风格：半文半白的雅致叙事，用词考究，富有古典文学底蕴。注重武学招式的意境描写，强调“侠之大者，为国为民”的豪情与复杂的江湖恩怨。' 
  },
  { 
    id: 'gu-long', 
    label: '古龙浪子', 
    language: 'zh',
    prompt: '古龙风格：句式极短，节奏感极强。强调意境而非具体的动作过程，多用简短有力的对话推动剧情。文字中充满浪子情怀、美酒、快刀以及寂寞的诗意。' 
  },
  { 
    id: 'ma-boyong', 
    label: '马伯庸考据', 
    language: 'zh',
    prompt: '马伯庸“考据派”风格：基于严谨历史细节的悬疑叙事。节奏紧凑，逻辑缜密，擅长将现代政务、情报、医疗等逻辑融入历史背景中。描写极具画面感，充满“细节控”的魅力。' 
  },
  { 
    id: 'mo-yan', 
    label: '莫言幻觉', 
    language: 'zh',
    prompt: '莫言“幻觉现实主义”风格：将民间传说、历史与当代社会融合。语言瑰丽且具有野性，充满强烈的色彩、气味等感官描写。叙事大胆，富有魔幻色彩与乡土气息的爆发力。' 
  },
  { 
    id: 'lu-xun', 
    label: '鲁迅', 
    language: 'zh',
    prompt: '鲁迅风格：语言辛辣讽刺，笔触深沉且锋利。常用隐喻和反语，句式凝练且带有强烈的批判性。在描写人物时入木三分，充满对国民性和社会现实的深度剖析。' 
  },
  { 
    id: 'qian-zhongshu', 
    label: '钱钟书', 
    language: 'zh',
    prompt: '钱钟书风格：充满学者式的机锋与幽默。擅长使用精妙且出人意料的比喻，文字优雅而刻薄，随处可见对世俗生活、知识分子心态的深刻讽刺与哲理洞察。' 
  },
  { 
    id: 'san-mao', 
    label: '三毛洒脱', 
    language: 'zh',
    prompt: '三毛风格：语言质朴、自然、真挚。充满异域风情与流浪者的洒脱感。叙事中带有极强的情感感染力，将平凡生活点缀得充满浪漫主义色彩。' 
  },
  { 
    id: 'liu-cixin', 
    label: '刘慈欣科幻', 
    language: 'zh',
    prompt: '大刘科幻风格：宏大叙事，视角跨越时空尺度。冷峻的“宇宙社会学”视角，充满技术细节与科学美感，在宏大背景下探讨人类文明的终极命运。' 
  },
  { 
    id: 'wang-xiaobo', 
    label: '王小波', 
    language: 'zh',
    prompt: '王小波风格：幽默且富有智慧，语言直白却带有深刻的哲理性。喜欢用荒诞的叙事来消解严肃，崇尚理性、浪漫与有趣，文字间流露出一种特立独行的自由精神。' 
  },
  { 
    id: 'eileen-chang', 
    label: '张爱玲', 
    language: 'zh',
    prompt: '张爱玲风格：华丽而荒凉的意象，遣词造句刻薄而敏锐。精于描写旧上海/香港的市民生活与男女间细碎的心理博弈，充满对人性冷淡而透彻的观察。' 
  },
  { 
    id: 'yu-hua', 
    label: '余华', 
    language: 'zh',
    prompt: '余华风格：语言平实、简洁且直白，甚至带有一种近乎残酷的冷静。常通过重复叙述和白描来强化命运的厚重感，关注底层人物在极端苦难下的生存韧性。' 
  },
  { 
    id: 'lan-ling', 
    label: '兰陵笑笑生', 
    language: 'zh',
    prompt: '《金瓶梅》风格：市井气息极浓，详尽描写日常生活中的衣食住行。用词通俗生动且富有生命力，对世俗人性的观察透彻、真实且带有一点冷嘲，充满明清世情小说的韵味。' 
  },
  { 
    id: 'hong-lou-meng', 
    label: '红楼梦', 
    language: 'zh',
    prompt: '《红楼梦》风格：极致典雅的古典白话。注重起居服饰、饮食园林的琐碎描写以彰显人物身份，诗词歌赋信手年始，语态温婉但内藏机锋。' 
  },
  {
    id: 'xuanhuan',
    label: '玄幻修真',
    language: 'zh',
    prompt: '玄幻修真风格：宏大世界观，修炼等级分明（炼气、筑基、金丹等）。强调逆天改命、强者为尊。描写充满灵气、法则、天道等元素，战斗场面华丽震撼，主角不断突破自我。'
  },
  {
    id: 'reqxue',
    label: '热血竞技',
    language: 'zh',
    prompt: '热血竞技风格：节奏明快，充满激情与斗志。强调友情、努力、胜利。描写注重比赛场面、技能对决、团队协作。主角永不言弃，逆境中爆发潜能，燃爆全场。'
  },
  {
    id: 'dushi',
    label: '都市异能',
    language: 'zh',
    prompt: '都市异能风格：现代都市背景，主角获得特殊能力。扮猪吃虎、打脸爽文。描写都市生活与超自然能力结合，既有日常温馨，也有紧张刺激的战斗。节奏紧凑，爽点密集。'
  },
  {
    id: 'xianxia',
    label: '仙侠修真',
    language: 'zh',
    prompt: '仙侠修真风格：飘逸出尘，仙风道骨。描写仙界、洞天福地、法宝丹药。强调因果轮回、渡劫飞升。语言优美，意境深远，充满东方神话色彩和道家思想。'
  },
  {
    id: 'kongbu',
    label: '悬疑恐怖',
    language: 'zh',
    prompt: '悬疑恐怖风格：氛围阴森，悬念迭起。强调心理恐惧和未知威胁。描写注重环境渲染、细节暗示、反转剧情。节奏张弛有度，让读者毛骨悚然又欲罢不能。'
  },
  {
    id: 'tianwen',
    label: '甜宠言情',
    language: 'zh',
    prompt: '甜宠言情风格：温馨甜蜜，撒糖不断。强调男女主之间的互动和情感发展。描写细腻，充满少女心。剧情轻松愉快，偶尔有小波折但总体高甜，让人姨母笑。'
  },

  // --- 英文风格 ---
  {
    id: 'hemingway-en',
    label: 'Hemingway Style',
    language: 'en',
    prompt: 'Ernest Hemingway style: Direct, simple, and vigorous. Short sentences, lack of flowery adjectives, and focus on objective action. Use the "Iceberg Theory" where the deep meaning is hidden beneath the surface of sparse prose.'
  },
  {
    id: 'shakespeare-en',
    label: 'Shakespearean',
    language: 'en',
    prompt: 'William Shakespeare style: Early Modern English flavor. Rich in metaphors, poetic meter (iambic pentameter where applicable), archaic but evocative vocabulary (thou, hath, art), and complex wordplay or soliloquies.'
  },
  {
    id: 'oscar-wilde-en',
    label: 'Oscar Wilde wit',
    language: 'en',
    prompt: 'Oscar Wilde style: Sparkling wit, sharp epigrams, and sophisticated aestheticism. The tone should be elegantly cynical, decadent, and full of paradoxical observations about society and art.'
  },
  {
    id: 'lovecraft-en',
    label: 'Lovecraftian Horror',
    language: 'en',
    prompt: 'H.P. Lovecraft style: Cosmic horror with a sense of dread and insignificance. Use archaic, polysyllabic adjectives (eldritch, cyclopean, antediluvian) and focus on the incomprehensible and the ancient.'
  },

  // --- 通用/翻译风格 ---
  { 
    id: 'marquez', 
    label: '马尔克斯 (魔幻现实)', 
    language: 'all',
    prompt: '马尔克斯“魔幻现实主义”风格：波澜壮阔的叙事，循环的时间感。将超自然现象描写得如同家常便饭，句式长短错落，语言富有韵律感，展现出宏大的家族与文明宿命。' 
  },
  { 
    id: 'murakami', 
    label: '村上春树 (都市疏离)', 
    language: 'all',
    prompt: '村上春树风格：现代感强，带有西化色彩的简洁叙事。充满都市孤独感、小确幸与超现实的想象力。常有关于音乐、美食及细腻心理活动的侧面描写。' 
  },
  { 
    id: 'kafka', 
    label: '卡夫卡 (荒诞)', 
    language: 'all',
    prompt: '卡夫卡风格：荒诞、压抑且具有迷宫般的逻辑。冷静地叙述极不寻常的事物，体现个体在官僚系统或未知力量面前的疏离、困惑与无力感。' 
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
