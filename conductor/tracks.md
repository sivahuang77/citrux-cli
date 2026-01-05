# Citrux CLI - Development Tracks

## Track 1: Foundation & Branding (Completed)

- [x] Fork and Rebrand to Citrux.
- [x] Fix ASCII Logo and Color Theme.
- [x] Setup directory isolation (`~/.citrux`).
- [x] Set version to 0.1.0.

## Track 2: Multi-LLM Brain (Completed)

- [x] Implement OpenAI-compatible adapter.
- [x] Support DeepSeek and Ollama endpoints.
- [x] Interactive API Key configuration in `/model`.

## Track 3: Cleanup & Refinement (Completed)

- [x] Remove `/docs` and `/bug`.
- [x] Disable/Hide Sandbox features.
- [x] Fix Shebang and packaging issues.

## Track 4: Advanced Features (Completed)

- [x] **Enhanced Streaming**: Smooth token-by-token output for non-Google
      providers.
- [x] **Enhanced Telemetry**: Precise token usage tracking for non-Google
      providers.
- [x] **Context Manager**: Interactive TUI for visual selection of files in
      `CITRUX.md`.
- [x] **Auto-updater**: Custom update check for Citrux releases.
- [x] **VS Code Extension**: Branded version of the IDE companion.
- [x] **Brand Cleanup Sweep**: Thorough isolation of env vars, paths, and
      storage from Gemini CLI.

## Track 5: Future Roadmap (Planned)

- [ ] **Citrux Cloud Deployment**: Built-in tools for deploying to
      cloudGarage/citrux.ai.
- [ ] **Extension Marketplace**: Command to browse and install extensions from
      GitHub.

## Track 6: Open Flexibility (Proposed)

Inspired by OpenCode, aiming for maximum developer ergonomics and openness:

- [ ] **Agent Switcher TUI**: UI to toggle between "Coder", "Architect",
      "Reviewer" modes (system prompts + tools).
- [ ] **LSP Integration**: Add Language Server Protocol support for semantic
      code understanding (Go to Def, Find Refs).
- [ ] **Dynamic Provider Config**: Interactive TUI wizard to add/edit custom
      providers at runtime without JSON editing.
