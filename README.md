# Citrux CLI 🍊

[![Citrux CLI](https://img.shields.io/badge/Citrux-CLI-orange.svg)](https://github.com/sivahuang77/citrux-cli)
[![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)](https://github.com/sivahuang77/citrux-cli)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/sivahuang77/citrux-cli/blob/main/LICENSE)

Citrux CLI 是一個專為開發者設計的終端 AI 助手， retrofitted from `google-gemini/gemini-cli`。它擁有獨特的橘色品牌識別，並支援多種 LLM 供應商（如 DeepSeek, Ollama, Google Gemini），提供流暢的串流輸出體驗。

## 🚀 為什麼選擇 Citrux CLI?

- **🧠 多模型大腦**：原生支援 Google Gemini，並透過 OpenAI 相容轉接層支援 **DeepSeek (V3/R1)**、**Ollama** 等端點。
- **⚡️ 優化串流體驗**：針對所有供應商優化了逐字（Token-by-token）輸出，顯示更加平滑流暢。
- **🔧 強大內建工具**：支援檔案操作、Shell 指令執行、Google Search Grounding 及 Web Fetch。
- **🔌 MCP 支援**：完全相容 Model Context Protocol (MCP)，可無限擴充功能。
- **🔒 環境隔離**：所有設定與紀錄存放於 `~/.citrux`，與原始 Gemini CLI 完全獨立。

## 📦 安裝說明

### 系統需求
- Node.js 版本 20 或更高
- macOS, Linux, 或 Windows

### 快速安裝 (透過 GitHub)

如果您想直接安裝最新版本的 Citrux CLI，請在終端機執行：

```bash
npm install -g https://github.com/sivahuang77/citrux-cli.git
```

安裝完成後，直接輸入 `citrux` 即可啟動。

## ⚙️ 快速上手

### 1. 啟動 Citrux
```bash
citrux
```

### 2. 切換模型與供應商
輸入 `/model` 進入互動選單，您可以：
- 設定 **OpenAI / DeepSeek** 的 API Key 與 Base URL。
- 切換為本地端的 **Ollama**。
- 選擇預設的 **Google Gemini** 模型。

### 3. 使用專屬上下文檔案
Citrux 會優先讀取目錄下的 `CITRUX.md` 作為專案上下文，幫助 AI 更了解您的開發需求。

## 🛠 開發進度與計畫 (Track 4)

- [x] **品牌重塑**：橘色主題色與專屬 ASCII Logo。
- [x] **多供應商轉接**：實作 `OpenAIContentGenerator`。
- [x] **串流輸出優化**：平滑化非 Google 供應商的文字輸出。
- [ ] **VS Code 插件**：開發專屬的 Citrux 品牌 IDE 助手 (進行中)。
- [ ] **自動更新**：Citrux 版本自動檢查機制 (規劃中)。

## 🤝 貢獻與反饋

歡迎提交 Issue 或 Pull Request！我們致力於打造最懂開發者的終端 AI 工具。

---

<p align="center">
  Built with 🍊 by Citrux Community
</p>