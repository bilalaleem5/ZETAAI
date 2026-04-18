import { useState, useCallback, useRef, useEffect } from 'react'
import { useVoice } from './useVoice'
import { useWakeWord, useClapDetection } from './useWakeWord'
import { useStreamManager } from './useStreamManager'
import { useChatStore, useSettingsStore } from '../store'

export type ZetaMode = 'sleeping' | 'listening' | 'thinking' | 'speaking' | 'error'

export function useZetaCore() {
  const [mode,          setMode]          = useState<ZetaMode>('sleeping')
  const [currentCmd,    setCurrentCmd]    = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [lastResponse,  setLastResponse]  = useState('')
  const [wakeEnabled,   setWakeEnabled]   = useState(true)

  const modeRef       = useRef<ZetaMode>('sleeping')
  const voiceRef      = useRef<ReturnType<typeof useVoice> | null>(null)
  const restartRef    = useRef<((ms?: number) => void) | null>(null)
  const streamDoneRef = useRef(false)
  const watchdogRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const agentMode = useSettingsStore(s => s.agentMode)
  const agentRef  = useRef(agentMode)
  agentRef.current = agentMode

  const { createConversation, addMessage, setIsStreaming } = useChatStore()
  const voice = useVoice()
  voiceRef.current = voice

  const setM = useCallback((m: ZetaMode) => { modeRef.current = m; setMode(m) }, [])

  const clearWatchdog = () => { if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null } }

  const startWatchdog = useCallback(() => {
    clearWatchdog()
    watchdogRef.current = setTimeout(() => {
      if (modeRef.current === 'thinking') {
        console.warn('[Core] ⚠️ Watchdog: stuck in thinking > 30s, recovering')
        setIsStreaming(false)
        setM('sleeping'); setCurrentCmd('')
        restartRef.current?.(500)
      }
    }, 30000)
  }, [setM, setIsStreaming])

  useEffect(() => {
    const s = useChatStore.getState()
    // FIX: use activeConversationId, not conversations[0]
    if (!s.activeConversationId || s.conversations.length === 0) createConversation()
  }, [])

  useStreamManager(
    token => setStreamingText(p => p + token),
    content => {
      clearWatchdog()
      console.log('[Core] Stream done | mode:', modeRef.current, '| len:', content.length)
      setStreamingText('')
      setLastResponse(content)

      if (streamDoneRef.current) return

      if (content && modeRef.current === 'thinking') {
        setM('speaking')
        voiceRef.current?.speak(content, () => {
          setM('sleeping'); setCurrentCmd(''); restartRef.current?.(1500)
        })
      } else {
        setM('sleeping'); setCurrentCmd(''); restartRef.current?.(1000)
      }
    }
  )

  const execute = useCallback(async (cmd: string) => {
    if (!cmd.trim()) { setM('sleeping'); restartRef.current?.(500); return }
    console.log('[Core] execute:', cmd)
    streamDoneRef.current = false
    setCurrentCmd(cmd); setStreamingText(''); setM('thinking')
    startWatchdog()

    // FIX: always use activeConversationId
    const s = useChatStore.getState()
    const cid = s.activeConversationId ?? createConversation()

    addMessage(cid, { role: 'user', content: cmd, agentMode: agentRef.current })
    addMessage(cid, { role: 'assistant', content: '', agentMode: agentRef.current, isStreaming: true })
    setIsStreaming(true)

    try {
      const hist = useChatStore.getState().getActiveMessages()
        .slice(0, -1).map(m => ({ role: m.role, content: m.content }))
      const zeta = (window as any).zeta
      if (!zeta?.agent?.chat) throw new Error('ZETA bridge not available')
      // CRITICAL: Voice tab always uses 'auto' (orchestrator) — it handles
      // weather, browser, tasks, OS control, etc. Sub-agents are for chat tab only.
      const res = await zeta.agent.chat({
        message: cmd, model: 'groq',
        agentMode: 'auto',
        conversationHistory: hist
      })
      console.log('[Core] agent:chat returned:', res?.success)
      if (!res?.success) {
        // agentHandler already sent error token + done — watchdog safety net
        setTimeout(() => {
          if (modeRef.current === 'thinking') {
            clearWatchdog(); setIsStreaming(false); setM('sleeping'); setCurrentCmd('')
            restartRef.current?.(500)
          }
        }, 5000)
      }
    } catch (err) {
      clearWatchdog()
      console.error('[Core] execute threw:', err)
      streamDoneRef.current = true
      setIsStreaming(false); setStreamingText('')
      setM('speaking')
      voiceRef.current?.speak('Sorry, something went wrong.', () => {
        setM('sleeping'); setCurrentCmd(''); restartRef.current?.(1000)
      })
    }
  }, [startWatchdog]) // eslint-disable-line

  const wake = useCallback(() => {
    console.log('[Core] WAKE | mode:', modeRef.current)
    if (modeRef.current !== 'sleeping') return
    try {
      const ctx = new AudioContext(), t = ctx.currentTime
      ;[{f:523,s:0,e:.1},{f:659,s:.08,e:.2},{f:784,s:.17,e:.35}].forEach(({f,s,e})=>{
        const o=ctx.createOscillator(),g=ctx.createGain()
        o.connect(g);g.connect(ctx.destination);o.frequency.value=f;o.type='sine'
        g.gain.setValueAtTime(.2,t+s);g.gain.exponentialRampToValueAtTime(.001,t+e)
        o.start(t+s);o.stop(t+e)
      })
      setTimeout(()=>ctx.close(),600)
    } catch {}
    setM('listening'); setCurrentCmd(''); setStreamingText('')
    voiceRef.current?.listen(cmd => execute(cmd))
  }, [execute, setM])

  const { isWatching, restartWatching } = useWakeWord({ onWake: wake, enabled: wakeEnabled })
  useEffect(() => { restartRef.current = (ms = 1500) => restartWatching(ms) }, [restartWatching])
  useClapDetection({ onClap: wake, enabled: wakeEnabled })

  useEffect(() => {
    const h = (e: Event) => {
      const t = (e as CustomEvent<{text:string}>).detail?.text
      if (t?.trim() && modeRef.current === 'sleeping') execute(t.trim())
    }
    window.addEventListener('zeta:direct-command', h)
    return () => window.removeEventListener('zeta:direct-command', h)
  }, [execute])

  return {
    mode, currentCommand: currentCmd, streamingText, lastResponse,
    isWatching, wakeEnabled, voice,
    manualWake: wake,
    stopAll: () => {
      clearWatchdog(); voiceRef.current?.stop()
      streamDoneRef.current = true
      setM('sleeping'); setStreamingText(''); setCurrentCmd('')
      setIsStreaming(false); restartWatching(800)
    },
    toggleWakeEnabled: () => setWakeEnabled(p => !p)
  }
}
