# 🛠️ 開發者貢獻指南 (Contributing)

歡迎加入 Citrux CLI 的開發社群！本指南將協助您建立開發環境並提交您的貢獻。

## 環境建置

1.  **複製專案**：
    ```bash
    git clone https://github.com/sivahuang77/citrux-cli.git
    ```
2.  **安裝依賴**：
    ```bash
    npm install
    ```
3.  **本地運行**：
    ```bash
    npm start
    ```

## 測試規範

我們使用 **Vitest** 作為測試框架。

- **單元測試**：針對核心邏輯 (`packages/core`)。
- **整合測試**：針對 CLI 互動與工具調用。
- **指令**：`npm test`

## 提交規範 (Git Hooks)

我們使用 Husky 確保提交前的代碼品質。所有的提交訊息建議遵循 Conventional
Commits 規範（如 `feat:`, `fix:`, `docs:`）。

---

# 📅 發佈日誌 (Releases)

### v0.1.0 (2026-01-01)

- **品牌重塑**：正式從 Citrux CLI 轉型為 Citrux CLI。
- **全新架構**：實作 SSE 流式引擎與工具調用積累。
- **管理工具**：新增 `/memory manage` 視覺化管理器。
- **多模型**：完整支援 OpenAI 與 DeepSeek 推理模型。
