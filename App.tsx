import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  FileText, Settings, Save, Play, AlertCircle, RefreshCw,
  Upload, Download, Trash2, Maximize2, Layout, Cpu,
  Zap, Crown, Globe, Server, Plus, ChevronDown, Edit2,
  X, Type, Search, Pause, Square, History, Check,
  Columns, Eye, Command, RotateCcw, Gauge, Layers,
  ZapOff, Timer, CpuOff
} from 'lucide-react';
import { StyleConfig, DefaultStyles, ModelType, ModelMetadata, ProviderType, CustomModel, ProcessingState, FileMetadata } from './types';
import { chunkText, streamProcess } from './aiService';

const APP_STATE_KEY = 'nova_v1_app_state';
const MAX_PREVIEW_LENGTH = 50000; 
const STORAGE_LIMIT = 4 * 1024 * 1024; 

const DEFAULT_SYSTEM_TEMPLATE = `你是一个文学重构矩阵。请将输入文本重塑为：${'${style}'}。
执行准则：
1. 【结构圣域】：严禁修改章节标题（如"第 x 章"等），必须以原始形式独占一行保留。
2. 【净化】：剔除文中广告、引流网址等干扰，章节标题必须保留。
3. 【拟态】：深度模拟目标风格的语感与意境，确保叙事逻辑自洽。
4. 【中立】：仅作为风格滤镜，严禁删减原著核心叙事。
5. 【纯净】：仅输出重塑后的正文，严禁包含任何元说明。
6. 【一致性】：保持与前文风格统一，语感连贯。`;

