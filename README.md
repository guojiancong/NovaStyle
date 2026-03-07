# NovaStyle - 文学风格重塑矩阵

NovaStyle 是一款专为创作者、阅读爱好者和研究者设计的桌面级文本风格转换工具。它能够利用最先进的 AI 模型（如 Google Gemini 3, DeepSeek, Qwen 等），将长篇小说或散文内容按照指定的文学大家风格进行深度重构。

![NovaStyle UI](https://img.shields.io/badge/UI-Glassmorphism-blue)
![AI-Powered](https://img.shields.io/badge/AI-Gemini%20%7C%20OpenAI--Compatible-orange)
![Memory-Safe](https://img.shields.io/badge/Performance-Memory--Safe-green)
![Version](https://img.shields.io/badge/Version-2.4-purple)

## 🌟 核心特性

- **🎭 深度拟态重塑**：预设金庸、古龙、鲁迅、张爱玲、海明威等数十种文学风格滤镜。
- **🚀 多模型支持**：
  - **原生 Gemini**：支持 Gemini 3 Flash/Pro，享受极致的逻辑与文学素养。
  - **OpenAI 兼容**：可自由配置 DeepSeek、通义千问等国内外主流大模型。
- **🛡️ 智能内容净化**：内置智能识别算法，自动剔除广告、链接等干扰信息，避免添加冗余章节标题，确保输出纯净简洁。
- **💾 内存安全矩阵 (Memory-Safe)**：
  - **虚拟化渲染**：无论源文件多大，预览窗口仅渲染最近生成的 50,000 字，有效防止大规模文本导致的浏览器卡顿。
  - **非响应式流存**：核心数据采用 `useRef` 存储，避开 React 虚拟 DOM 对比开销。
- **🛠️ 生产力工具集**：
  - **自动探测编码**：智能识别 UTF-8 与 GBK，告别中文乱码。
  - **断点续传**：任务意外中断或手动停止后，支持从上一次进度继续。
  - **双屏对比视图**：左右分栏，直观查看原文与重塑效果的差异。
- **✨ 流畅动画体验**：新增平滑过渡动画和加载效果，提升用户交互体验。
- **🌐 风格模板市场**：
  - **在线市场**：浏览和下载社区分享的优质风格模板
  - **一键导入**：轻松导入喜欢的风格到你的收藏
  - **分享导出**：导出你的自定义风格与他人分享
  - **批量管理**：支持批量导入/导出风格包

## 🛠️ 技术栈

- **前端框架**：React 19 (Hooks / Context)
- **样式方案**：Tailwind CSS (响应式、毛玻璃效果)
- **图标系统**：Lucide React
- **AI 集成**：@google/genai & Fetch API (OpenAI Stream)
- **构建工具**：Vite
- **桌面框架**：Tauri (可选打包为桌面应用)

## 🚀 快速开始

### 环境准备
1. 确保已获得 **Google Gemini API Key** 或其他支持 OpenAI 协议的 API Key。
2. 安装 Node.js (推荐 v20+) 和 npm/pnpm。
3. 克隆项目后运行 `npm install` 安装依赖。

### 使用步骤
1. **启动应用**：运行 `npm run dev` 启动开发服务器，或使用 `./start.sh` 一键启动。
2. **载入文本**：点击侧边栏"源文本载入"，上传需要转换的 `.txt` 文件。
3. **配置 AI**：选择服务商。如使用自定义模型，需配置 `Base URL`、`Model Name` 及 `API Key`。
4. **选择滤镜**：
   - 从下拉菜单中选择一个心仪的作家风格
   - 点击 `☁️` 按钮访问**风格模板市场**，发现更多社区风格
   - 点击 `+` 号创建自己的专属提示词
5. **启动重塑**：点击"开启重塑"，矩阵将开始分段处理文本。
6. **导出成果**：处理完成后，点击"导出文件"保存为本地 TXT 文件。

### 🌐 风格市场使用指南

**浏览风格：**
- 打开风格市场（点击侧边栏的云朵图标 ☁️）
- 使用搜索框查找特定风格
- 通过标签筛选（如 #武侠 #科幻 #悬疑）
- 按热度、评分或最新排序

**导入风格：**
- 在市场中找到喜欢的风格
- 点击"导入"按钮
- 确认后即可在风格列表中使用

**分享风格：**
- 点击侧边栏的分享图标（📤）导出你的自定义风格
- 生成的 JSON 文件可以分享给其他用户
- 他人可以通过上传按钮（📥）导入你的风格包

## 📁 项目结构

```
NovaStyle/
├── src-tauri/          # Tauri 桌面应用配置
├── node_modules/       # 依赖包
├── .github/           # GitHub 工作流配置
├── aiService.ts       # Gemini AI 服务
├── geminiService.ts   # Gemini 服务封装
├── types.ts           # TypeScript 类型定义
├── App.tsx            # 主应用组件
├── StyleMarket.tsx    # 风格市场组件
├── index.tsx          # 入口文件
├── index.html         # HTML 模板
├── animations.css     # 自定义动画样式
└── ...
```

## ⚠️ 内存与存储说明

- **预览截断**：为了保证流畅度，界面显示的"重塑预览"不是完整内容，但导出时会包含**所有**已生成的文本。
- **自动保存**：应用会实时将进度保存在 LocalStorage。如果内容超过 4MB，应用将停止自动保存以保护浏览器性能，此时请务必及时导出文件。
- **环境变量**：通过 `.env` 文件配置 API 密钥和其他环境变量。

## 🔧 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# Tauri 桌面应用开发
npm run tauri dev

# Tauri 桌面应用打包
npm run tauri build
```

## 📝 更新日志

详细更新历史请查看 [CHANGELOG.md](CHANGELOG.md)

## 📜 声明

本工具仅作为文学创作辅助工具，用户在使用 AI 生成内容时应遵守相关法律法规及 AI 服务商的使用条款。严禁用于非法传播、侵权或违规内容的生成。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！请查看 [SECURITY.md](SECURITY.md) 了解安全报告流程。

---
*Developed with ❤️ for the literary community.*
