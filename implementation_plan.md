# ZETA AI — Full System Debug + Rebuild Plan

## 1. ROOT CAUSE ANALYSIS (Summary)

| # | Bug | Severity | Impact |
|---|-----|----------|--------|
| 1 | **ChatInput `useVoice` API mismatch** — calls `useVoice({onTranscript, language})` but hook takes NO args | P0 | Voice in chat tab DEAD |
| 2 | **Missing `.env` file** — only `.env.example` exists, `GROQ_API_KEY` never loads from disk | P0 | ALL AI calls fail unless Vault manually set |
| 3 | **`useChat` double instantiation** — called in both `ChatWrapper` AND `ChatView` | P0 | Duplicate streams, stale closures, race conditions |
| 4 | **`MessageBubble` missing `chat` agent mode** — `AGENT_COLORS`/`AGENT_ICONS` omit `'chat'` | P1 | Crash/undefined when chat mode selected |
| 5 | **Orchestrator action results discarded** — only sends "Done." / "On it.", throws away real data | P1 | User never sees weather/news/action results |
| 6 | **`WEB_SEARCH` stub in orchestrator** — returns hardcoded error string | P1 | Web search via voice does nothing |
| 7 | **Stream completion race** — both `useChat` error path AND `stream-complete` modify same message | P1 | Error messages overwritten/cleared |
| 8 | **Voice convId mismatch** — voice commands write to `conversations[0]`, not `activeConversationId` | P1 | Commands go to wrong conversation |
| 9 | **SpeechRecognition no retry** — network/SSL errors → sleeping, no recovery | P2 | Voice dies after first failure |
| 10 | **No heartbeat/watchdog** — only 8s timeout in `useZetaCore` | P2 | System freezes go undetected |
| 11 | **WhatsApp/Email not implemented** — no handlers or agents exist | P2 | Feature missing entirely |
| 12 | **Lead gen/browser automation incomplete** — only basic search+scrape | P2 | Feature missing entirely |

---

## 2. LOCAL APP CHAT ISSUE EXPLANATION

The chat **partially works** because:
- The Zustand store, IPC bridge, and agent handler are correctly wired
- `agent:stream-token` events DO fire and update the store
- Message bubbles DO render streamed content via `ReactMarkdown`

But it's **unstable** because:
1. `useChat()` is instantiated **TWICE** (once in `ChatWrapper`, once in `ChatView`). Both register stream callbacks → potential double-processing of stream events
2. The `ChatInput` component's voice button is **completely broken** — it calls `useVoice` with a config object API that doesn't exist, so `toggle` and `isSupported` are `undefined`, meaning the mic button never renders
3. Error responses trigger BOTH the `useChat` catch block AND the `stream-complete` handler, causing race conditions on message state updates
4. If `.env` is missing and Vault keys weren't set, the first AI call fails with "GROQ_API_KEY not configured" → but this error IS sent back via stream, so user sees the error message

---

## 3. BROKEN MODULES LIST

```
BROKEN:
  ├── ChatInput.tsx          → useVoice API mismatch (voice in chat DEAD)
  ├── useChat.ts             → double instantiation, race conditions
  ├── MessageBubble.tsx      → missing 'chat' mode in color/icon maps
  ├── orchestratorAgent.ts   → action results discarded, WEB_SEARCH stub
  ├── useZetaCore.ts         → convId/activeConvId mismatch
  ├── .env                   → MISSING entirely
  
DEGRADED:
  ├── useVoice.ts            → works but no retry on SpeechRecognition failure
  ├── useStreamManager.ts    → singleton works but race with useChat error path
  ├── useWakeWord.ts         → works but depends on SpeechRecognition availability
  ├── webAgent.ts            → search works, lead gen missing
  
NOT IMPLEMENTED:
  ├── WhatsApp automation    → no code exists
  ├── Email automation       → no code exists
  ├── Lead generation        → no code exists
  ├── Advanced browser agent → only basic scrape
```

---

## 4. FIXED ARCHITECTURE FLOW

```
VOICE TAB:
  WakeWord/Clap/Click → listen() → SpeechRecognition → text
    → execute(text) → agent:chat IPC → orchestratorAgent → JSON parse
        ├── {type:"conversation"} → stream reply → TTS → sleep → restart wake
        └── {action:"OPEN_APP"} → executeAction() → stream result summary → TTS → sleep

CHAT TAB:
  ChatInput (text/voice) → sendMessage() → agent:chat IPC → agentHandler → route
    ├── mode=auto → orchestratorAgent (chat+commands)
    ├── mode=coder → coderAgent (code gen)
    ├── mode=web → webAgent (search+synthesis)
    ├── mode=chat → conversationAgent (pure chat)
    └── mode=os → orchestratorAgent (OS commands)
  → stream-token IPC → useChatStore.appendStreamToken → UI update
  → stream-complete IPC → finalize message → stop streaming indicator

IPC BRIDGE:
  renderer (window.zeta.agent.chat) → ipcRenderer.invoke('agent:chat')
  → main process: handleAgentChat() → route to agent → stream tokens back
  → renderer: onStreamToken / onStreamComplete listeners
```

---

## 5. PROPOSED CHANGES

### Component 1: Chat Voice Fix (P0)

#### [MODIFY] [ChatInput.tsx](file:///d:/ai%20assistant/ZETAAI/src/renderer/src/components/chat/ChatInput.tsx)
- Remove the broken `useVoice({...})` call with config object
- Use actual `useVoice()` API from the hook (no args)
- Wire `listen()` to capture transcript and auto-send
- Add `isSupported` check based on `SpeechRecognition` availability
- Wire toggle button to start/stop listening

