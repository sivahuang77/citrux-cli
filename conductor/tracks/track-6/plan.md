# Track 6: Open Flexibility - Dynamic LLM Providers

**Status**: Planning **Owner**: Citrux CLI Team

## 1. Objective

Enable users to dynamically add, configure, and switch between arbitrary LLM
providers (OpenAI-compatible) directly from the CLI interface, matching the
flexibility of OpenCode.

## 2. Current State

- `ModelDialog.tsx` has hardcoded providers: Gemini, OpenAI, DeepSeek, Custom.
- "Custom" is a single slot; changing it overwrites previous settings.
- Settings are stored in an ad-hoc `llm` property that isn't formally defined in
  `settings.schema.json`.

## 3. Proposed Solution

### A. Settings Schema (`schemas/settings.schema.json`)

Formalize the `llm` configuration section:

```json
"llm": {
  "title": "LLM Configuration",
  "type": "object",
  "properties": {
    "provider": {
      "type": "string",
      "description": "Active provider key (e.g. 'gemini', 'openai', 'my-local-ollama').",
      "default": "gemini"
    },
    "providers": {
      "type": "object",
      "description": "Map of provider configurations.",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "baseUrl": { "type": "string" },
          "apiKey": { "type": "string" },
          "model": { "type": "string" },
          "label": { "type": "string" }
        }
      }
    }
  }
}
```

### B. Core Logic (`packages/core`)

- Update `OpenAIContentGenerator` to:
  1. Read `config.llm.provider`.
  2. If it's not 'gemini', look up `config.llm.providers[provider]`.
  3. Use the found `baseUrl`, `apiKey`, and `model`.

### C. UI Implementation (`packages/cli/src/ui/components/ModelDialog.tsx`)

Refactor the dialog into a dynamic list:

1.  **Provider List**:
    - **Gemini** (Built-in)
    - **OpenAI** (Built-in preset)
    - **DeepSeek** (Built-in preset)
    - _[User Defined Provider A]_
    - _[User Defined Provider B]_
    - **+ Add New Provider**

2.  **Add/Edit Provider Wizard**:
    - Step 1: **Name** (ID for the config, e.g., "ollama").
    - Step 2: **Base URL** (e.g., "http://localhost:11434/v1").
    - Step 3: **API Key** (optional).
    - Step 4: **Default Model** (e.g., "llama3").

3.  **Actions**:
    - **Select**: Sets as active.
    - **Edit**: Modifies URL/Key.
    - **Delete**: Removes custom provider.

## 4. Implementation Steps

- [ ] **Step 1**: Update `schemas/settings.schema.json` to include `llm`
      definition.
- [ ] **Step 2**: Regenerate settings types (if applicable/needed).
- [ ] **Step 3**: Update `OpenAIContentGenerator.ts` to respect dynamic
      `llm.providers`.
- [ ] **Step 4**: Refactor `ModelDialog.tsx` to support the CRUD operations for
      providers.
