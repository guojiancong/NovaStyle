import React, { useState, useEffect } from 'react';
import { 
  Download, Upload, Cloud, Star, Heart, Share2, 
  Search, Filter, Tag, Globe, User, Calendar,
  ChevronRight, ExternalLink, Check, X, RefreshCw
} from 'lucide-react';
import { StyleConfig } from './types';

// 风格市场数据结构
export interface MarketStyle {
  id: string;
  label: string;
  prompt: string;
  language: 'zh' | 'en' | 'all';
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

// 预设的在线风格市场（模拟远程数据）
const MARKET_STYLES: MarketStyle[] = [
  {
    id: 'market-jin-yong',
    label: '金庸武侠',
    prompt: '金庸武侠风格：半文半白，用词考究，注重武学意境。',
    language: 'zh',
    author: 'NovaStyle 官方',
    downloads: 15234,
    rating: 4.9,
    tags: ['武侠', '古典', '金庸'],
    description: '最经典的武侠风格，还原金庸先生的叙事风格',
    createdAt: '2024-01-15',
    updatedAt: '2024-02-20'
  },
  {
    id: 'market-gu-long',
    label: '古龙浪子',
    prompt: '古龙风格：句式极短，节奏感强，多用对话推动剧情。',
    language: 'zh',
    author: 'NovaStyle 官方',
    downloads: 12456,
    rating: 4.8,
    tags: ['武侠', '浪子', '古龙'],
    description: '短小精悍的浪子风格，充满诗意与寂寞',
    createdAt: '2024-01-15',
    updatedAt: '2024-02-18'
  },
  {
    id: 'market-cyberpunk',
    label: '赛博朋克',
    prompt: '赛博朋克风格：高科技低生活的反乌托邦叙事。充满霓虹灯、义体改造、人工智能、巨型企业等元素。语言冷峻，带有存在主义思考，强调科技与人性的冲突。',
    language: 'all',
    author: '社区用户 @NeoWriter',
    downloads: 8932,
    rating: 4.7,
    tags: ['科幻', '赛博朋克', '未来'],
    description: '高科技低生活的赛博朋克世界',
    createdAt: '2024-02-01',
    updatedAt: '2024-02-25'
  },
  {
    id: 'market-fantasy',
    label: '西幻史诗',
    prompt: '西方奇幻史诗风格：宏大的世界观，细腻的魔法系统描写。充满骑士精神、龙与魔法、王国与战争。语言华丽庄重，带有托尔金式的史诗感。',
    language: 'all',
    author: '社区用户 @DragonMaster',
    downloads: 7654,
    rating: 4.6,
    tags: ['奇幻', '史诗', '魔法'],
    description: '龙与魔法的西幻史诗世界',
    createdAt: '2024-01-20',
    updatedAt: '2024-02-15'
  },
  {
    id: 'market-romance',
    label: '日系轻小说',
    prompt: '日系轻小说风格：轻松活泼的现代叙事，大量内心独白和吐槽。语言口语化，充满二次元文化元素。节奏轻快，角色性格鲜明，常有校园恋爱元素。',
    language: 'all',
    author: '社区用户 @SakuraNovel',
    downloads: 9821,
    rating: 4.5,
    tags: ['轻小说', '日系', '校园'],
    description: '轻松愉快的日系轻小说风格',
    createdAt: '2024-01-25',
    updatedAt: '2024-02-22'
  },
  {
    id: 'market-mystery',
    label: '本格推理',
    prompt: '本格推理风格：严谨的逻辑推理，公平的线索呈现。注重诡计设计和解谜过程，语言客观冷静。遵循"十诫"原则，让读者与侦探站在同一水平线。',
    language: 'all',
    author: '社区用户 @DetectiveConan',
    downloads: 6543,
    rating: 4.8,
    tags: ['推理', '悬疑', '本格'],
    description: '严谨的本格派推理小说风格',
    createdAt: '2024-02-05',
    updatedAt: '2024-02-28'
  },
  {
    id: 'market-horror',
    label: '克苏鲁神话',
    prompt: '洛夫克拉夫特式恐怖：宇宙主义的宏大恐惧，人类在古老存在面前的渺小。使用古老、生僻的形容词，营造不可名状的恐怖氛围。强调未知的恐惧和疯狂。',
    language: 'all',
    author: '社区用户 @CthulhuFan',
    downloads: 5432,
    rating: 4.7,
    tags: ['恐怖', '克苏鲁', '神话'],
    description: '不可名状的克苏鲁式恐怖',
    createdAt: '2024-01-30',
    updatedAt: '2024-02-20'
  },
  {
    id: 'market-wuxia-modern',
    label: '现代修真',
    prompt: '现代修真风格：传统修真与现代都市的结合。主角在现代社会中修仙，既有修真界的尔虞我诈，也有都市生活的便利与冲突。语言通俗，爽点密集。',
    language: 'zh',
    author: '社区用户 @XiuXianKing',
    downloads: 11234,
    rating: 4.4,
    tags: ['修真', '都市', '爽文'],
    description: '都市背景下的现代修真故事',
    createdAt: '2024-02-10',
    updatedAt: '2024-03-01'
  }
];

interface StyleMarketProps {
  onImportStyle: (style: StyleConfig) => void;
  onClose: () => void;
}

const StyleMarket: React.FC<StyleMarketProps> = ({ onImportStyle, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [langFilter, setLangFilter] = useState<'all' | 'zh' | 'en'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState<MarketStyle | null>(null);

  // 提取所有标签
  const allTags = Array.from(new Set(MARKET_STYLES.flatMap(s => s.tags)));

  // 过滤和排序
  const filteredStyles = MARKET_STYLES
    .filter(style => {
      const matchesSearch = style.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           style.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           style.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = selectedTag === 'all' || style.tags.includes(selectedTag);
      const matchesLang = langFilter === 'all' || style.language === 'all' || style.language === langFilter;
      return matchesSearch && matchesTag && matchesLang;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular': return b.downloads - a.downloads;
        case 'rating': return b.rating - a.rating;
        case 'newest': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default: return 0;
      }
    });

  const handleRefresh = () => {
    setIsRefreshing(true);
    // 模拟刷新
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleImport = (style: MarketStyle) => {
    const newStyle: StyleConfig = {
      id: `market-${style.id}-${Date.now()}`,
      label: style.label,
      prompt: style.prompt,
      language: style.language
    };
    onImportStyle(newStyle);
    setShowImportConfirm(null);
  };

  const handleExport = (style: MarketStyle) => {
    const exportData = {
      name: style.label,
      prompt: style.prompt,
      language: style.language,
      author: style.author,
      description: style.description,
      tags: style.tags,
      version: '1.0',
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${style.label.replace(/\s+/g, '_')}_style.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="text-purple-400" size={28} />
            <div>
              <h2 className="text-xl font-bold text-white">风格模板市场</h2>
              <p className="text-xs text-slate-400">发现和分享优秀的文学风格模板</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="p-4 border-b border-white/10 flex flex-wrap gap-3">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="搜索风格、标签或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* 语言筛选 */}
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
          >
            <option value="all">全部语言</option>
            <option value="zh">中文</option>
            <option value="en">英文</option>
          </select>

          {/* 排序 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
          >
            <option value="popular">🔥 最受欢迎</option>
            <option value="rating">⭐ 评分最高</option>
            <option value="newest">🆕 最新上传</option>
          </select>

          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            className="p-2 bg-slate-800 border border-white/10 rounded-lg hover:bg-slate-700 transition-colors"
            title="刷新市场"
          >
            <RefreshCw size={18} className={`text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 标签筛选 */}
        <div className="px-4 py-2 border-b border-white/10 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedTag === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTag === tag
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* 风格列表 */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStyles.map(style => (
              <div
                key={style.id}
                className="bg-slate-800/50 border border-white/5 rounded-xl p-4 hover:border-purple-500/30 transition-all group"
              >
                {/* 头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1">{style.label}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User size={12} />
                      <span>{style.author}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star size={14} fill="currentColor" />
                    <span className="text-xs font-bold">{style.rating}</span>
                  </div>
                </div>

                {/* 描述 */}
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">{style.description}</p>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {style.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-[10px]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* 统计信息 */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Download size={12} />
                      {style.downloads.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {style.updatedAt}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    style.language === 'zh' ? 'bg-red-600/20 text-red-300' :
                    style.language === 'en' ? 'bg-blue-600/20 text-blue-300' :
                    'bg-green-600/20 text-green-300'
                  }`}>
                    {style.language === 'zh' ? '中文' : style.language === 'en' ? '英文' : '通用'}
                  </span>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImportConfirm(style)}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <Download size={14} />
                    导入
                  </button>
                  <button
                    onClick={() => handleExport(style)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    title="导出"
                  >
                    <Share2 size={14} />
                  </button>
                  <a
                    href="#"
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    title="查看详情"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {filteredStyles.length === 0 && (
            <div className="text-center py-12">
              <Cloud className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400">没有找到匹配的风格模板</p>
              <p className="text-xs text-slate-500 mt-2">尝试调整搜索条件或筛选器</p>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-white/10 bg-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>显示 {filteredStyles.length} / {MARKET_STYLES.length} 个风格</span>
            <div className="flex items-center gap-4">
              <span>💡 提示：导入的风格将保存在本地</span>
              <a href="#" className="text-purple-400 hover:text-purple-300 flex items-center gap-1">
                提交你的风格
                <ChevronRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 导入确认弹窗 */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-2">导入风格模板</h3>
            <p className="text-sm text-slate-400 mb-4">
              确定要导入 <span className="text-purple-400 font-bold">{showImportConfirm.label}</span> 吗？
            </p>
            <div className="bg-slate-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-slate-300 line-clamp-3">{showImportConfirm.prompt}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportConfirm(null)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
              >
                <X size={16} />
                取消
              </button>
              <button
                onClick={() => handleImport(showImportConfirm)}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
              >
                <Check size={16} />
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleMarket;