---

### Component 2: Fix useChat Double Instantiation (P0)

#### [MODIFY] [ChatView.tsx](file:///d:/ai%20assistant/ZETAAI/src/renderer/src/components/chat/ChatView.tsx)
- Remove `useChat()` call from ChatView — it should ONLY read store data
- Get `sendMessage` and `isStreaming` from props or a shared context

#### [MODIFY] [App.tsx](file:///d:/ai%20assistant/ZETAAI/src/renderer/src/App.tsx)
- `ChatWrapper` calls `useChat()` and passes `sendMessage`/`isStreaming` down to ChatView
- ChatView becomes a pure presentation component

---

### Component 3: Fix MessageBubble Missing Mode (P1)

#### [MODIFY] [MessageBubble.tsx](file:///d:/ai%20assistant/ZETAAI/src/renderer/src/components/chat/MessageBubble.tsx)
- Add `chat: '#10b981'` to `AGENT_COLORS`
- Add `chat: <MessageSquare size={12} />` to `AGENT_ICONS`

---

### Component 4: Fix Orchestrator Action Feedback (P1)

#### [MODIFY] [orchestratorAgent.ts](file:///d:/ai%20assistant/ZETAAI/src/main/agents/orchestratorAgent.ts)
- After `executeAction()`, generate a meaningful summary of the result
- For weather: stream the actual weather data back
- For app open/close: confirm what was opened/closed
- For news: stream headline summaries
- Implement `WEB_SEARCH` action by calling `handleWebIntelligence('search', ...)`

---

### Component 5: Fix Stream Completion Race (P1)

#### [MODIFY] [useChat.ts](file:///d:/ai%20assistant/ZETAAI/src/renderer/src/hooks/useChat.ts)
- After `agent:chat` returns, do NOT set `isStreaming = false` or update the message directly
- Let `stream-complete` handler be the SOLE source for finalizing the message
- Only handle JS-level exceptions (network failure where IPC itself crashes)

---

### Component 6: Fix Voice ConvId Mismatch (P1)

#### [MODIFY] [useZetaCore.ts](file:///d:/ai%20assistant/ZETAAI/src/renderer/src/hooks/useZetaCore.ts)
- Use `useChatStore.getState().activeConversationId` instead of hardcoded `conversations[0].id`
- Create new conversation only if none active

---

### Component 7: Add SpeechRecognition Retry + Fallback (P2)

#### [MODIFY] [useVoice.ts](file:///d:/ai%20assistant/ZETAAI/src/renderer/src/hooks/useVoice.ts)
- On `network` error, retry up to 3 times with exponential backoff
- If all retries fail, fall back to MediaRecorder → base64 → `audio:transcribe` IPC (Whisper STT)
- Add `isSupported` boolean export for UI consumption

---

### Component 8: Add Watchdog/Heartbeat (P2)

#### [MODIFY] [useZetaCore.ts](file:///d:/ai%20assistant/ZETAAI/src/renderer/src/hooks/useZetaCore.ts)
- Add a watchdog timer: if mode stays `'thinking'` for > 30s, force recovery
- Log warning and reset to sleeping state
- Restart wake word detection

---

## User Review Required

> [!IMPORTANT]
> **Missing `.env` file**: No `.env` file exists. The system relies on either:
> - A `.env` file with `GROQ_API_KEY=gsk_...` at the project root, OR
> - The Vault (Settings modal) having the key stored via `electron-store`
> 
> **Do you have a valid GROQ API key configured in the Vault?** If not, I need to create a `.env` file. Please provide your `GROQ_API_KEY` or confirm Vault is set up.

> [!WARNING]
> **WhatsApp/Email/Lead Gen**: These features have NO code in the codebase. Implementing them is a separate project-level effort (requires WhatsApp Web automation via Puppeteer, SMTP/IMAP integration, etc.). This plan focuses on **fixing what exists** first. Should I add stubs for these in a future phase?

> [!IMPORTANT]
> **Scope confirmation**: This plan covers **12 bugs across 10 files**. P0 fixes (bugs 1-3) will restore chat+voice to working state. P1 fixes (bugs 4-8) will make the system reliable. P2 fixes (bugs 9-10) add resilience. Shall I proceed with all, or P0 only first?

---

## 6. PRIORITY FIXES

### P0 — Critical (System Dead Without These)
1. Fix `ChatInput.tsx` useVoice API → restore voice in chat
2. Fix `useChat` double instantiation → eliminate race conditions
3. Ensure API key is available (`.env` or Vault)

### P1 — Important (System Unstable Without These)
4. Add `chat` mode to `MessageBubble` color/icon maps
5. Fix orchestrator to stream real action results + implement WEB_SEARCH
6. Fix stream completion race in `useChat`
7. Fix voice `convIdRef` to use active conversation

### P2 — Optimization (Resilience)
8. Add SpeechRecognition retry + Whisper fallback
9. Add watchdog timer for stuck states

---

## Verification Plan

### Automated Tests
1. Run `npm run dev` and verify app launches without console errors
2. Test chat tab: type message → verify streaming response appears
3. Test voice tab: click center area → verify SpeechRecognition starts → speak → verify response + TTS
4. Test command: say "open notepad" → verify Notepad opens
5. Test command: say "what's the weather" → verify weather data streams back
6. Check browser console for: `[Stream] ✅ IPC listeners attached`, `[Voice] ✅ SpeechRecognition started`, `[AI] ✅ model_name`

### Manual Verification
- Confirm no duplicate `[Stream]` log messages (proves no double instantiation)
- Confirm voice tab commands appear in correct conversation
- Confirm chat tab voice button renders and functions
