/**
 * useVoice — Whisper STT + Web Speech TTS
 *
 * ARCHITECTURE: Chrome SpeechRecognition does NOT work in Electron
 * (requires Google servers + SSL). We use MediaRecorder → base64 → Groq Whisper.
 *
 * Flow: listen() → MediaRecorder → base64 → IPC audio:transcribe → Whisper → text
 *       speak(text) → SpeechSynthesis → onDone()
 */
import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceState = 'sleeping' | 'listening' | 'thinking' | 'speaking' | 'error'

export function useVoice() {
  const [state,      setState]      = useState<VoiceState>('sleeping')
  const [transcript, setTranscript] = useState('')
  const [volume,     setVolume]     = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const volCtx      = useRef<AudioContext | null>(null)
  const volAnim     = useRef<number | null>(null)
  const silenceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Pre-load TTS voices on mount
  useEffect(() => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.getVoices()
    const load = () => {}
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  // ── Volume + silence detection ──────────────────────────────────────────
  const stopVol = useCallback(() => {
    if (volAnim.current) { cancelAnimationFrame(volAnim.current); volAnim.current = null }
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null }
    setVolume(0)
  }, [])

  // ── Listen (Whisper STT) ───────────────────────────────────────────────
  const listen = useCallback((onResult: (text: string) => void) => {
    console.log('[Voice] 🎤 Starting Whisper STT listen...')
    setTranscript('')
    setState('listening')

    // Get microphone
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream

        // Setup volume visualizer + silence detection
        const ctx = new AudioContext()
        volCtx.current = ctx
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.3
        ctx.createMediaStreamSource(stream).connect(analyser)
        analyserRef.current = analyser
        const data = new Uint8Array(analyser.frequencyBinCount)

        let speechDetected = false
        let silenceCount = 0
        const SILENCE_THRESHOLD = 15
        const SILENCE_FRAMES = 45  // ~750ms of silence to auto-stop

        const tick = () => {
          analyser.getByteFrequencyData(data)
          const avg = data.reduce((a, b) => a + b, 0) / data.length
          setVolume(Math.min(avg / 60, 1))

          if (avg > SILENCE_THRESHOLD) {
            speechDetected = true
            silenceCount = 0
          } else if (speechDetected) {
            silenceCount++
            if (silenceCount > SILENCE_FRAMES) {
              // Auto-stop after silence
              console.log('[Voice] Silence detected, stopping recording...')
              stopRecording()
              return
            }
          }
          volAnim.current = requestAnimationFrame(tick)
        }
        tick()

        // Start recording
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        const chunks: Blob[] = []
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
        recorder.onstop = async () => {
          // Cleanup volume
          stopVol()
          streamRef.current?.getTracks().forEach(t => t.stop())
          streamRef.current = null
          try { volCtx.current?.close() } catch {}
          volCtx.current = null

          const blob = new Blob(chunks, { type: 'audio/webm' })
          console.log('[Voice] Recording stopped, size:', blob.size)

          if (blob.size < 1000) {
            console.warn('[Voice] Recording too short')
            setState('sleeping')
            return
          }

          setState('thinking')
          setTranscript('Transcribing...')

          // Convert to base64 and send to Whisper
          const reader = new FileReader()
          reader.onloadend = async () => {
            const b64 = (reader.result as string).split(',')[1]
            if (!b64) { setState('sleeping'); setTranscript(''); return }

            try {
              const zeta = (window as any).zeta
              if (!zeta?.audio?.transcribe) {
                console.error('[Voice] zeta.audio.transcribe not available')
                setState('sleeping'); setTranscript('')
                return
              }
              const res = await zeta.audio.transcribe(b64)
              if (res?.success && res.text?.trim()) {
                const text = res.text.trim()
                console.log('[Voice] ✅ Whisper:', text)
                setTranscript(text)
                onResult(text)
              } else {
                console.warn('[Voice] Whisper empty response')
                setState('sleeping')
                setTranscript('')
              }
            } catch (e) {
              console.error('[Voice] Whisper error:', e)
              setState('sleeping')
              setTranscript('')
            }
          }
          reader.readAsDataURL(blob)
        }

        recorderRef.current = recorder
        recorder.start()
        console.log('[Voice] ✅ Recording started')

        // Safety: max 12 seconds recording
        silenceRef.current = setTimeout(() => {
          if (recorder.state === 'recording') {
            console.log('[Voice] Max duration reached, stopping...')
            stopRecording()
          }
        }, 12000)

        function stopRecording() {
          if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null }
          if (volAnim.current) { cancelAnimationFrame(volAnim.current); volAnim.current = null }
          try {
            if (recorder.state === 'recording') recorder.stop()
          } catch {}
        }
      })
      .catch(e => {
        console.error('[Voice] Mic access denied:', e)
        setState('sleeping')
      })
  }, [stopVol])

  // ── Speak (SpeechSynthesis TTS) ────────────────────────────────────────
  const speak = useCallback((text: string, onDone?: () => void) => {
    try { window.speechSynthesis.cancel() } catch {}
    setState('speaking')

    // Strip markdown / emojis for clean speech
    const clean = text
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`[^`]*`/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6} /g, '')
      .replace(/[🔑⚠️✅❌📅🌤️📰🎯🤖💬🔔📋📩📊⏰💼🧠🧑‍💻🌐]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 400)

    console.log('[Voice] Speaking:', clean.slice(0, 80))

    if (!clean) { setState('sleeping'); onDone?.(); return }

    let done = false
    const finish = () => {
      if (done) return; done = true
      try { window.speechSynthesis.cancel() } catch {}
      setState('sleeping')
      onDone?.()
    }

    // Safety fallback timeout
    const timeout = setTimeout(finish, Math.min(clean.split(' ').length * 200 + 3000, 20000))

    const doSpeak = () => {
      const u = new SpeechSynthesisUtterance(clean)
      u.lang = 'en-US'; u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0

      const voices = window.speechSynthesis.getVoices()
      const voice =
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
        voices.find(v => v.lang === 'en-US' && !v.localService) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0]
      if (voice) u.voice = voice

      u.onend   = () => { clearTimeout(timeout); finish() }
      u.onerror = (e) => { console.warn('[TTS] error:', e.error); clearTimeout(timeout); finish() }

      setTimeout(() => {
        try { window.speechSynthesis.speak(u) }
        catch (e) { console.error('[TTS] speak failed:', e); clearTimeout(timeout); finish() }
      }, 150)
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak()
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
      setTimeout(doSpeak, 1000)
    }
  }, [])

  // ── Stop everything ──────────────────────────────────────────────────────
  const stop = useCallback(() => {
    try { recorderRef.current?.stop() } catch {}
    recorderRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    try { window.speechSynthesis.cancel() } catch {}
    stopVol()
    try { volCtx.current?.close() } catch {}
    volCtx.current = null
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null }
    setState('sleeping')
    setTranscript('')
  }, [stopVol])

  return { state, setState, transcript, volume, listen, speak, stop }
}
