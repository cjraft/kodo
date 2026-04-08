<div align="center">

<pre>
██╗  ██╗ ██████╗ ██████╗  ██████╗ 
██║ ██╔╝██╔═══██╗██╔══██╗██╔═══██╗
█████╔╝ ██║   ██║██║  ██║██║   ██║
██╔═██╗ ██║   ██║██║  ██║██║   ██║
██║  ██╗╚██████╔╝██████╔╝╚██████╔╝
╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝ 
</pre>

**A terminal-native coding agent that lives in your command line.**

<p>
  <a href="https://www.npmjs.com/package/@cjraft/kodo"><img src="https://img.shields.io/npm/v/%40cjraft%2Fkodo?style=flat-square&color=0EA5E9" alt="npm version" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square&logo=nodedotjs" alt="Node.js" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-10B981?style=flat-square" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript" alt="TypeScript" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React" /></a>
  <a href="https://www.npmjs.com/package/@mariozechner/pi-ai"><img src="https://img.shields.io/badge/powered%20by-pi--ai-F97316?style=flat-square" alt="pi-ai" /></a>
</p>

</div>

---

Kodo is a local-first coding agent that runs in your terminal, talks to LLMs, and uses powerful tools to help you build software faster. Built with a clean layered architecture and a slick Ink-based TUI.

<div align="center">
  <img src="https://raw.githubusercontent.com/cjraft/kodo/main/assets/demo.gif" width="700" alt="Kodo Terminal UI Demo" />
  <p><sub>⚡️ Interactive terminal interface with streaming output and real-time feedback</sub></p>
</div>

---

## ✨ Features

| Feature                    | Description                                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| 🖥️ **Ink TUI**             | Responsive terminal interface with streaming output and smooth animations   |
| 🧠 **Agent Loop**          | Event-driven run lifecycle with session-scoped state management             |
| 🪝 **React Hooks**         | `useAgent()` React hook for stable UI state binding and session control     |
| 📡 **Event System**        | Session-scoped event bus: run-start, text-delta, tool-start/end, done, error|
| 🧩 **AGUI Compatible**     | Modular UI components (ConversationFeed, ExpandedPanel) — swappable design  |
| 💾 **Session Persistence** | Local storage with resumable sessions — never lose your work                |
| 🔌 **Multi-Provider**      | 20+ providers via pi-ai: OpenAI, Anthropic, Google, Groq, Mistral, and more |
| 🛠️ **Core Tools**          | Bash, FileRead, FileWrite, FileEdit — the essentials for coding             |
| 🏗️ **Clean Architecture**  | Explicit layers: UI → Agent → LLM / Context / Tool / Store                  |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js >= 22**

### Installation

```bash
npm install -g @cjraft/kodo
```

### Configure Your Provider

Create a `.env` file (or use environment variables):

```bash
# OpenAI or compatible endpoint
KODO_MODEL_PROVIDER=openai
KODO_MODEL_API_KEY=sk-...
KODO_MODEL_BASE_URL=https://api.openai.com/v1
KODO_MODEL_NAME=gpt-4.1-mini
```

> 💡 **Tip:** Copy `.env.example` as a starting point for more options.

### Launch Kodo

```bash
cd /your/project
kodo
```

Type your task and press Enter. Kodo plans, executes, and streams results back in real-time.

---

## ⌨️ Commands

| Command   | Description               |
| --------- | ------------------------- |
| `/resume` | Resume a previous session |
| `/help`   | Show available commands   |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UI Layer (Ink + React)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     AGUI Compatible Components                       │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │    │
│  │  │ ConversationFeed│  │ExpandedContent  │  │  CommandComposer    │ │    │
│  │  │   (Chat UI)     │  │    Panel        │  │  (Input/Commands)   │ │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                     React Hooks (use-agent.ts)                         │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
│  │   │  Session    │  │  Run Phase  │  │  Streaming  │  │   Resume   │  │  │
│  │   │  Binding    │  │   State     │  │   Text      │  │  Session   │  │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                               Agent Layer                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Event System (event-bus.ts)                    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │  run-start  │  │  text-delta │  │ tool-start  │  │   tool-end   │  │  │
│  │  │   status    │  │    error    │  │    done     │  │              │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                    Session Lifecycle (session.ts)                      │  │
│  │        Create · Load · Run Orchestration · State Management           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                🚧 Agent Lifecycle Hooks [TODO]                         │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │  │ onRunStart() │ │onToolStart() │ │ onToolEnd()  │ │ onRunEnd()   │  │  │
│  │  │              │ │              │ │              │ │              │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  │         🔮 支持拦截、修改、插件扩展的中间件机制（计划实现）             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼────────┐    ┌────────────▼─────────────┐    ┌───────▼────────┐
│   LLM Layer    │    │      Context Layer       │    │   Tool Layer   │
│ ┌────────────┐ │    │  ┌─────────────────────┐ │    │ ┌────────────┐ │
│ │  Providers │ │    │  │   Context Builder   │ │    │ │    Bash    │ │
│ │  (pi-ai)   │ │    │  │  (UserView/APIView) │ │    │ ├────────────┤ │
│ │ 20+ Models │ │    │  ├─────────────────────┤ │    │ │ FileRead   │ │
│ ├────────────┤ │    │  │   Token Budget      │ │    │ ├────────────┤ │
│ │   Retry    │ │    │  │  (Assembly/Enforce) │ │    │ │ FileWrite  │ │
│ │   Policy   │ │    │  ├─────────────────────┤ │    │ ├────────────┤ │
│ ├────────────┤ │    │  │  Compaction Strategy│ │    │ │ FileEdit   │ │
│ │Normalized  │ │    │  │ (Summarize/Truncate)│ │    │ └────────────┘ │
│ │   Types    │ │    │  └─────────────────────┘ │    └────────────────┘
│ └────────────┘ │    └──────────────────────────┘             │
└────────────────┘                                              │
        │                                                       │
        └───────────────────────────┬───────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                                Store Layer                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  Session Store      │  │  Artifact Store     │  │  Context Store      │  │
