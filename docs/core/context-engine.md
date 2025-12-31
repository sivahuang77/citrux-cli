# 🧠 核心技術：層級式上下文引擎 (Context Engine)

Citrux
CLI 的卓越不僅在於它能對話，更在於它能**深度連結**您的本地代碼資產。這背後的功臣就是我們的層級式上下文引擎。

## 📦 記憶的層級 (Memory Hierarchy)

Citrux 不會無差別地載入所有檔案，而是遵循一套**「由遠及近、權重疊加」**的邏輯：

1.  **全域層 (Global)**：
    - 路徑：`~/.citrux/CITRUX.md`
    - 用途：存放您的身分、通用開發風格（如「我喜歡使用 Functional
      Programming」）。
2.  **專案層 (Project Root)**：
    - 路徑：`[ProjectRoot]/CITRUX.md`
    - 用途：定義整個專案的技術棧、API 規範與資料庫架構。
3.  **子目錄層 (Sub-directory)**：
    - 路徑：`./CITRUX.md`
    - 用途：針對當前工作的特定模組（如「Auth 模組實作細節」）提供說明。

## 🔍 自動搜尋算法 (The Discovery Algorithm)

當您啟動 Citrux 時，引擎會執行以下動作：

1.  **向上遍歷**：從 CWD (當前目錄) 一路往上搜尋，直到找到 `.git`
    目錄或家目錄為止。
2.  **向下檢索**：在受信任的專案範圍內，根據路徑深度搜尋子目錄中的上下文。
3.  **彙整與格式化**：將所有找到的 Markdown 片段進行「語義標註」，讓 AI 清楚知道每一條訊息的出處及其影響範圍。

## 🧪 JIT 上下文載入 (Just-In-Time)

為了應對超大型專案，Citrux 支援 JIT 模式。當您提及某個特定檔案或目錄時，引擎才會即時索引並動態注入上下文，平衡了準確度與 Token 消耗。

---

_下一步：[探索 SSE 流式傳輸引擎](./streaming.md)_