const App: React.FC = () => {
  const getSavedState = () => {
    try {
      const saved = localStorage.getItem(APP_STATE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to load saved state", e);
      return null;
    }
  };

  const savedState = getSavedState();

  const [file, setFile] = useState<FileMetadata | null>(savedState?.file || null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState<string>(savedState?.encoding || 'UTF-8');
  const [isDetecting, setIsDetecting] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'single'>(savedState?.viewMode || 'split');
  const [provider, setProvider] = useState<ProviderType>(savedState?.provider || ProviderType.GEMINI);
  const [selectedModel, setSelectedModel] = useState<ModelType>(savedState?.selectedModel || ModelType.FLASH_3);
  const [langFilter, setLangFilter] = useState<'zh' | 'en' | 'all'>(savedState?.langFilter || 'all');
  
  // 性能优化选项
  const [enableBatchMode, setEnableBatchMode] = useState(false);
  const [concurrency, setConcurrency] = useState(2);
  const [enableStyleConsistency, setEnableStyleConsistency] = useState(true);
  const [chunkSize, setChunkSize] = useState(2000);
  
  const fullProcessedText = useRef<string>(savedState?.fullContent || "");
  const [previewContent, setPreviewContent] = useState<string>(() => {
    const text = savedState?.fullContent || "";
    return text.length > MAX_PREVIEW_LENGTH ? "..." + text.slice(-MAX_PREVIEW_LENGTH) : text;
  });

  // --- 风格管理状态 ---
  const [styles, setStyles] = useState<StyleConfig[]>(() => {
    const saved = localStorage.getItem('nova_custom_styles');
    return saved ? JSON.parse(saved) : DefaultStyles;
  });
  const [selectedStyleId, setSelectedStyleId] = useState<string>(savedState?.selectedStyleId || styles[0]?.id || '');
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleSearch, setStyleSearch] = useState('');
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);

  // --- 模型管理状态 ---
  const [customModels, setCustomModels] = useState<CustomModel[]>(() => {
    const saved = localStorage.getItem('nova_custom_models');
    return saved ? JSON.parse(saved) : [{
      id: 'default-deepseek', label: 'DeepSeek Chat',
      baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat', apiKey: '',
    }];
  });
  const [selectedCustomModelId, setSelectedCustomModelId] = useState<string>(savedState?.selectedCustomModelId || customModels[0]?.id || '');
  const [isEditingModel, setIsEditingModel] = useState(false);

  const [systemTemplate, setSystemTemplate] = useState<string>(() => localStorage.getItem('nova_system_template') || DEFAULT_SYSTEM_TEMPLATE);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: savedState?.progress || 0,
    currentChunk: '',
    totalChunks: savedState?.totalChunks || 0,
    error: undefined
  });
  const [isPaused, setIsPaused] = useState(false);
  const [processingSpeed, setProcessingSpeed] = useState<string>('-');
  const [estimatedTime, setEstimatedTime] = useState<string>('-');

  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const stopRequested = useRef(false);
  const pauseRequested = useRef(false);
  const startTimeRef = useRef<number>(0);
  const processedChunksRef = useRef<number>(0);

  // --- 计算属性 ---
  const selectedStyle = useMemo(() => styles.find(s => s.id === selectedStyleId) || styles[0], [styles, selectedStyleId]);
  const filteredStyles = useMemo(() => styles.filter(s => {
    const matchesSearch = s.label.toLowerCase().includes(styleSearch.toLowerCase());
    const matchesLang = langFilter === 'all' || s.language === 'all' || s.language === langFilter;
    return matchesSearch && matchesLang;
  }), [styles, styleSearch, langFilter]);
  const currentCustomModel = useMemo(() => customModels.find(m => m.id === selectedCustomModelId) || customModels[0], [customModels, selectedCustomModelId]);
  const sourcePreview = useMemo(() => {
    if (!file?.content) return "";
    return file.content.length > MAX_PREVIEW_LENGTH ? file.content.slice(0, MAX_PREVIEW_LENGTH) + "\n\n...(内容过长，仅显示预览)..." : file.content;
  }, [file?.content]);

  // 用于强制更新 UI（因为 fullProcessedText 是 Ref，不触发重绘）
  const [, forceUpdate] = useState({});

  // --- 持久化逻辑 ---
  useEffect(() => {
    localStorage.setItem('nova_custom_styles', JSON.stringify(styles));
  }, [styles]);

  useEffect(() => {
    localStorage.setItem('nova_custom_models', JSON.stringify(customModels));
  }, [customModels]);

  useEffect(() => {
    localStorage.setItem('nova_system_template', systemTemplate);
  }, [systemTemplate]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const stateToSave: any = {
        file, encoding, provider, selectedModel, selectedStyleId,
        selectedCustomModelId, progress: processing.progress,
        totalChunks: processing.totalChunks, viewMode, langFilter,
        enableBatchMode, concurrency, enableStyleConsistency, chunkSize
      };
      if (fullProcessedText.current.length < STORAGE_LIMIT) {
        stateToSave.fullContent = fullProcessedText.current;
      }
      localStorage.setItem(APP_STATE_KEY, JSON.stringify(stateToSave));
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [file, encoding, provider, selectedModel, selectedStyleId, selectedCustomModelId, processing.progress, processing.totalChunks, viewMode, langFilter, enableBatchMode, concurrency, enableStyleConsistency, chunkSize]);

  // --- 管理功能函数 ---
  const addNewStyle = () => {
    const newId = `style-${Date.now()}`;
    const newStyle: StyleConfig = { id: newId, label: '新风格', prompt: '风格描述...', language: langFilter === 'all' ? 'zh' : langFilter };
    setStyles([...styles, newStyle]);
    setSelectedStyleId(newId);
    setEditingStyleId(newId);
    setIsStyleDropdownOpen(false);
  };

  const updateStyle = (id: string, updates: Partial<StyleConfig>) => {
    setStyles(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStyle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (styles.length <= 1) return;
    const next = styles.filter(s => s.id !== id);
    setStyles(next);
    if (selectedStyleId === id) setSelectedStyleId(next[0].id);
    if (editingStyleId === id) setEditingStyleId(null);
  };

  const addNewModel = () => {
    const newId = `model-${Date.now()}`;
    const newModel: CustomModel = { id: newId, label: '新模型配置', baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o', apiKey: '' };
    setCustomModels([...customModels, newModel]);
    setSelectedCustomModelId(newId);
    setIsEditingModel(true);
  };

  const deleteModel = (id: string) => {
    if (customModels.length <= 1) return;
    const next = customModels.filter(m => m.id !== id);
    setCustomModels(next);
    if (selectedCustomModelId === id) setSelectedCustomModelId(next[0].id);
  };

  const updateCurrentModel = (updates: Partial<CustomModel>) => {
    setCustomModels(prev => prev.map(m => m.id === selectedCustomModelId ? { ...m, ...updates } : m));
  };

  // --- 处理函数 ---
  const appendText = (chunk: string) => {
    fullProcessedText.current += chunk;
    setPreviewContent(prev => {
      const newContent = prev + chunk;
      return newContent.length > MAX_PREVIEW_LENGTH ? "..." + newContent.slice(-MAX_PREVIEW_LENGTH) : newContent;
    });
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  };

  const detectAndReadFile = async (blob: Blob) => {
    setIsDetecting(true);
    const buffer = await blob.arrayBuffer();
    let text = "";
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      setEncoding('UTF-8');
    } catch {
      text = new TextDecoder('gbk').decode(buffer);
      setEncoding('GBK');
    }
    setFile({ name: (blob as any).name || 'file.txt', size: blob.size, content: text });
    setLangFilter(text.match(/[\u4e00-\u9fa5]/g)?.length ? 'zh' : 'en');
    setIsDetecting(false);
    fullProcessedText.current = ""; 
    setPreviewContent("");
    setProcessing(p => ({ ...p, progress: 0, error: undefined }));
    forceUpdate({});
  };

  const startProcessing = async () => {
    if (!file || !selectedStyle) return;
    const isResuming = fullProcessedText.current.length > 0 && processing.progress > 0 && processing.progress < 100;
    if (!isResuming) { 
      fullProcessedText.current = ""; 
      setPreviewContent(""); 
    }

    stopRequested.current = false; 
    pauseRequested.current = false; 
    setIsPaused(false);
    setProcessing(prev => ({ ...prev, isProcessing: true, error: undefined }));
    
    // 性能统计
    startTimeRef.current = Date.now();
    processedChunksRef.current = 0;

    // 智能分块
    const chunks = chunkText(file.content, chunkSize);
    setProcessing(p => ({ ...p, totalChunks: chunks.length }));
    const startIndex = isResuming ? Math.floor((processing.progress / 100) * chunks.length) : 0;

    try {
      // 风格一致性增强
      const stylePrompt = systemTemplate.replace('${style}', selectedStyle.prompt);
      
      // 流式处理（支持风格一致性）
      for (let i = startIndex; i < chunks.length; i++) {
        if (stopRequested.current) break;
        while (pauseRequested.current && !stopRequested.current) await new Promise(r => setTimeout(r, 500));
        if (stopRequested.current) break;

        setProcessing(p => ({ ...p, currentChunk: `正在处理第 ${i + 1} / ${chunks.length} 段...` }));
        
        // 获取前文用于风格一致性
        const previousChunk = enableStyleConsistency && i > 0 
          ? fullProcessedText.current.slice(-1000) 
          : null;
        
        // 添加风格上下文
        const chunkWithContext = enableStyleConsistency && previousChunk
          ? `[前文风格参考]\n${previousChunk}\n\n[继续创作]\n${chunks[i]}`
          : chunks[i];
        
        await import('./aiService').then(({ rewriteTextChunk }) => 
          rewriteTextChunk(chunkWithContext, stylePrompt, provider, selectedModel, currentCustomModel, (part) => appendText(part))
        );
        
        processedChunksRef.current++;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const speed = (processedChunksRef.current / elapsed).toFixed(1);
        const remaining = chunks.length - i - 1;
        const eta = remaining / parseFloat(speed);
        
        setProcessingSpeed(`${speed} 块/秒`);
        setEstimatedTime(eta < 60 ? `${Math.round(eta)}秒` : `${Math.round(eta / 60)}分钟`);
        setProcessing(p => ({ ...p, progress: Math.round(((i + 1) / chunks.length) * 100) }));
      }
      
      const totalElapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      setProcessing(p => ({ 
        ...p, 
        isProcessing: false, 
        currentChunk: stopRequested.current ? '任务已停止' : `重塑完成！总耗时：${totalElapsed}秒` 
      }));
      forceUpdate({});
    } catch (e: any) {
      setProcessing(p => ({ ...p, isProcessing: false, error: e.message }));
    }
  };

  // --- 导出逻辑 ---
  const handleSaveFile = async () => {
    if (!fullProcessedText.current) return;
    
    const suggestedName = `${selectedStyle?.label || 'rewrite'}_${file?.name || 'file'}.txt`;
    const blob = new Blob([fullProcessedText.current], { type: 'text/plain' });

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedName,
          types: [{
            description: 'Text Files',
            accept: { 'text/plain': ['.txt'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Modern save picker restricted or failed, falling back...', err);
      }
    }

    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error('Save failed', err);
      alert('保存文件失败，请检查浏览器权限。');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-200">
      <div className="h-10 glass-panel flex items-center justify-between px-4 border-b border-white/10 select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
          <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">NovaStyle Matrix v2.0 - 性能优化版</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 glass-panel border-r border-white/10 p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          {/* 源文件部分 */}
          <section>
            <h2 className="flex items-center gap-2 text-[10px] font-bold text-blue-400 mb-3 uppercase tracking-widest"><Upload size={14} /> 源文本载入</h2>
            <input type="file" accept=".txt" onChange={(e) => e.target.files?.[0] && detectAndReadFile(e.target.files[0])} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className={`flex flex-col items-center justify-center w-full h-16 border-2 border-dashed rounded-xl cursor-pointer transition-all ${file ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-blue-500/50 hover:bg-white/5'}`}>
              {isDetecting ? <RefreshCw className="animate-spin text-blue-400" size={18} /> : file ? <div className="text-center p-2"><p className="text-[10px] text-slate-300 truncate w-40 mx-auto">{file.name}</p></div> : <p className="text-[10px] text-slate-400">点击上传 TXT</p>}
            </label>
          </section>

          {/* AI 服务商 & 模型管理 */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="flex items-center gap-2 text-[10px] font-bold text-orange-400 uppercase tracking-widest"><Globe size={14} /> AI 服务商</h2>
              {provider === ProviderType.OPENAI_COMPATIBLE && (
                <div className="flex gap-1">
                  <button title="添加模型" onClick={addNewModel} className="p-1 hover:bg-white/10 rounded text-orange-400"><Plus size={14} /></button>
                  <button title="编辑当前模型" onClick={() => setIsEditingModel(!isEditingModel)} className={`p-1 hover:bg-white/10 rounded ${isEditingModel ? 'bg-orange-400/20 text-orange-300' : 'text-slate-500'}`}><Edit2 size={14} /></button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {Object.values(ProviderType).map((p) => (
                <button key={p} onClick={() => setProvider(p)} className={`px-2 py-1.5 text-center text-[10px] font-bold rounded-lg border transition-all ${provider === p ? 'bg-orange-600/20 border-orange-500 text-orange-200' : 'bg-white/5 border-white/5 text-slate-400'}`}>{p.split(' ')[0]}</button>
              ))}
            </div>

            {provider === ProviderType.GEMINI ? (
              <div className="flex flex-col gap-1.5">
                {Object.entries(ModelMetadata).map(([key, meta]) => (
                  <button key={key} onClick={() => setSelectedModel(key as ModelType)} className={`p-2 text-left rounded-lg border flex items-center gap-2 ${selectedModel === key ? 'bg-emerald-600/20 border-emerald-500 text-emerald-100' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                    {key === ModelType.PRO_3 ? <Crown size={12} /> : <Zap size={12} />}
                    <span className="text-[10px] font-bold">{meta.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <select value={selectedCustomModelId} onChange={(e) => setSelectedCustomModelId(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-slate-200">
                  {customModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                {isEditingModel && (
                  <div className="p-3 bg-slate-950 border border-orange-500/30 rounded-xl space-y-2 animate-in slide-in-from-top-2">
                    <input value={currentCustomModel.label} onChange={(e) => updateCurrentModel({ label: e.target.value })} className="w-full bg-slate-900 border border-white/5 rounded-md px-2 py-1 text-[10px]" placeholder="名称" />
                    <input value={currentCustomModel.baseUrl} onChange={(e) => updateCurrentModel({ baseUrl: e.target.value })} className="w-full bg-slate-900 border border-white/5 rounded-md px-2 py-1 text-[10px]" placeholder="Base URL" />
                    <input value={currentCustomModel.modelName} onChange={(e) => updateCurrentModel({ modelName: e.target.value })} className="w-full bg-slate-900 border border-white/5 rounded-md px-2 py-1 text-[10px]" placeholder="模型名称" />
                    <input type="password" value={currentCustomModel.apiKey} onChange={(e) => updateCurrentModel({ apiKey: e.target.value })} className="w-full bg-slate-900 border border-white/5 rounded-md px-2 py-1 text-[10px]" placeholder="API Key" />
                    <button onClick={() => deleteModel(selectedCustomModelId)} className="w-full py-1 text-[9px] text-red-400 bg-red-500/10 rounded">删除配置</button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 性能优化选项 */}
          <section>
            <h2 className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 mb-3 uppercase tracking-widest"><Cpu size={14} /> 性能优化</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-300">智能分块</label>
                <input type="number" value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} className="w-20 bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px]" min="500" max="5000" step="500" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-300">风格一致性</label>
                <input type="checkbox" checked={enableStyleConsistency} onChange={(e) => setEnableStyleConsistency(e.target.checked)} className="toggle-checkbox" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-300">批量模式</label>
                <input type="checkbox" checked={enableBatchMode} onChange={(e) => setEnableBatchMode(e.target.checked)} className="toggle-checkbox" />
              </div>
              {enableBatchMode && (
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-300">并发数</label>
                  <input type="number" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} className="w-20 bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px]" min="1" max="5" />
                </div>
              )}
            </div>
          </section>

          {/* 风格滤镜管理 */}
          <section className="flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest"><Settings size={14} /> 风格滤镜</h2>
              <button title="添加风格" onClick={addNewStyle} className="p-1 hover:bg-white/10 rounded text-purple-400"><Plus size={14} /></button>
            </div>
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
              {['all', 'zh', 'en'].map(l => (
                <button key={l} onClick={() => setLangFilter(l as any)} className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${langFilter === l ? 'bg-purple-600/30 text-purple-200' : 'text-slate-500'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <div className="relative" ref={styleDropdownRef}>
              <button onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-[11px] text-slate-200">
                <span className="truncate">{selectedStyle?.label || '选择风格'}</span>
                <ChevronDown size={14} />
              </button>
              {isStyleDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-slate-950 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 origin-top">
                  <div className="p-2 border-b border-white/5"><input placeholder="搜索风格..." value={styleSearch} onChange={e => setStyleSearch(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[10px]" /></div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredStyles.map(s => (
                      <div key={s.id} className="group flex items-center hover:bg-white/5">
                        <button onClick={() => { setSelectedStyleId(s.id); setIsStyleDropdownOpen(false); }} className={`flex-1 px-4 py-2.5 text-left text-[10px] ${selectedStyleId === s.id ? 'text-purple-400 font-bold' : 'text-slate-400'}`}>{s.label}</button>
                        <div className="flex px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button title="编辑描述" onClick={(e) => { e.stopPropagation(); setEditingStyleId(editingStyleId === s.id ? null : s.id); }} className="p-1 hover:text-blue-400"><Edit2 size={12} /></button>
                          <button title="删除" onClick={(e) => deleteStyle(e, s.id)} className="p-1 hover:text-red-400"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {editingStyleId && (
              <div className="p-3 bg-slate-950 border border-purple-500/30 rounded-xl space-y-2 animate-in slide-in-from-top-2">
                <input value={styles.find(s => s.id === editingStyleId)?.label || ''} onChange={e => updateStyle(editingStyleId, { label: e.target.value })} className="w-full bg-slate-900 border border-white/5 rounded-md px-2 py-1.5 text-[10px]" placeholder="名称" />
                <textarea rows={3} value={styles.find(s => s.id === editingStyleId)?.prompt || ''} onChange={e => updateStyle(editingStyleId, { prompt: e.target.value })} className="w-full bg-slate-900 border border-white/5 rounded-md px-2 py-1.5 text-[10px] resize-none" placeholder="描述..." />
                <button onClick={() => setEditingStyleId(null)} className="w-full py-1 text-[9px] bg-purple-600/20 text-purple-300 rounded">完成编辑</button>
              </div>
            )}
          </section>

          <div className="mt-auto pt-4 space-y-2">
             {fullProcessedText.current.length > STORAGE_LIMIT && (
               <div className="text-[9px] text-amber-500 flex items-center gap-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20"><AlertCircle size={12} /> 本地保存已禁用，请及时导出。</div>
             )}
            {!processing.isProcessing ? (
              <button onClick={startProcessing} disabled={!file} className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${!file ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'}`}>
                <Play size={16} fill="currentColor" /> {processing.progress > 0 && processing.progress < 100 ? '继续重塑' : '开启重塑'}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { pauseRequested.current = !pauseRequested.current; setIsPaused(pauseRequested.current); }} className="py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-700 text-white">{isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />} {isPaused ? '继续' : '暂停'}</button>
                <button onClick={() => { if(confirm('停止任务？')) stopRequested.current = true; }} className="py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 bg-red-600 text-white"><Square size={16} fill="currentColor" /> 停止</button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-[#080d19] p-6 gap-6 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">重塑矩阵 <span className="text-[10px] bg-blue-600 px-2 py-0.5 rounded uppercase">{provider === ProviderType.GEMINI ? 'GEMINI' : currentCustomModel?.label}</span></h1>
              <p className="text-[11px] text-slate-500">{processing.isProcessing ? `正在处理：${processing.currentChunk}` : '预览模式已开启，大文件仅显示最近生成的片段。'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button title="切换分屏" onClick={() => setViewMode(viewMode === 'split' ? 'single' : 'split')} className="p-2 text-slate-500 hover:text-white"><Columns size={20} /></button>
              <button title="清空内容" onClick={() => { if(confirm('确定要清空已生成的内容吗？')) { fullProcessedText.current = ""; setPreviewContent(""); forceUpdate({}); } }} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={20} /></button>
              <button 
                onClick={handleSaveFile} 
                disabled={!fullProcessedText.current} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${!fullProcessedText.current ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95'}`}
              >
                <Save size={18} /> 导出文件
              </button>
            </div>
          </div>

          {/* 性能统计面板 */}
          {processing.isProcessing && (
            <div className="grid grid-cols-4 gap-4 shrink-0">
              <div className="glass-panel rounded-xl p-3 border-white/5">
                <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase"><Gauge size={12} /> 处理速度</div>
                <div className="text-lg font-bold text-cyan-400">{processingSpeed}</div>
              </div>
              <div className="glass-panel rounded-xl p-3 border-white/5">
                <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase"><Timer size={12} /> 预计剩余</div>
                <div className="text-lg font-bold text-purple-400">{estimatedTime}</div>
              </div>
              <div className="glass-panel rounded-xl p-3 border-white/5">
                <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase"><Layers size={12} /> 进度</div>
                <div className="text-lg font-bold text-blue-400">{processing.progress}%</div>
              </div>
              <div className="glass-panel rounded-xl p-3 border-white/5">
                <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase"><Cpu size={12} /> 分块数</div>
                <div className="text-lg font-bold text-emerald-400">{processing.totalChunks}</div>
              </div>
            </div>
          )}

          <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
            {viewMode === 'split' && (
              <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden border-white/5">
                <div className="px-4 py-2.5 bg-white/5 border-b border-white/5 text-[9px] font-bold text-slate-500">ORIGINAL SOURCE</div>
                <div ref={sourceRef} className="flex-1 p-6 overflow-y-auto text-slate-400 whitespace-pre-wrap font-serif custom-scrollbar">{sourcePreview}</div>
              </div>
            )}
            <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden border-white/5 shadow-2xl relative">
              <div className="px-4 py-2.5 bg-white/5 border-b border-white/5 text-[9px] font-bold text-slate-500 flex justify-between items-center">
                <span>RECONSTRUCTED PREVIEW</span>
                {fullProcessedText.current.length > MAX_PREVIEW_LENGTH && <span className="text-amber-500 animate-pulse">内存安全预览中...</span>}
              </div>
              <div ref={outputRef} className="flex-1 p-6 overflow-y-auto text-slate-200 whitespace-pre-wrap font-serif custom-scrollbar scroll-smooth">{previewContent || <div className="h-full flex items-center justify-center text-slate-800 uppercase tracking-widest font-bold opacity-20">Waiting...</div>}</div>
            </div>
          </div>
        </main>
      </div>

      <footer className="h-7 bg-blue-800 px-4 flex items-center justify-between text-[10px] text-blue-100 font-bold border-t border-white/10">
        <div className="flex gap-6 uppercase">
          <span>STATUS: {processing.isProcessing ? (isPaused ? 'PAUSED' : 'ACTIVE') : 'READY'}</span>
          <span>MEMORY: {(fullProcessedText.current.length / 1024 / 1024).toFixed(2)} MB</span>
          <span>STYLE: {enableStyleConsistency ? '一致性增强 ON' : 'OFF'}</span>
        </div>
        <div className="bg-white/10 px-2 py-0.5 rounded">NOVA-STYLE v2.0-OPTIMIZED</div>
      </footer>
    </div>
  );
};

export default App;