│  │  (Metadata/State)   │  │  (Tool Results)     │  │  (Serialization)    │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
│                                                                             │
│  Storage: .kodo/sessions/<sessionId>/                                       │
│           ├── session.json  (metadata)                                      │
│           ├── transcript.jsonl (messages)                                   │
│           └── artifacts/ (tool outputs)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Layered Boundaries** | UI → Agent → LLM/Context/Tool/Store — explicit dependency direction |
| **Event-Driven** | Agent events flow through EventBus; UI subscribes via hooks |
| **Session-Scoped** | All events and state are tied to a session, enabling multi-session support |
| **AGUI Compatible** | UI components are decoupled from agent implementation, swappable interface |
| **Type Safety** | Domain types, provider IO types, and UI view models are strictly separated |

---

## 📁 Sessions

Sessions are stored locally under `.kodo/sessions/<sessionId>/`.

- Each launch starts a fresh session
- Use `/resume` to jump back to previous sessions
- Full history and context preserved

---

## 🔧 Development

```bash
# Run with tsx (no build step)
pnpm dev

# Compile to dist/
pnpm build

# Run tests with vitest
pnpm test

# Run linter
pnpm lint

# Format code
pnpm format:write
```

---

## 📦 Supported Providers

Kodo is built on **[pi-ai](https://www.npmjs.com/package/@mariozechner/pi-ai)**, giving you access to **20+ LLM providers** out of the box:

### Major Providers

<p align="center">
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Google-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google" />
  <img src="https://img.shields.io/badge/Anthropic-191919?style=for-the-badge&logo=anthropic&logoColor=white" alt="Anthropic" />
  <img src="https://img.shields.io/badge/Kimi-0EA5E9?style=for-the-badge" alt="Kimi" />
  <br />
  <img src="https://img.shields.io/badge/xAI-000000?style=for-the-badge&logo=x&logoColor=white" alt="xAI" />
  <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge" alt="Groq" />
  <img src="https://img.shields.io/badge/Mistral-FF7000?style=for-the-badge" alt="Mistral" />
  <img src="https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white" alt="Azure" />
</p>

### All Supported Providers

| Category             | Providers                                                            |
| -------------------- | -------------------------------------------------------------------- |
| **Anthropic & AWS**  | `anthropic` (Claude), `amazon-bedrock`                               |
| **Google**           | `google` (Gemini), `google-vertex`, `google-gemini-cli`              |
| **OpenAI Ecosystem** | `openai`, `azure-openai-responses`, `openai-codex`, `github-copilot` |
| **Fast Inference**   | `groq`, `cerebras`, `mistral`                                        |
| **Chinese Models**   | `kimi-coding`, `minimax`, `minimax-cn`                               |
| **Routers**          | `openrouter`, `vercel-ai-gateway`                                    |
| **Other**            | `xai`, `huggingface`, `opencode`, `zai`                              |

> 💡 **Using any provider:** Set `KODO_MODEL_PROVIDER=<provider-id>` and configure the corresponding `KODO_MODEL_API_KEY` and `KODO_MODEL_BASE_URL`.

---

## 🤝 Contributing

Contributions are welcome! Please read [AGENTS.md](./AGENTS.md) for architecture guidelines and coding standards.

---

## 📄 License

[MIT](LICENSE) © Kodo Contributors

---

<div align="center">

**[⬆ Back to Top](#kodo)**

<sub>Built with ❤️ using [Ink](https://github.com/vadimdemedes/ink)</sub>

</div>
