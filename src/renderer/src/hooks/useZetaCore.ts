/**
 * useZetaCore — Main ZETA brain (REBUILT)
 * Wake → Listen → Execute → Speak → Sleep → Repeat
 * FIXES: convId uses activeConversationId, added watchdog timer
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useVoice } from './useVoice'
import { useWakeWord, useClapDetection } from './useWakeWord'
import { useStreamManager } from './useStreamManager'
import { useChatStore, useSettingsStore } from '../store'

export type ZetaMode = 'sleeping' | 'listening' | 'thinking' | 'speaking' | 'error'

const WATCHDOG_TIMEOUT = 30000 // 30s max for thinking state

export function useZetaCore() {
  const [mode,         setMode]         = useState<ZetaMode>('sleeping')
  const [currentCmd,   setCurrentCmd]   = useState('')
  const [streamingText,setStreamingText]= useState('')
  const [lastResponse, setLastResponse] = useState('')
  const [wakeEnabled,  setWakeEnabled]  = useState(true)

  const modeRef    = useRef<ZetaMode>('sleeping')
  const voiceRef   = useRef<ReturnType<typeof useVoice> | null>(null)
  const restartRef = useRef<((ms?: number) => void) | null>(null)
  const streamDoneRef = useRef(false)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const agentMode = useSettingsStore(s => s.agentMode)
  const agentRef  = useRef(agentMode)
  agentRef.current = agentMode

  const { createConversation, addMessage, setIsStreaming } = useChatStore()
  const voice = useVoice()
  voiceRef.current = voice

  const setM = useCallback((m: ZetaMode) => {
    modeRef.current = m
    setMode(m)
    // Clear watchdog when leaving thinking state
    if (m !== 'thinking' && watchdogRef.current) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }, [])

  // ── Get or create active conversation ─────────────────────────────────────
  const getConvId = useCallback((): string => {
    const s = useChatStore.getState()
    if (s.activeConversationId) return s.activeConversationId
    if (s.conversations.length > 0) {
      s.setActiveConversation(s.conversations[0].id)
      return s.conversations[0].id
    }
    return s.createConversation()
  }, [])

  // Stream events — singleton, no duplicates
  useStreamManager(
    (token) => setStreamingText(p => p + token),
    (content) => {
      console.log('[Core] Stream done | mode:', modeRef.current, '| chars:', content.length)
      setStreamingText('')
      setLastResponse(content)

      if (streamDoneRef.current) {
        console.log('[Core] Stream already handled, skipping TTS')
        return
      }

      if (content && modeRef.current === 'thinking') {
        setM('speaking')
        voiceRef.current?.speak(content, () => {
          console.log('[Core] TTS done → sleeping')
          setM('sleeping')
          setCurrentCmd('')
          restartRef.current?.(1500)
        })
      } else {
        setM('sleeping')
        setCurrentCmd('')
        restartRef.current?.(1000)
      }
    }
  )

  // ── Watchdog: force recovery if stuck in thinking ─────────────────────────
  const startWatchdog = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current)
    watchdogRef.current = setTimeout(() => {
      if (modeRef.current === 'thinking') {
        console.warn('[Core] ⚠️ Watchdog: stuck in thinking for 30s, forcing recovery')
        streamDoneRef.current = true
        setIsStreaming(false)
        setStreamingText('')
        setM('speaking')
        voiceRef.current?.speak('Sorry, that took too long. Please try again.', () => {
          setM('sleeping')
          setCurrentCmd('')
          restartRef.current?.(1000)
        })
      }
    }, WATCHDOG_TIMEOUT)
  }, [setM, setIsStreaming])

  const execute = useCallback(async (cmd: string) => {
    if (!cmd.trim()) { setM('sleeping'); restartRef.current?.(500); return }

    console.log('[Core] execute:', `"${cmd}"`)
    streamDoneRef.current = false
    setCurrentCmd(cmd)
    setStreamingText('')
    setM('thinking')
    startWatchdog()

    const cid = getConvId()

    addMessage(cid, { role: 'user', content: cmd, agentMode: agentRef.current })
    addMessage(cid, { role: 'assistant', content: '', agentMode: agentRef.current, isStreaming: true })
    setIsStreaming(true)

    try {
      console.log('[Core] → agent:chat (groq)')
      const res = await (window as any).zeta.agent.chat({
        message: cmd,
        model: 'groq',
        agentMode: agentRef.current,
        conversationHistory: useChatStore.getState().getActiveMessages()
          .slice(0, -1).map(m => ({ role: m.role, content: m.content }))
      })
      console.log('[Core] agent:chat returned success:', res?.success)
      // Stream-complete will handle the rest. No timeout needed — watchdog covers it.
    } catch (err) {
      console.error('[Core] execute() threw:', err)
      streamDoneRef.current = true
      setIsStreaming(false); setStreamingText('')
      if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null }
      setM('speaking')
      voiceRef.current?.speak('Sorry, something went wrong. Please try again.', () => {
        setM('sleeping'); setCurrentCmd(''); restartRef.current?.(1000)
      })
    }
  }, [setM, startWatchdog, getConvId]) // eslint-disable-line

  // ── Wake ──────────────────────────────────────────────────────────────────
  const wake = useCallback(() => {
    console.log('[Core] WAKE → mode:', modeRef.current)
    if (modeRef.current !== 'sleeping') return

    // Chime
    try {
      const ctx = new AudioContext(), t = ctx.currentTime
      ;[{f:523,s:0,e:.1},{f:659,s:.08,e:.2},{f:784,s:.17,e:.35}].forEach(({f,s,e}) => {
        const osc = ctx.createOscillator(), g = ctx.createGain()
        osc.connect(g); g.connect(ctx.destination)
        osc.frequency.value = f; osc.type = 'sine'
        g.gain.setValueAtTime(.2, t+s); g.gain.exponentialRampToValueAtTime(.001, t+e)
        osc.start(t+s); osc.stop(t+e)
      })
      setTimeout(() => ctx.close(), 600)
    } catch {}

    setM('listening'); setCurrentCmd(''); setStreamingText('')
    console.log('[Core] Calling voice.listen()...')
    voiceRef.current?.listen((cmd: string) => {
      console.log('[Core] ✅ Got command:', cmd)
      execute(cmd)
    })
  }, [execute, setM])

  const { isWatching, restartWatching } = useWakeWord({ onWake: wake, enabled: wakeEnabled })
  useEffect(() => { restartRef.current = (ms = 1500) => restartWatching(ms) }, [restartWatching])
  useClapDetection({ onClap: wake, enabled: wakeEnabled })

  // Manual text commands from terminal input
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text
      if (text?.trim() && modeRef.current === 'sleeping') execute(text.trim())
    }
    window.addEventListener('zeta:direct-command', handler)
    return () => window.removeEventListener('zeta:direct-command', handler)
  }, [execute])

  // Cleanup watchdog on unmount
  useEffect(() => {
    return () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current)
    }
  }, [])

  return {
    mode, currentCommand: currentCmd, streamingText, lastResponse,
    isWatching, wakeEnabled, voice,
    manualWake: wake,
    stopAll: () => {
      voiceRef.current?.stop()
      streamDoneRef.current = true
      if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null }
      setM('sleeping'); setStreamingText(''); setCurrentCmd('')
      setIsStreaming(false); restartWatching(800)
    },
    toggleWakeEnabled: () => setWakeEnabled(p => !p)
  }
}
