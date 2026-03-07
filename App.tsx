import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  FileText, Settings, Save, Play, AlertCircle, RefreshCw,
  Upload, Download, Trash2, Maximize2, Layout, Cpu,
  Zap, Crown, Globe, Server, Plus, ChevronDown, Edit2,
  X, Type, Search, Pause, Square, History, Check,
  Columns, Eye, Command, RotateCcw, Gauge, Layers,
  ZapOff, Timer, CpuOff, Cloud, Share2
} from 'lucide-react';
import { StyleConfig, DefaultStyles, ModelType, ModelMetadata, ProviderType, CustomModel, ProcessingState, FileMetadata } from './types';
import { chunkText, streamProcess, processChunksWithDependencies, rewriteTextChunk } from './aiService';
import StyleMarket from './StyleMarket';

const APP_STATE_KEY = 'nova_v1_app_state';
const MAX_PREVIEW_LENGTH = 50000; 
const STORAGE_LIMIT = 4 * 1024 * 1024; 

const DEFAULT_SYSTEM_TEMPLATE = `你是一个文学风格转换工具。请将输入文本重塑为：${'${style}'}风格。

核心要求：
1. 保留原文段落结构和核心叙事
2. 剔除广告、链接等干扰信息
3. 深度模拟目标风格语感，保持全文统一
4. 仅输出重塑后的正文，无需任何说明

严禁事项：
- 不得添加章节标题（如"第一章"、"Chapter 1"）
- 不得重复表达相同意思
- 不得添加原文中没有的描述性段落
- 避免过度修饰和冗长表达`;

