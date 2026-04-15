# ⚡ ZETA AI — Voice AI OS Assistant v2.0

> A human-like AI companion + autonomous OS intelligence layer + real-world assistant.
> Inspired by JARVIS. Built for real execution.

---

## 🎯 What is ZETA AI?

ZETA AI is a **desktop AI assistant** built with Electron + React + TypeScript:

| Capability | Description |
|---|---|
| 🗣️ **Talks like a human** | Casual chat, Urdu/Hinglish support, emotional responses |
| 🎤 **Voice-controlled** | Say "ZETA", double-clap, or click to activate |
| ⚡ **OS automation** | Open apps, mouse/keyboard, screenshots, screen reading |
| 🌍 **Real-world intel** | Live weather, news, calendar & reminders |
| 🧠 **7 AI agents** | Auto, Coder, Web, Memory, Builder, OS, Chat |
| 🔒 **Secure vault** | API keys encrypted with OS keychain |

---

## 🚀 Quick Start

**Windows:** Double-click `setup.bat`

**Linux/macOS:**
```bash
chmod +x setup.sh && ./setup.sh
```

**Manual:**
```bash
npm install
cp .env.example .env
# Edit .env and add GEMINI_API_KEY or GROQ_API_KEY
npm run dev
```

---

## 🔑 API Keys

### Required (pick at least one — both are FREE)
| Key | Get it at |
|-----|-----------|
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |
| `GROQ_API_KEY` | https://console.groq.com |

### Optional (have free fallbacks — work without any key)
| Key | Fallback |
|-----|----------|
| `OPENWEATHER_API_KEY` | wttr.in (free, no key needed) |
| `GNEWS_API_KEY` | BBC RSS feed (free, no key needed) |
| `TAVILY_API_KEY` | DuckDuckGo scrape |

---

## 🎤 Voice Commands

Say **"ZETA"** or **double-clap** to wake, then:

```
"hi" / "kaise ho?"         → Human chat
"Open Chrome"              → App launcher
"Aaj weather kaisa hai?"   → Live weather
"Aaj ki news batao"        → News headlines
"Set reminder at 3pm"      → Add reminder
"Write a Python script..." → Coder agent
"Search for..."            → Web agent
"Take screenshot"          → Screen capture
```

---

## 🤖 Agent Modes

| Mode | Description |
|------|-------------|
| **Auto ⚡** | Smart routing (chat OR command, auto-detected) |
| **Chat 💬** | Pure human-like conversation + Urdu/Hinglish |
| **Coder 💻** | Writes + saves code files |
| **Web 🌍** | Real-time search & research |
| **Memory 🧠** | Local document RAG |
| **Builder 🎨** | Full website generation |
| **OS 🖥️** | Direct computer control |

---

## 💬 Conversation Examples

```
User: "hi"
ZETA: "Hey 👋 kaise ho? Aaj kya plan hai?"

User: "bored hoon"
ZETA: "Samajh sakta hoon 😅 chalo kuch karte hain!"

User: "weather?"
ZETA: "Rawalpindi mein ☀️ 31°C, feels like 34°C"

User: "open chrome"
ZETA: [opens Chrome automatically]

User: "set reminder meeting at 10am tomorrow"
ZETA: "Done! Reminder set ✓"
```

---

## 🏗️ Architecture

```
src/
├── main/                      # Node.js / Electron main
│   ├── agents/
│   │   ├── orchestratorAgent  # Dual-mode: conversation + command
│   │   ├── conversationAgent  # Human-like personality (NEW)
│   │   ├── coderAgent
│   │   ├── webAgent
│   │   ├── ragAgent
│   │   └── websiteBuilderAgent
│   └── ipc/handlers/
│       ├── weatherHandler     # Live weather (NEW)
│       ├── newsHandler        # Live news (NEW)
│       ├── calendarHandler    # Events + reminders (NEW)
│       ├── appLauncherHandler # Open/close apps (NEW)
│       ├── osControlHandler   # Mouse + keyboard
│       ├── screenCaptureHandler
│       ├── ragMemoryHandler
│       ├── webIntelligenceHandler
│       └── securityHandler    # Encrypted vault
├── preload/                   # Secure IPC bridge
└── renderer/src/              # React UI
    ├── components/
    │   ├── voice/ZetaAssistant  # JARVIS UI with tabbed widgets
    │   └── widgets/LiveWidgets  # Weather/News/Schedule (NEW)
    └── hooks/
        ├── useZetaCore          # Voice + command loop
        ├── useRealWorldData     # Weather/news/reminders (NEW)
        └── useVoice / useWakeWord
```

---

## 🔒 Security

Keys are stored with Electron safeStorage (OS keychain) — never plaintext on disk.
Add/update keys via the **VAULT** button inside the app.

---

## 🛠️ Build

```bash
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux
```

## 📋 Requirements

- Node.js 18+
- Windows 10+ / macOS 12+ / Ubuntu 20+
- 1 AI API key (Gemini or Groq — both free)
