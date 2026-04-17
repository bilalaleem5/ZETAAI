# ZETA AI Full System Debug + Rebuild

## Phase 0: Critical Bug Fixes
- [ ] Create `.env` with all API keys
- [ ] Fix `ChatInput.tsx` useVoice API mismatch
- [ ] Fix `useChat` double instantiation (ChatView + App)

## Phase 1: Stability Fixes
- [ ] Fix `MessageBubble.tsx` missing `chat` agent mode
- [ ] Fix orchestrator action feedback + WEB_SEARCH
- [ ] Fix stream completion race in `useChat.ts`
- [ ] Fix voice convId mismatch in `useZetaCore.ts`

## Phase 2: Resilience
- [ ] Add SpeechRecognition retry + Whisper fallback in `useVoice.ts`
- [ ] Add watchdog timer in `useZetaCore.ts`

## Phase 3: New Features
- [ ] Memory system (persistent store)
- [ ] Task management engine
- [ ] CRM / Lead generation module
- [ ] Communication module (email/WhatsApp drafts)
- [ ] Enhanced orchestrator with all capabilities
- [ ] New IPC handlers + preload channels
- [ ] Daily briefing system