const App: React.FC = () => {
  const loadProgress = () => {
    try {
      const saved = localStorage.getItem('nova_progress');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load progress", e);
    }
    return null;
  };

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
  const savedProgress = loadProgress();

  const [file, setFile] = useState<FileMetadata | null>(savedProgress?.file || savedState?.file || null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  
  // 批量处理
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [encoding, setEncoding] = useState<string>(savedState?.encoding || 'UTF-8');
  const [isDetecting, setIsDetecting] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'single'>(savedState?.viewMode || 'split');
  const [provider, setProvider] = useState<ProviderType>(savedState?.provider || ProviderType.GEMINI);
  const [selectedModel, setSelectedModel] = useState<ModelType>(savedState?.selectedModel || ModelType.FLASH_3);
  const [langFilter, setLangFilter] = useState<'zh' | 'en' | 'all'>(savedState?.langFilter || 'all');
  
  // 主题切换
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (savedState?.theme) return savedState?.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
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
  const [isMarketOpen, setIsMarketOpen] = useState(false);

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
  const [estimatedCompletion, setEstimatedCompletion] = useState<string>('-');
  const [lastNotifiedProgress, setLastNotifiedProgress] = useState<number>(0);
  
  // Token 统计
  const [tokenStats, setTokenStats] = useState({
    input: 0,
    output: 0,
    estimatedCost: 0
  });

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

  // --- 快捷键支持 ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+O: 打开文件
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        document.getElementById('file-upload')?.click();
      }
      // Ctrl+S: 导出
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (fullProcessedText.current) handleSaveFile('txt');
      }
      // Ctrl+Enter: 开始处理
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (file && !processing.isProcessing) startProcessing();
      }
      // Escape: 停止处理
      if (e.key === 'Escape') {
        if (processing.isProcessing) {
          stopRequested.current = true;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, processing.isProcessing, fullProcessedText.current]);

  // --- 处理历史记录功能 ---
  interface ProcessingHistory {
    id: string;
    fileName: string;
    style: string;
    timestamp: number;
    duration: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    resultPreview: string;
  }

  const addToHistory = (duration: number) => {
    if (!file || !selectedStyle) return;
    
    const historyItem: ProcessingHistory = {
      id: `hist-${Date.now()}`,
      fileName: file.name,
      style: selectedStyle.label,
      timestamp: Date.now(),
      duration,
      inputTokens: tokenStats.input,
      outputTokens: tokenStats.output,
      estimatedCost: tokenStats.estimatedCost,
      resultPreview: fullProcessedText.current.slice(0, 200)
    };
    
    const history = getHistory();
    history.unshift(historyItem); // 添加到开头
    if (history.length > 50) history.pop(); // 保留最近 50 条
    localStorage.setItem('nova_history', JSON.stringify(history));
    forceUpdate({});
  };

  const getHistory = (): ProcessingHistory[] => {
    try {
      const saved = localStorage.getItem('nova_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('nova_history');
    forceUpdate({});
  };

  const loadFromHistory = (item: ProcessingHistory) => {
    // 从历史记录恢复（简化版，实际需要存储完整内容）
    alert('历史记录恢复功能开发中...');
  };

  // --- 断点续传功能 ---
  const saveProgress = () => {
    if (file && processing.progress > 0) {
      const progress = {
        fileName: file.name,
        fileContent: file.content,
        fullProcessedText: fullProcessedText.current,
        progress: processing.progress,
        totalChunks: processing.totalChunks,
        timestamp: Date.now(),
        selectedStyleId,
        provider,
        selectedModel
      };
      localStorage.setItem('nova_progress', JSON.stringify(progress));
    }
  };

  const clearProgress = () => {
    localStorage.removeItem('nova_progress');
  };

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

  // 应用主题
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('nova_theme', theme);
  }, [theme]);

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // 不主动请求，等处理完成时再请求
    }
  }, []);

  // 进度通知
  const sendProgressNotification = (progress: number) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const messages = [
        { percent: 25, text: '📝 处理进度 25%，进展顺利！' },
        { percent: 50, text: '⚡ 已完成一半，继续加油！' },
        { percent: 75, text: '🚀 即将完成，请稍候...' },
        { percent: 100, text: '✨ 文本重塑完成！' }
      ];
      
      const message = messages.find(m => m.percent === progress);
      if (message) {
        new Notification('NovaStyle', {
          body: message.text,
          icon: '/logo.png',
          tag: 'novastyle-progress',
          requireInteraction: false
        });
      }
    }
  };

  const sendCompletionNotification = () => {
    sendProgressNotification(100);
  };

  // 自动保存进度（每 5 秒）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveProgress();
      const stateToSave: any = {
        file, encoding, provider, selectedModel, selectedStyleId,
        selectedCustomModelId, progress: processing.progress,
        totalChunks: processing.totalChunks, viewMode, langFilter,
        enableBatchMode, concurrency, enableStyleConsistency, chunkSize,
        theme
      };
      if (fullProcessedText.current.length < STORAGE_LIMIT) {
        stateToSave.fullContent = fullProcessedText.current;
      }
      localStorage.setItem(APP_STATE_KEY, JSON.stringify(stateToSave));
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [file, encoding, provider, selectedModel, selectedStyleId, selectedCustomModelId, processing.progress, processing.totalChunks, viewMode, langFilter, enableBatchMode, concurrency, enableStyleConsistency, chunkSize, fullProcessedText.current, theme]);

  // --- 管理功能函数 ---
  const addNewStyle = () => {
    const newId = `style-${Date.now()}`;
    const newStyle: StyleConfig = { id: newId, label: '新风格', prompt: '风格描述...', language: langFilter === 'all' ? 'zh' : langFilter };
    setStyles([...styles, newStyle]);
    setSelectedStyleId(newId);
    setEditingStyleId(newId);
    setIsStyleDropdownOpen(false);
  };

  const handleImportStyle = (style: StyleConfig) => {
    setStyles([...styles, style]);
    setSelectedStyleId(style.id);
    setIsMarketOpen(false);
    // 显示成功提示
    alert(`✅ 风格 "${style.label}" 已成功导入！`);
  };

  const handleExportStyles = () => {
    const exportData = {
      name: 'NovaStyle 风格包',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      styles: styles.filter(s => !DefaultStyles.find(ds => ds.id === s.id)) // 只导出自定义风格
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novastyle_styles_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportStylesFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.styles && Array.isArray(data.styles)) {
          const importedStyles = data.styles.map((s: any) => ({
            id: `imported-${s.id}-${Date.now()}`,
            label: s.label,
            prompt: s.prompt,
            language: s.language || 'all' as const
          }));
          setStyles([...styles, ...importedStyles]);
          alert(`✅ 成功导入 ${importedStyles.length} 个风格！`);
        } else if (data.label && data.prompt) {
          // 单个风格
          const newStyle: StyleConfig = {
            id: `imported-${Date.now()}`,
            label: data.label,
            prompt: data.prompt,
            language: data.language || 'all' as const
          };
          setStyles([...styles, newStyle]);
          alert(`✅ 成功导入风格 "${data.label}"！`);
        } else {
          throw new Error('Invalid format');
        }
      } catch (err) {
        alert('❌ 导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
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
  // Token 估算函数（中文约 1.5 字符/TOKEN，英文约 4 字符/TOKEN）
  const estimateTokens = (text: string): number => {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.round(chineseChars * 1.5 + otherChars * 0.25);
  };

  const appendText = (chunk: string) => {
    fullProcessedText.current += chunk;
    
    // 更新 Token 统计
    const outputTokens = estimateTokens(chunk);
    setTokenStats(prev => ({
      ...prev,
      output: prev.output + outputTokens,
      estimatedCost: (prev.output + outputTokens) * 0.002 / 1000 // 按 DeepSeek 价格估算
    }));
    
    setPreviewContent(prev => {
      const newContent = prev + chunk;
      return newContent.length > MAX_PREVIEW_LENGTH ? "..." + newContent.slice(-MAX_PREVIEW_LENGTH) : newContent;
    });
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  };

  const detectAndReadFile = async (blob: Blob, addToQueue: boolean = false) => {
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
    
    const fileMeta = { name: (blob as any).name || 'file.txt', size: blob.size, content: text };
    
    if (addToQueue || isBatchMode) {
      // 添加到队列
      const fileObj = new File([buffer], (blob as any).name, { type: 'text/plain' });
      setFileQueue(prev => [...prev, fileObj]);
      setFile(fileMeta);
    } else {
      setFile(fileMeta);
    }
    
    setLangFilter(text.match(/[\u4e00-\u9fa5]/g)?.length ? 'zh' : 'en');
    setIsDetecting(false);
    fullProcessedText.current = ""; 
    setPreviewContent("");
    setProcessing(p => ({ ...p, progress: 0, error: undefined }));
    forceUpdate({});
  };

  // 批量处理函数
  const processNextInQueue = async () => {
    if (currentBatchIndex >= fileQueue.length) {
      alert('批量处理完成！');
      setFileQueue([]);
      setCurrentBatchIndex(0);
      setIsBatchMode(false);
      return;
    }

    const nextFile = fileQueue[currentBatchIndex];
    await detectAndReadFile(nextFile, false);
    
    // 自动开始处理
    setTimeout(() => {
      startProcessing();
    }, 1000);
  };

  // --- 拖拽上传处理 ---
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.txt'));
    
    if (files.length > 1) {
      // 多文件 - 批量处理
      if (confirm(`检测到 ${files.length} 个文件，是否启用批量处理模式？`)) {
        setIsBatchMode(true);
        setFileQueue(files);
        detectAndReadFile(files[0], true);
        return;
      }
    }
    
    if (files.length > 0) {
      detectAndReadFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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

    // 重置 Token 统计
    const inputTokens = estimateTokens(file.content);
    setTokenStats({
      input: inputTokens,
      output: 0,
      estimatedCost: 0
    });

    // 智能分块
    const chunks = chunkText(file.content, chunkSize);
    setProcessing(p => ({ ...p, totalChunks: chunks.length }));

    try {
      // 风格一致性增强
      const stylePrompt = systemTemplate.replace('${style}', selectedStyle.prompt);

      // 根据批量模式选择处理方式
      if (enableBatchMode && concurrency > 1 && chunks.length > 1) {
        // 批量并行模式（依赖组处理）
        const resultsMap = new Map<number, string>();

        const results = await processChunksWithDependencies(
          chunks,
          stylePrompt,
          provider,
          selectedModel,
          currentCustomModel,
          concurrency,
          enableStyleConsistency,
          (completed, total, chunkIndex, result) => {
            // 存储结果到 Map
            resultsMap.set(chunkIndex, result);

            // 按索引顺序拼接已完成的chunk
            const sortedResults = Array.from(resultsMap.entries())
              .sort((a, b) => a[0] - b[0])
              .map(entry => entry[1]);
            const previewText = sortedResults.join('\n\n');

            fullProcessedText.current = previewText;

            // 更新进度
            const currentProgress = Math.round((completed / total) * 100);
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const speed = (completed / elapsed).toFixed(1);
            const remaining = total - completed;
            const eta = remaining / parseFloat(speed);

            // 计算预计完成时间
            const completionDate = new Date(Date.now() + eta * 1000);
            const completionTime = completionDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

            setProcessing(p => ({
              ...p,
              progress: currentProgress,
              currentChunk: `并行处理中：${completed}/${total} 段...`
            }));
            setProcessingSpeed(`${speed} 块/秒`);
            setEstimatedTime(eta < 60 ? `${Math.round(eta)}秒` : `${Math.round(eta / 60)}分钟`);
            setEstimatedCompletion(completionTime);

            // 更新 Token 统计
            const outputTokens = estimateTokens(previewText);
            setTokenStats(prev => ({
              ...prev,
              output: outputTokens,
              estimatedCost: outputTokens * 0.002 / 1000
            }));

            // 更新预览内容（考虑长度限制）
            setPreviewContent(
              previewText.length > MAX_PREVIEW_LENGTH
                ? "..." + previewText.slice(-MAX_PREVIEW_LENGTH)
                : previewText
            );

            // 自动滚动到底部
            if (outputRef.current) {
              outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }

            // 主动进度反馈（每 25% 通知一次）
            if (currentProgress >= 25 && currentProgress >= lastNotifiedProgress + 25) {
              sendProgressNotification(currentProgress);
              setLastNotifiedProgress(currentProgress);

              // 请求通知权限（如果还未授权）
              if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            }
          }
        );

        processedChunksRef.current = chunks.length;
      } else {
        // 顺序处理模式（支持暂停/恢复）
        const startIndex = isResuming ? Math.floor((processing.progress / 100) * chunks.length) : 0;

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

          const result = await rewriteTextChunk(chunkWithContext, stylePrompt, provider, selectedModel, currentCustomModel, (part) => appendText(part));

          processedChunksRef.current++;
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const speed = (processedChunksRef.current / elapsed).toFixed(1);
          const remaining = chunks.length - i - 1;
          const eta = remaining / parseFloat(speed);
          const currentProgress = Math.round(((i + 1) / chunks.length) * 100);

          // 计算预计完成时间
          const completionDate = new Date(Date.now() + eta * 1000);
          const completionTime = completionDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

          setProcessingSpeed(`${speed} 块/秒`);
          setEstimatedTime(eta < 60 ? `${Math.round(eta)}秒` : `${Math.round(eta / 60)}分钟`);
          setEstimatedCompletion(completionTime);
          setProcessing(p => ({ ...p, progress: currentProgress }));

          // 主动进度反馈（每 25% 通知一次）
          if (currentProgress >= 25 && currentProgress >= lastNotifiedProgress + 25) {
            sendProgressNotification(currentProgress);
            setLastNotifiedProgress(currentProgress);

            // 请求通知权限（如果还未授权）
            if ('Notification' in window && Notification.permission === 'default') {
              Notification.requestPermission();
            }
          }
        }
      }
      
      const totalElapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      setProcessing(p => ({ 
        ...p, 
        isProcessing: false, 
        currentChunk: stopRequested.current ? '任务已停止' : `重塑完成！总耗时：${totalElapsed}秒` 
      }));
      
      // 添加到历史记录（如果不是被停止的）
      if (!stopRequested.current) {
        addToHistory(parseFloat(totalElapsed));
        
        // 发送完成通知
        sendCompletionNotification();
        
        // 批量处理：完成后自动处理下一个
        if (isBatchMode && currentBatchIndex < fileQueue.length - 1) {
          setCurrentBatchIndex(prev => prev + 1);
          setTimeout(() => processNextInQueue(), 2000);
        }
      }
      
      forceUpdate({});
    } catch (e: any) {
      setProcessing(p => ({ ...p, isProcessing: false, error: e.message }));
    }
  };

  // --- 导出逻辑 ---
  const handleSaveFile = async (format: 'txt' | 'md' = 'txt') => {
    if (!fullProcessedText.current) return;
    
    let content = fullProcessedText.current;
    let mimeType = 'text/plain';
    let extension = 'txt';
    
    // 根据格式处理内容
    if (format === 'md') {
      mimeType = 'text/markdown';
      extension = 'md';
      // 添加 Markdown 格式
      content = `# ${file?.name?.replace('.txt', '') || '重塑作品'} - ${selectedStyle?.label || '风格转换'}\n\n> 使用 NovaStyle v${'2.1'} 重塑 | 风格：${selectedStyle?.label || '未知'}\n\n---\n\n${fullProcessedText.current}`;
    }
    
    const suggestedName = `${selectedStyle?.label || 'rewrite'}_${file?.name?.replace('.txt', '') || 'file'}.${extension}`;
    const blob = new Blob([content], { type: mimeType });

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
    <div 
      className="flex flex-col h-screen overflow-hidden text-slate-200"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* 拖拽提示 */}
      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none opacity-0 hover:opacity-100 transition-opacity bg-blue-600/90 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-2xl">
        📁 释放以上传文件
      </div>
      
      <div className="h-10 glass-panel flex items-center justify-between px-4 border-b border-white/10 select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
          <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">NovaStyle Matrix v2.4 - 并行批量版</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 glass-panel border-r border-white/10 p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          {/* 源文件部分 */}
          <section>
            <h2 className="flex items-center gap-2 text-[10px] font-bold text-blue-400 mb-3 uppercase tracking-widest"><Upload size={14} /> 源文本载入</h2>
            <input type="file" accept=".txt" onChange={(e) => e.target.files?.[0] && detectAndReadFile(e.target.files[0])} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className={`flex flex-col items-center justify-center w-full h-16 border-2 border-dashed rounded-xl cursor-pointer transition-all ${file ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-blue-500/50 hover:bg-white/5'}`}>
              {isDetecting ? <RefreshCw className="animate-spin text-blue-400" size={18} /> : file ? (
                <div className="text-center p-2">
                  <p className="text-[10px] text-slate-300 truncate w-40 mx-auto">{file.name}</p>
                  {isBatchMode && fileQueue.length > 1 && (
                    <p className="text-[8px] text-blue-400 mt-1">批量模式：{currentBatchIndex + 1}/{fileQueue.length}</p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400">点击或拖拽上传 TXT</p>
              )}
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

          {/* 历史记录 */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="flex items-center gap-2 text-[10px] font-bold text-pink-400 uppercase tracking-widest"><History size={14} /> 历史记录</h2>
              <button 
                title="清空历史" 
                onClick={clearHistory}
                className="p-1 hover:bg-white/10 rounded text-pink-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {getHistory().length === 0 ? (
                <p className="text-[9px] text-slate-500 text-center py-2">暂无历史记录</p>
              ) : (
                getHistory().slice(0, 5).map(item => (
                  <div 
                    key={item.id}
                    className="p-2 bg-white/5 rounded-lg border border-white/5 hover:border-pink-500/30 cursor-pointer transition-all"
                    onClick={() => loadFromHistory(item)}
                  >
                    <div className="text-[9px] font-bold text-slate-300 truncate">{item.fileName}</div>
                    <div className="text-[8px] text-slate-500 flex items-center justify-between mt-1">
                      <span>{item.style}</span>
                      <span>{(item.duration / 60).toFixed(1)}分钟</span>
                    </div>
                    <div className="text-[8px] text-slate-600 mt-1">
                      {new Date(item.timestamp).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 风格滤镜管理 */}
          <section className="flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest"><Settings size={14} /> 风格滤镜</h2>
              <div className="flex gap-1">
                <button title="风格市场" onClick={() => setIsMarketOpen(true)} className="p-1 hover:bg-white/10 rounded text-purple-400"><Cloud size={14} /></button>
                <button title="导出风格" onClick={handleExportStyles} className="p-1 hover:bg-white/10 rounded text-purple-400"><Share2 size={14} /></button>
                <label title="导入风格" className="p-1 hover:bg-white/10 rounded text-purple-400 cursor-pointer">
                  <Upload size={14} />
                  <input type="file" accept=".json" onChange={handleImportStylesFile} className="hidden" />
                </label>
                <button title="添加风格" onClick={addNewStyle} className="p-1 hover:bg-white/10 rounded text-purple-400"><Plus size={14} /></button>
              </div>
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
              <>
                {savedProgress && savedProgress.progress > 0 && savedProgress.progress < 100 && (
                  <div className="text-[9px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 mb-2">
                    <AlertCircle size={12} className="inline mr-1" />
                    发现未完成任务 ({savedProgress.progress}%)
                    <button 
                      onClick={() => {
                        if (savedProgress) {
                          fullProcessedText.current = savedProgress.fullProcessedText || "";
                          setPreviewContent(savedProgress.fullProcessedText || "");
                          setFile({
                            name: savedProgress.fileName,
                            size: savedProgress.fileContent?.length || 0,
                            content: savedProgress.fileContent
                          });
                          setTokenStats({
                            input: estimateTokens(savedProgress.fileContent || ""),
                            output: estimateTokens(savedProgress.fullProcessedText || ""),
                            estimatedCost: 0
                          });
                        }
                      }}
                      className="ml-2 text-amber-300 underline"
                    >
                      恢复进度
                    </button>
                    <button 
                      onClick={clearProgress}
                      className="ml-2 text-amber-500 underline"
                    >
                      清除
                    </button>
                  </div>
                )}
                <button onClick={() => {
                  if (savedProgress && savedProgress.progress > 0) {
                    if (confirm('发现未完成任务，是否恢复进度？')) {
                      fullProcessedText.current = savedProgress.fullProcessedText || "";
                      setPreviewContent(savedProgress.fullProcessedText || "");
                      setFile({
                        name: savedProgress.fileName,
                        size: savedProgress.fileContent?.length || 0,
                        content: savedProgress.fileContent
                      });
                    }
                  }
                  startProcessing();
                }} disabled={!file} className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${!file ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'}`}>
                  <Play size={16} fill="currentColor" /> {processing.progress > 0 && processing.progress < 100 ? '继续重塑' : '开启重塑'}
                </button>
              </>
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleSaveFile('txt')} 
                  disabled={!fullProcessedText.current} 
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${!fullProcessedText.current ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95'}`}
                >
                  <Save size={18} /> TXT
                </button>
                <button 
                  onClick={() => handleSaveFile('md')} 
                  disabled={!fullProcessedText.current} 
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${!fullProcessedText.current ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95'}`}
                >
                  <FileText size={18} /> Markdown
                </button>
              </div>
            </div>
          </div>

          {/* 性能统计面板 + 进度反馈 */}
          {(processing.isProcessing || tokenStats.output > 0) && (
            <div className="space-y-4 shrink-0">
              {/* 进度条 */}
              {processing.isProcessing && (
                <div className="glass-panel rounded-xl p-4 border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 uppercase">处理进度</span>
                    <span className="text-xs font-bold text-blue-400">{processing.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${processing.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[9px] text-slate-500">
                    <span>📊 已处理：{Math.round(processing.totalChunks * processing.progress / 100)} / {processing.totalChunks} 块</span>
                    <span className={processing.progress === 100 ? 'text-green-400' : 'text-blue-400'}>
                      {processing.progress === 100 ? '✅ 完成！' : '⏳ 处理中...'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* 统计面板 */}
              <div className="grid grid-cols-5 gap-4">
                <div className="glass-panel rounded-xl p-3 border-white/5">
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase"><Gauge size={12} /> 处理速度</div>
                  <div className="text-lg font-bold text-cyan-400">{processingSpeed}</div>
                </div>
                <div className="glass-panel rounded-xl p-3 border-white/5">
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase"><Timer size={12} /> 预计剩余</div>
                  <div className="text-lg font-bold text-purple-400">{estimatedTime}</div>
                </div>
                <div className="glass-panel rounded-xl p-3 border-white/5">
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase"><Timer size={12} /> 完成时间</div>
                  <div className="text-lg font-bold text-pink-400">{estimatedCompletion}</div>
                </div>
                <div className="glass-panel rounded-xl p-3 border-white/5">
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase"><Type size={12} /> Token</div>
                  <div className="text-lg font-bold text-emerald-400">{(tokenStats.input + tokenStats.output).toLocaleString()}</div>
                </div>
                <div className="glass-panel rounded-xl p-3 border-white/5">
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase"><Cpu size={12} /> 费用</div>
                  <div className="text-lg font-bold text-amber-400">¥{tokenStats.estimatedCost.toFixed(4)}</div>
                </div>
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
        <div className="bg-white/10 px-2 py-0.5 rounded">NOVA-STYLE v2.4-PARALLEL</div>
      </footer>

      {/* 风格市场弹窗 */}
      {isMarketOpen && (
        <StyleMarket
          onImportStyle={handleImportStyle}
          onClose={() => setIsMarketOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
