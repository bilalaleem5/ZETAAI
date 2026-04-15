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

  const modeRef    = useRef<ZetaMode>('sleeping')
  const voiceRef   = useRef<ReturnType<typeof useVoice> | null>(null)
  const restartRef = useRef<((ms?: number) => void) | null>(null)
  const convIdRef  = useRef<string | null>(null)

  // FIX #3: Track whether the stream has already been handled to prevent
  // the execute() error branch and onDone() from both calling speak().
  const streamHandledRef = useRef(false)

  const agentMode  = useSettingsStore(s => s.agentMode)
  const agentRef   = useRef(agentMode)
  agentRef.current = agentMode

  const { createConversation, addMessage, setIsStreaming } = useChatStore()
  const voice = useVoice()
  voiceRef.current = voice

  const setM = useCallback((m: ZetaMode) => { modeRef.current = m; setMode(m) }, [])

  useEffect(() => {
    const s = useChatStore.getState()
    convIdRef.current = s.conversations.length > 0 ? s.conversations[0].id : s.createConversation()
  }, [])

  // ─── Stream event handlers ────────────────────────────────────────────────
  useStreamManager(
    (token) => setStreamingText(p => p + token),
    (content) => {
      console.log('[Core] Stream done. mode:', modeRef.current, 'content len:', content.length)
      setStreamingText('')
      setLastResponse(content)

      // FIX #3: If execute()'s catch block already handled this (error path),
      // streamHandledRef is true — skip here to prevent double TTS.
      if (streamHandledRef.current) {
        console.log('[Core] Stream already handled by execute catch, skipping onDone speak')
        return
      }

      // FIX #3: Only speak if we are still in 'thinking' mode. If mode has
      // already changed (e.g. a stop was called), skip gracefully.
      if (content && modeRef.current === 'thinking') {
        setM('speaking')
        voiceRef.current?.speak(content, () => {
          console.log('[Core] TTS done, going to sleep')
          setM('sleeping')
          setCurrentCmd('')
          restartRef.current?.(1500)
        })
      } else if (modeRef.current === 'thinking') {
        // Content is empty — fallback phrase
        console.warn('[Core] Empty content from stream, using fallback')
        setM('speaking')
        voiceRef.current?.speak("I'm ready. What can I do for you?", () => {
          setM('sleeping')
          setCurrentCmd('')
          restartRef.current?.(1000)
        })
      } else {
        // Already stopped externally
        setM('sleeping')
        setCurrentCmd('')
        restartRef.current?.(1000)
      }
    }
  )

  // ─── Main execute function ────────────────────────────────────────────────
  const execute = useCallback(async (cmd: string) => {
    if (!cmd.trim()) { setM('sleeping'); restartRef.current?.(500); return }
    console.log('[Core] execute:', cmd)

    // Reset the handled flag for this new request
    streamHandledRef.current = false

    setCurrentCmd(cmd)
    setStreamingText('')
    setM('thinking')

    if (!convIdRef.current) convIdRef.current = createConversation()
    const cid = convIdRef.current
    addMessage(cid, { role: 'user', content: cmd, agentMode: agentRef.current })
    addMessage(cid, { role: 'assistant', content: '', agentMode: agentRef.current, isStreaming: true })
    setIsStreaming(true)

    try {
      console.log('[Core] Calling agent:chat (model: groq, mode:', agentRef.current, ')')
      const res = await (window as any).zeta.agent.chat({
        message: cmd,
        model: 'groq',
        agentMode: agentRef.current,
        conversationHistory: useChatStore
          .getState()
          .getActiveMessages()
          .slice(0, -1)
          .map(m => ({ role: m.role, content: m.content }))
      })
      console.log('[Core] agent:chat returned. success:', res?.success)

      // FIX #5: On API-level error (e.g. bad key, rate limit), the agentHandler
      // already sent the error message as a stream token and fired sendDone().
      // The onDone callback in useStreamManager will handle TTS via the stream.
      // We do NOT call speak() here — let the stream onDone handle it uniformly.
      if (!res?.success && res?.error) {
        console.warn('[Core] Agent returned error:', res.error)
        // Stream error message was sent as token by agentHandler — onDone will speak it.
        // Just mark isStreaming false as a safety net if sendDone never fires.
        setTimeout(() => {
          if (modeRef.current === 'thinking') {
            console.warn('[Core] Timeout: agent:stream-complete never fired after error')
            setIsStreaming(false)
            setM('sleeping')
            setCurrentCmd('')
            restartRef.current?.(1000)
          }
        }, 8000)
      }
    } catch (err) {
      // FIX #5: Unexpected JS exception (network down, IPC crash, etc.)
      // The stream will NOT complete normally, so we must handle TTS here.
      // Mark streamHandledRef so onDone (if it fires anyway) won't double-speak.
      console.error('[Core] execute error (unexpected):', err)
      streamHandledRef.current = true
      setIsStreaming(false)
      setStreamingText('')
      setM('speaking')
      const errMsg = 'Sorry, something went wrong. Please try again.'
      voiceRef.current?.speak(errMsg, () => {
        setM('sleeping')
        setCurrentCmd('')
        restartRef.current?.(1000)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Wake logic ──────────────────────────────────────────────────────────
  const wake = useCallback(() => {
    console.log('[Core] WAKE called, mode:', modeRef.current)
    if (modeRef.current !== 'sleeping') return

    // Play chime
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

    setM('listening')
    setCurrentCmd('')
    setStreamingText('')
    console.log('[Core] Starting voice listen...')
    voiceRef.current?.listen((cmd: string) => {
      console.log('[Core] Voice result:', cmd)
      execute(cmd)
    })
  }, [execute, setM])

  const { isWatching, restartWatching } = useWakeWord({ onWake: wake, enabled: wakeEnabled })
  useEffect(() => { restartRef.current = (ms = 1500) => restartWatching(ms) }, [restartWatching])
  useClapDetection({ onClap: wake, enabled: wakeEnabled })

  // ─── Manual text command (from terminal) ─────────────────────────────────
  useEffect(() => {
    const h = (e: Event) => {
      const t = (e as CustomEvent<{text:string}>).detail?.text
      if (t?.trim() && modeRef.current === 'sleeping') execute(t.trim())
    }
    window.addEventListener('zeta:direct-command', h)
    return () => window.removeEventListener('zeta:direct-command', h)
  }, [execute])

  return {
    mode,
    currentCommand: currentCmd,
    streamingText,
    lastResponse,
    isWatching,
    wakeEnabled,
    voice,
    manualWake: wake,
    stopAll: () => {
      voiceRef.current?.stop()
      streamHandledRef.current = true
      setM('sleeping')
      setStreamingText('')
      setCurrentCmd('')
      setIsStreaming(false)
      restartWatching(800)
    },
    toggleWakeEnabled: () => setWakeEnabled(p => !p)
  }
}
