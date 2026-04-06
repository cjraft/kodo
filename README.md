# Kodo

A local coding agent with a terminal UI, built on a clean layered architecture.

Kodo runs in your terminal, talks to an LLM, and uses a small set of tools (bash, file read/write/edit) to work through coding tasks.

---

## Installation

**Requirements:** Node.js >= 22

```bash
npm install -g kodo
```

## Provider Setup

Kodo requires an explicit LLM provider at startup. Configure via environment variables or a `.env` file (copy `.env.example` as a starting point).

**OpenAI or compatible endpoint**

```bash
MODEL_PROVIDER=openai
MODEL_API_KEY=sk-...
MODEL_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4.1-mini
```

**Kimi Code**

```bash
MODEL_PROVIDER=kimi
MODEL_API_KEY=...
MODEL_BASE_URL=https://api.kimi.com/coding/
MODEL_NAME=k2p5              # Kimi K2.5
MODEL_REASONING_EFFORT=medium
MODEL_MAX_OUTPUT_TOKENS=32768
MODEL_CONTEXT_WINDOW=262144
```

## Usage

Launch kodo in a project directory:

```bash
cd /your/project
kodo
```

Type your task in the prompt and press Enter. Kodo will plan, call tools, and stream output back in the terminal.

**Slash commands**

| Command   | Description               |
| --------- | ------------------------- |
| `/resume` | Resume a previous session |
| `/help`   | Show available commands   |

## Sessions

Sessions are stored under `.kodo/sessions/<sessionId>/`. Each launch starts a fresh session. Use `/resume` to jump back to a previous one.

## Features

- **Ink TUI** — responsive terminal interface with streaming output
- **Agent loop** — event-driven run lifecycle with session-scoped state
- **Session persistence** — sessions are saved locally and resumable
- **Multi-provider** — OpenAI-compatible endpoints + Kimi Code
- **Core tools**: `Bash`, `FileRead`, `FileWrite`, `FileEdit`

---

## Development

```bash
pnpm dev        # run with tsx (no build step)
pnpm build      # compile to dist/
pnpm test       # run tests with vitest
pnpm lint       # eslint
```

Kodo is organized into explicit layers: `UI (Ink) → Agent → LLM / Context / Tool / Store`. See [AGENTS.md](./AGENTS.md) for architecture guardrails.

## License

MIT
