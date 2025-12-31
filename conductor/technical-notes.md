# Citrux CLI - Technical Notes & Architecture

## 1. Project Overview
**Citrux CLI** is a custom AI Developer Assistant, retrofitted from `google-gemini/gemini-cli`. It features a unique Citrux brand identity and a multi-provider LLM architecture.

## 2. Branded Configuration
- **Version**: 0.1.0
- **Storage Directory**: `~/.citrux/` (Isolated from `~/.gemini/`)
- **Context File**: `CITRUX.md`
- **Ignore File**: `.citruxignore`
- **Branded Colors**: Orange Gradient (#FFB347, #FF8C00, #FF4500)

- **OpenAI Compatible**: Custom adapter (`OpenAIContentGenerator`) for OpenAI, DeepSeek, Groq, and Ollama. Supports real SSE streaming with tool call accumulation.

## 4. Multi-Provider Architecture
The system uses a translation layer to support multiple LLM backends:
- **Google Gemini**: Default provider via Google AI SDK.
- **OpenAI Compatible**: 
    - **Streaming**: Uses `node:readline` to parse SSE chunks (`data: {...}`).
    - **Tool Calls**: Accumulates partial JSON arguments from the stream and yields complete `functionCall` objects only when finished or when `finish_reason` is signaled.
- **Dynamic Switching**: Managed via `/model` command or `CITRUX_PROVIDER` env var.

## 4. Environment Variables (Isolated)
- `CITRUX_API_KEY`: Primary API key for the active provider.
- `CITRUX_MODEL`: Preferred model name.
- `OPENAI_API_BASE`: Custom URL for OpenAI-compatible proxies (e.g., DeepSeek, Ollama).

## 5. Build & Distribution
- **Bundler**: `esbuild` producing `bundle/citrux.js`.
- **Installation**: Global command via `npm link` or `npm install -g <tgz>`.
- **Shebang**: Fixed `#!/usr/bin/env node` at line 1.
