## 7. Suggested Future Actions (Post-v0.1.0)

The following initiatives are suggested to further enhance Citrux CLI's
capabilities and ecosystem:

### 🚀 Citrux Cloud (Deployment & Ops)

- **Goal**: Transform CLI from a dev tool to a devops platform.
- **Key Features**:
  - `/deploy`: One-click deployment to user servers (e.g., cloudGarage).
  - **SSH/Key Management**: Secure handling of remote server credentials.
  - **Remote Dashboard**: Monitor CPU/Memory of remote instances via TUI.

### 🧠 Core Intelligence Enhancements

- **Local RAG (Vector Search)**: Integrate `sqlite-vec` or `duckdb` to index the
  entire codebase, not just `CITRUX.md`. This allows the AI to answer questions
  like "Where is the auth logic?" without manual file selection.
- **Model Templates**: Optimize output formatting for specific reasoning models
  (e.g., DeepSeek R1 chain-of-thought display).

### 🛡️ Security Fortification

- **Local Key Vault**: Encrypt API keys at rest using system keychains (keytar)
  instead of plain text JSON.
- **Sensitive Data Scanner**: Pre-flight check for prompts to prevent accidental
  leakage of secrets (e.g., `sk-` keys).

### 🧩 Ecosystem Expansion

- **Extension Marketplace**: A CLI-based store (`/extensions browse`) to find
  and install community plugins from GitHub.
- **NPM Publishing**: Publish `@citrux/cli` to npm registry for easier
  installation (`npm i -g @citrux/cli`).
- **Web Presence**: Deploy `doc.html` to a public website (Vercel/GitHub Pages).

### ⚡ Automation & Workflows

- **AI Pre-commit Hook**: A Git hook that runs Citrux to scan staged files for
  bugs or style violations before commit.
- **Custom Workflows**: Allow users to define macro commands (e.g., "Refactor &
  Test" = `/chat "refactor this" && npm test`).

## 8. Competitive Analysis: OpenCode vs Citrux

Analysis of `sst/opencode` features and how to apply them to Citrux:

- **Provider Agnostic**:
  - _OpenCode_: Supports Claude, OpenAI, Google, Local.
  - _Citrux_: Supported (Track 2). We should ensure adding new providers is
    trivial via TUI.
- **Agent Modes (Switchable)**:
  - _OpenCode_: Built-in agents switchable via Tab key.
  - _Citrux Proposal_: Implement "Personas" (e.g., Coder, Architect, QA) that
    change the system prompt and available tools. Toggle via TUI shortcut.
- **LSP Integration**:
  - _OpenCode_: "Out-of-the-box LSP support".
  - _Citrux Proposal_: Investigate `vscode-languageserver-node` integration to
    allow the agent to "Go to Definition" or "Find References" natively,
    improving upon regex-based search.
- **Client/Server Architecture**:
  - _OpenCode_: Runs as a server, drivable remotely.
  - _Citrux Proposal_: Leverage `packages/a2a-server` to allow remote control
    (e.g., from a mobile app or web dashboard).
