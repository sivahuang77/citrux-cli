# 🧩 擴充功能與插件開發 (Extensions)

Citrux
CLI 是一個開放的平台。您可以透過編寫自定義擴充（Extensions）來擴充 AI 的工具箱。

## 擴充的組成

一個典型的 Citrux 擴充包含以下要素：

1.  **工具定義 (Tool Definition)**：描述工具的參數（JSON Schema）與用途。
2.  **執行邏輯 (Action)**：當 AI 調用該工具時，本地執行的 JavaScript/TypeScript 代碼。
3.  **上下文檔案 (Context)**：隨擴充附帶的 Markdown 檔案，告訴 AI 如何使用這些新技能。

## 開發流程

1.  **建立目錄**：在 `~/.citrux/extensions/` 下建立您的插件目錄。
2.  **實作介面**：實作 `CitruxTool` 類別。
3.  **註冊指令**：在 `extension.json` 中配置啟動參數。

---

# ⚓ 生命週期 Hooks

Hooks 允許您在 AI 運行的特定時間點插入邏輯。

### 支援的事件類型

- `BeforeModel`：在傳送請求給模型前執行（可用於對 Prompt 進行敏感詞過濾）。
- `AfterModel`：在模型回傳後、顯示前執行（可用於對輸出進行格式化）。
- `AfterTool`：在原子工具執行完畢後執行（可用於清理暫存檔）。

---

_下一步：[IDE 整合手冊](../ide-integration/vscode.md)_
