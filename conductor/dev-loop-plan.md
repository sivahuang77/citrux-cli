# Citrux CLI: `dev-loop` 技術設計與實作計畫 (v2 - 計畫導向型)

## 1. 目標 (Objective)

實作一個結構化的 `dev-loop` 模式。此模式強制要求在開始任何自動循環前，必須先透過
`/dev-loop:initiate`
建立明確的計畫文件。這能確保 AI 的行為有跡可循，且使用者能完整掌握 AI 的目標與限制。

## 2. 核心機制 (Mechanism)

### A. 初始化階段 (`/dev-loop init`)

1. 使用者輸入 `/dev-loop init`。
2. Agent 進入引導模式，詢問以下內容：
   - **Plan Description**: 計畫的詳細內容。
   - **Plan Goal**: 完成標準（包含具體的驗證指令，如 `npm test`）。
   - **Max Retries**: 最大重試次數（預設 5 次）。
3. Agent 生成計畫文件 `dev-loop-[TIMESTAMP].md`。

### B. 啟動與執行階段 (`/dev-loop run`)

1. 使用者執行 `/dev-loop run [PLAN_FILE_PATH]`。
2. 系統讀取計畫文件並載入配置。
3. **執行循環**：Gemini 執行任務 -> 系統自動驗證 -> 若失敗且未達上限，餵回錯誤並重試。

## 3. 計畫文件格式 (`dev-loop-xxxxx.md`)

````markdown
# Dev Loop Plan: [TITLE]

- **Timestamp**: 2026-01-02 10:00:00
- **Status**: Pending
- **Max Retries**: 5

## Description

[計畫詳細描述]

## Completion Criteria (Verification Command)

```bash
[驗證指令]
```
````

## Execution Log

- [Iteration 1]: ...

```

## 4. 變更詳情 (Proposed Changes)

### A. 指令定義 (`packages/cli/src/ui/commands/devLoopCommand.ts`)
- 新增 `initiate` 子指令。
- 實作互動式 Prompt 邏輯。
- 實作文件寫入邏輯。

### B. 核心邏輯整合 (`packages/cli/src/ui/hooks/useGeminiStream.ts`)
- 修改 `dev_loop` 處理分支，使其能從 Markdown 文件中解析任務與驗證指令。
- 在循環過程中更新 Markdown 文件的日誌部分。

## 5. 實作計畫 (Action Items)

### Phase 1: 引導模式與文件生成
- [ ] 實作 `/dev-loop:initiate` 的互動流程。
- [ ] 實作 `dev-loop-xxxxx.md` 的模板生成。

### Phase 2: 文件驅動執行
- [ ] 讓 `/dev-loop` 支持讀取 `.md` 計畫文件。
- [ ] 整合現有的循環驗證邏輯。

### Phase 3: 日誌同步
- [ ] 確保每一輪迭代的結果都會寫入計畫文件的 `Execution Log` 區塊。
```
