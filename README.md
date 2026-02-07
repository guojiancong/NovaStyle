# NovaStyle - 文学风格重塑矩阵

NovaStyle 是一款专为创作者、阅读爱好者和研究者设计的桌面级文本风格转换工具。它能够利用最先进的 AI 模型（如 Google Gemini 3, DeepSeek, Qwen 等），将长篇小说或散文内容按照指定的文学大家风格进行深度重构。

![NovaStyle UI](https://img.shields.io/badge/UI-Glassmorphism-blue)
![AI-Powered](https://img.shields.io/badge/AI-Gemini%20%7C%20OpenAI--Compatible-orange)
![Memory-Safe](https://img.shields.io/badge/Performance-Memory--Safe-green)

## 🌟 核心特性

- **🎭 深度拟态重塑**：预设金庸、古龙、鲁迅、张爱玲、海明威等数十种文学风格滤镜。
- **🚀 多模型支持**：
  - **原生 Gemini**：支持 Gemini 3 Flash/Pro，享受极致的逻辑与文学素养。
  - **OpenAI 兼容**：可自由配置 DeepSeek、通义千问等国内外主流大模型。
- **🛡️ 结构圣域保护**：内置智能识别算法，重塑过程中自动保留“第x章”等章节标题，确保作品结构不乱。
- **💾 内存安全矩阵 (Memory-Safe)**：
  - **虚拟化渲染**：无论源文件多大，预览窗口仅渲染最近生成的 50,000 字，有效防止大规模文本导致的浏览器卡顿。
  - **非响应式流存**：核心数据采用 `useRef` 存储，避开 React 虚拟 DOM 对比开销。
- **🛠️ 生产力工具集**：
  - **自动探测编码**：智能识别 UTF-8 与 GBK，告别中文乱码。
  - **断点续传**：任务意外中断或手动停止后，支持从上一次进度继续。
  - **双屏对比视图**：左右分栏，直观查看原文与重塑效果的差异。

## 🛠️ 技术栈

- **前端框架**：React 19 (Hooks / Context)
- **样式方案**：Tailwind CSS (响应式、毛玻璃效果)
- **图标系统**：Lucide React
- **AI 集成**：@google/genai & Fetch API (OpenAI Stream)

## 🚀 快速开始

### 环境准备
1. 确保已获得 **Google Gemini API Key** 或其他支持 OpenAI 协议的 API Key。
2. 应用运行环境会自动注入 `process.env.API_KEY` 用于 Gemini 调用。

### 使用步骤
1. **载入文本**：点击侧边栏“源文本载入”，上传需要转换的 `.txt` 文件。
2. **配置 AI**：选择服务商。如使用自定义模型，需配置 `Base URL`、`Model Name` 及 `API Key`。
3. **选择滤镜**：从下拉菜单中选择一个心仪的作家风格。你也可以点击 `+` 号创建自己的专属提示词。
4. **启动重塑**：点击“开启重塑”，矩阵将开始分段处理文本。
5. **导出成果**：处理完成后，点击“导出文件”保存为本地 TXT 文件。

## ⚠️ 内存与存储说明

- **预览截断**：为了保证流畅度，界面显示的“重塑预览”不是完整内容，但导出时会包含**所有**已生成的文本。
- **自动保存**：应用会实时将进度保存在 LocalStorage。如果内容超过 4MB，应用将停止自动保存以保护浏览器性能，此时请务必及时导出文件。

## 📜 声明

本工具仅作为文学创作辅助工具，用户在使用 AI 生成内容时应遵守相关法律法规及 AI 服务商的使用条款。严禁用于非法传播、侵权或违规内容的生成。

---
*Developed with ❤️ for the literary community.*