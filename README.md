<div align="center">

# ⚡ ZETA AI

### Autonomous OS Intelligence Layer

[![License: MIT](https://img.shields.io/badge/License-MIT-8b5cf6.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-30-47848f?logo=electron)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.0-4285f4?logo=google)](https://aistudio.google.com)
[![Groq](https://img.shields.io/badge/AI-Llama%203.3-f97316)](https://groq.com)

**ZETA is not a chatbot. It is an autonomous execution layer for your operating system.**

*Write code → it saves to disk. Say "search the web" → it scrapes and synthesizes. Say "build me a website" → it generates and opens it. Say "click that button" → it moves your mouse.*

---

</div>

## 📸 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ZETA AI                                  │
├─────────────────┬───────────────────────┬────────────────────────┤
│  Renderer (UI)  │   Preload (Bridge)    │   Main (Backend)       │
│  React + Zust.  │   IPC type-safe API   │   Electron + Node.js   │
│  Tailwind CSS   │   window.zeta.*       │   Agents + OS Control  │
└─────────────────┴───────────────────────┴────────────────────────┘
                                                   │
                    ┌──────────────────────────────┤
                    ▼                              ▼
         ┌─────────────────┐            ┌──────────────────┐
         │   AI Agents     │            │   OS Layer       │
         │  Orchestrator   │            │  nut.js mouse    │
         │  Coder Agent    │            │  keyboard ctrl   │
         │  Web Agent      │            │  screenshots     │
         │  RAG Agent      │            │  file system     │
         │  Site Builder   │            │  window mgmt     │
         └─────────────────┘            └──────────────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
  Gemini 2.0 Flash      Llama 3.3 70B
    (Google AI)            (Groq)
```

## ✨ Features

### 🤖 AI Agents
| Agent | What it does |
|-------|-------------|
| **Auto** | Smart routing — picks the right agent for your request |
| **Coder** | Writes complete code files to disk, opens them in your IDE |
| **Web** | Searches the internet, scrapes pages, synthesizes results |
| **Memory** | Indexes your local files, answers questions from them (RAG) |
| **Builder** | Generates full HTML/CSS/JS websites and opens them instantly |
| **OS Control** | Moves your mouse, types text, presses shortcuts, manages windows |

### 🖥️ OS Capabilities
- 🖱️ Mouse movement and clicking at exact coordinates
- ⌨️ Text typing and keyboard shortcut injection
- 🪟 Window listing, focusing, and management
- 📸 Screen capture and OCR text extraction
- 📂 Full file system access (read, write, delete, open)
- 🚀 Open files in default apps or VS Code

### 🔒 Security
- **100% local** — your keys never leave your machine
- **OS Keychain encryption** via Electron `safeStorage`
- **Zero telemetry** — no analytics, no phone-home
- **BYOK** — Bring Your Own API Keys

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/bilalaleem5/ZETAAI.git
cd ZETAAI
npm install
```

### 2. Configure API Keys

```bash
# Option A: Run the app and use the built-in Vault UI (recommended)
npm run dev
# Click "VAULT" in the title bar → add your keys

# Option B: .env file (dev only, never commit)
cp .env.example .env
# Edit .env with your keys
```

**Required keys:**
- `GEMINI_API_KEY` → [Get from Google AI Studio](https://aistudio.google.com/app/apikey)
- `GROQ_API_KEY` → [Get from Groq Console](https://console.groq.com/keys)

**Optional:**
- `TAVILY_API_KEY` → [Get from Tavily](https://app.tavily.com) — enables deep web research

### 3. Run

```bash
# Development
npm run dev

# Production build
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

---

## 📁 Project Structure

```
ZETAAI/
├── src/
│   ├── main/                          # Electron Main Process (Node.js)
│   │   ├── index.ts                   # App entry, window creation
│   │   ├── agents/                    # AI Agent implementations
│   │   │   ├── aiClient.ts            # Unified Gemini/Groq streaming client
│   │   │   ├── orchestratorAgent.ts   # Master router + OS action executor
│   │   │   ├── coderAgent.ts          # Code writing + file saving agent
│   │   │   ├── webAgent.ts            # Search + scrape + synthesize agent
│   │   │   ├── ragAgent.ts            # Document Q&A agent
│   │   │   └── websiteBuilderAgent.ts # Full site generation agent
│   │   └── ipc/                       # IPC handler layer
│   │       ├── index.ts               # Handler registry
│   │       └── handlers/              # Individual tool handlers
│   │           ├── agentHandler.ts    # Chat routing
│   │           ├── osControlHandler.ts # Mouse/keyboard/windows
│   │           ├── fileSystemHandler.ts # File operations
│   │           ├── webIntelligenceHandler.ts # Search + scrape
│   │           ├── screenCaptureHandler.ts   # Screenshots + OCR
│   │           ├── securityHandler.ts # Encrypted vault
│   │           └── ragMemoryHandler.ts # Vector store
│   ├── preload/
│   │   └── index.ts                   # Secure IPC bridge (window.zeta.*)
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── App.tsx                # Root layout
│           ├── store/index.ts         # Zustand state management
│           ├── hooks/useChat.ts       # Chat + streaming hook
│           ├── styles/globals.css     # Design system
│           └── components/
│               ├── chat/              # ChatView, MessageBubble, ChatInput, WelcomeScreen
│               ├── sidebar/           # Sidebar with agent/model selector
│               └── ui/                # TitleBar, SettingsModal
├── package.json
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
└── .env.example
```

---

## 🧠 How Agents Work

### Auto Mode (Default)
ZETA analyzes your message and decides:
1. Does this need web search? → Web Agent
2. Does this need code? → Coder Agent
3. Is this an OS action? → Executes directly
4. Otherwise → Orchestrator handles it

### Streaming
Every agent streams tokens back to the UI in real-time using Electron IPC events. The UI renders markdown including code blocks with syntax highlighting as the response streams in.

### RAG Memory
1. You give ZETA a folder or file path in Settings → Memory
2. It reads all supported files and chunks the text
3. Each chunk gets a lightweight TF-based embedding
4. When you ask a question in Memory mode, it finds the most relevant chunks via cosine similarity and injects them as context

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Follow the existing patterns (IPC handler → agent → renderer hook)
4. Test OS control features on your target platform
5. Submit a PR with a clear description

---

## ⚠️ Disclaimer

ZETA AI has deep system-level access. It can move your mouse, type text, read and write files, and control applications. Use responsibly. The maintainers are not liable for misuse.

---

## 📜 License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

Built by **[bilalaleem5](https://github.com/bilalaleem5)** · Inspired by IRIS-AI, OpenJarvis, and Claw Code

*⚡ Execution over conversation. Local-first. Zero trust.*

</div>
