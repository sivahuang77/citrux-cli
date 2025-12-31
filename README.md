# 🍊 Citrux CLI: The Intelligent Terminal Architect

**Fresh Code, Deep Logic.**

Citrux
CLI 是一款專為現代軟體工程師打造的原創智慧終端介面（TUI）。它不僅僅是一個 AI 聊天框，而是深度植根於您本地開發環境的「智慧指揮中心」。透過自研的 SSE 流式傳輸引擎與多層級上下文管理系統，Citrux
CLI 讓您在終端機中就能與最強大的 LLM 協作，從事架構設計、代碼重構與自動化部署。

---

## 🚀 快速開始 (Quick Start)

### 1. 安裝 (Installation)

Citrux CLI 透過 GitHub 分發，確保您隨時掌握最前沿的智慧開發能力：

```bash
npm install -g https://github.com/sivahuang77/citrux-cli.git
```

### 2. 初始化 (Initialization)

啟動後，輸入以下指令開啟模型配置視窗：

```bash
/model
```

在這裡，您可以選取預設的模型供應商（如 DeepSeek 或 OpenAI）並配置您的金鑰。

### 3. 自動更新 (Stay Fresh)

Citrux 內建智慧更新檢查器。每次啟動時，它都會靜默檢查 GitHub 上的最新版本，並在有新版本時引導您一鍵升級。

---

## 🧠 核心技術：上下文管理引擎 (Context Engine)

Citrux
CLI 的卓越來源於它對您專案的「深度理解」。不同於傳統工具，Citrux 採用了**層級式記憶架構**。

### 📄 `CITRUX.md` 的力量

在專案中的任何目錄建立 `CITRUX.md`，即可定義該目錄的開發上下文：

- **全域記憶 (`~/.citrux/CITRUX.md`)**：存放您的通用代碼風格、常用的 API 慣用法。
- **專案記憶 (`/root/CITRUX.md`)**：定義專案架構、技術棧（如 Next.js,
  Rust）與安全性規範。
- **模組記憶 (`/root/src/auth/CITRUX.md`)**：針對特定業務邏輯提供詳細的上下文說明。

### 🎛️ 交互式管理器

使用 `/memory manage` 開啟視覺化管理介面。您可以：

- **動態開關**：視開發任務決定要讓 AI 載入哪些上下文。
- **路徑過濾**：排除無關的龐大目錄，節省 Token 並提升 AI 準確度。
- **持久化狀態**：您的管理選擇會自動儲存，重啟 CLI 後依然生效。

---

## 🤖 自動化代理與工具箱 (Agentic Tools)

Citrux
CLI 賦予 AI 「行動」的能力。當您提出請求時，AI 不僅會回答，還會擬定行動方案並調用內建工具：

### 🛠️ 核心工具一覽

- **`replace`
  (精密手術刀)**：AI 能在多行代碼中精準定位並替換邏輯，保持代碼縮排與風格一致。
- **`shell` (系統執行)**：在您的授權下，執行編譯指令、測試腳本或 Git 操作。
- **`web_search`
  (即時情報)**：當 AI 需要確認最新的 API 文件時，會自主搜尋網路並彙整結果。
- **`ls`, `grep`, `glob` (深度索引)**：像資深工程師一樣搜尋代碼庫中的特定模式。

### 🛡️ 安全授權機制 (Safety First)

所有的危險操作（如修改檔案、執行 shell）都必須經過您的確認。您可以透過
`/settings` 調整「自動授權」的級別。

---

## 🔌 多供應商支援 (Model Agnostic)

Citrux CLI 採用原創的 OpenAI 兼容適配器，支援以下平台：

- **OpenAI**: GPT-4o, o1 系列。
- **DeepSeek**: 極致性價比的推理模型 (V3 / R1)。
- **Google Gemini**: 原生支援 Flash 與 Pro 模型。
- **Ollama**: 完全本地運行的私有化 LLM。

**技術規格**：內建自研的 SSE 流式解析器，支援「工具調用積累」技術，確保在不穩定的網路環境下依然能精確執行複雜任務。

---

## 🖥️ 指令手冊 (Command Reference)

Citrux CLI 的強大功能皆整合在以下斜槓指令中：

| 指令類別 | 指令名稱           | 詳細說明                                       |
| :------- | :----------------- | :--------------------------------------------- |
| **系統** | `/model`           | 切換 LLM 供應商與具體模型。                    |
|          | `/settings`        | 進入全功能 TUI 設定介面。                      |
|          | `/help`            | 查看動態產生的功能說明。                       |
| **記憶** | `/memory manage`   | **(重點功能)** 視覺化管理 `CITRUX.md` 上下文。 |
|          | `/memory refresh`  | 手動觸發專案文件掃描與記憶同步。               |
|          | `/memory list`     | 列出目前正在影響 AI 決策的所有路徑。           |
| **對話** | `/chat reset`      | 清空對話歷史，重置 AI 的注意力。               |
|          | `/chat save [tag]` | 永久儲存目前的對話工作流。                     |
| **診斷** | `/tools`           | 顯示目前 AI 擁有的技能詳情與環境變數。         |
|          | `/stats`           | 顯示精準的 Token 使用量與費用預估。            |

---

## 🎨 Citrux Companion (IDE 整合)

我們為 VS Code 提供了 **Citrux Companion** 擴充套件。

- **變數同步**：自動同步 `CITRUX_CLI_IDE_*` 系列環境變數。
- **即時反映**：終端機中的修改建議可以即時套用至編輯器視窗。
- **雙向連動**：在編輯器中選取代碼，直接傳送至 Citrux 終端進行分析。

---

## 🔒 隱私與主權 (Privacy & Data)

您的代碼是您的資產。

- **本地儲存**：Citrux CLI 將所有資料存放在
  `~/.citrux/`，絕不將敏感金鑰上傳雲端。
- **.citruxignore**：您可以透過此檔案定義 AI 嚴禁讀取的機密目錄或檔案。

---

🍊 **Citrux CLI - Let's squeeze the code!**

_Ready to transform your development workflow?_  
[Install Now](https://github.com/sivahuang77/citrux-cli) | [Report a Bug](/bug)
