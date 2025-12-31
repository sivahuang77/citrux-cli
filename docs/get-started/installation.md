# 🚀 安裝與快速入門

本指南將協助您在幾分鐘內完成 Citrux CLI 的安裝與基礎配置。

## 📦 系統需求

- **Node.js**: v18.0.0 或更高版本。
- **作業系統**: macOS (Intel/M1), Linux, 或 Windows (PowerShell/WSL2)。
- **Git**: 用於版本管理與自動更新。

## 🛠️ 安裝步驟

### 1. 全域安裝

Citrux CLI 透過 GitHub 分發，確保您獲得的是最新開發成果：

```bash
npm install -g https://github.com/sivahuang77/citrux-cli.git
```

### 2. 驗證安裝

安裝完成後，在終端輸入：

```bash
citrux
```

如果看到橘色的 Citrux 標誌，代表安裝成功。

## ⚙️ 模型配置

首次啟動後，您需要配置 LLM 供應商。輸入：

```bash
/model
```

在彈出的視窗中：

1.  **選擇供應商**：OpenAI, DeepSeek, Google 或 Custom。
2.  **輸入 API Key**：Citrux 會安全地將其儲存在 `~/.citrux/settings.json`。
3.  **選取型號**：如 `deepseek-reasoner` 或 `gpt-4o`。

## 📄 設定您的第一個專案

在您的專案根目錄建立 `CITRUX.md`，內容範例：

```markdown
# 專案規範

- 框架：Vite + React
- 禁止使用：`any` 型別
```

這將讓 Citrux 在處理該專案的對話時自動載入這些限制。

---

_下一步：[探索完整指令參考](../cli/commands.md)_
