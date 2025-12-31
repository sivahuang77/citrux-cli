# 💻 IDE 整合：Citrux Companion

**Citrux Companion** 是專為 VS
Code 設計的擴充套件，它將您的開發環境與終端智慧深度綁定。

## 核心亮點

### 1. 環境變數同步

Companion 會自動偵測您在 VS Code 中開啟的專案環境，並將 `CITRUX_CLI_IDE_PATH`
等關鍵變數傳入 CLI 核心，確保 AI 能精確識別您的編輯器上下文。

### 2. 即時代碼傳送 (Selection Sync)

在編輯器中選取一段代碼，按鍵觸發後該段代碼會自動作為上下文傳送至 Citrux 終端。

### 3. 一鍵應用修改 (Quick Apply)

當 Citrux 終端生成代碼修改建議時，編輯器視窗會出現「Apply」按鈕，讓您無需複製貼上即可套用變更。

## 配置步驟

1.  在 VS Code 擴充市場搜尋 `Citrux Companion`。
2.  安裝後，在 `settings.json` 中配置 CLI 的路徑（通常為 `citrux`）。
3.  重啟終端機與 IDE 即可完成對接。

---

_下一步：[開發者貢獻指南](../development/contributing.md)_
