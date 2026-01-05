# Citrux CLI Project Context

This is the `CITRUX.md` file for the Citrux CLI project itself. It is used by
the Citrux CLI (when running in this directory) to understand its own codebase.

## Project Philosophy

- **Identity**: This is Citrux CLI, distinct from Gemini CLI.
- **Config**: Uses `.citrux/` for settings and `CITRUX.md` for context.
- **Architecture**: Monorepo with `packages/core` (logic) and `packages/cli`
  (UI).

## Development Rules

- See `CONTRIBUTING.md` for contribution guidelines.
- Use `npm run preflight` before checking in code.
