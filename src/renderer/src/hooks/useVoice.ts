/**
 * useVoice — Web SpeechRecognition STT + Web Speech TTS
 *
 * REBUILT: Added retry logic, Whisper fallback, isSupported export
 *
 * Flow: listen() → SpeechRecognition → onResult(text) → execute(text)
 *       speak(text) → SpeechSynthesis → onDone()
 */
import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceState = 'sleeping' | 'listening' | 'thinking' | 'speaking' | 'error'

const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
const MAX_RETRIES = 3

export function useVoice() {
  const [state,      setState]      = useState<VoiceState>('sleeping')
  const [transcript, setTranscript] = useState('')
  const [volume,     setVolume]     = useState(0)

  const recRef    = useRef<SpeechRecognition | null>(null)
  const volCtx    = useRef<AudioContext | null>(null)
  const volStream = useRef<MediaStream | null>(null)
  const volAnim   = useRef<number | null>(null)
  const retryCount = useRef(0)

  // Pre-load TTS voices on mount
  useEffect(() => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.getVoices()
    const load = () => {}
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  // ── Volume visualizer ──────────────────────────────────────────────────────
  const stopVol = useCallback(() => {
    if (volAnim.current)  { cancelAnimationFrame(volAnim.current); volAnim.current = null }
    volStream.current?.getTracks().forEach(t => t.stop()); volStream.current = null
    try { volCtx.current?.close() } catch {}; volCtx.current = null
    setVolume(0)
  }, [])

  const startVol = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      volStream.current = stream
      const ctx = new AudioContext(); volCtx.current = ctx
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        setVolume(Math.min(data.reduce((a, b) => a + b, 0) / data.length / 60, 1))
        volAnim.current = requestAnimationFrame(tick)
      }
      tick()
    } catch { /* volume viz is optional */ }
  }, [])

  // ── Whisper STT Fallback ───────────────────────────────────────────────────
  const whisperFallback = useCallback(async (onResult: (text: string) => void) => {
    console.log('[Voice] Falling back to Whisper STT...')
    setState('listening')
    startVol()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        stopVol()
        if (chunks.length === 0) { setState('sleeping'); return }

        setState('thinking')
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1]
            const result = await (window as any).zeta.audio.transcribe(base64)
            if (result?.success && result.text?.trim()) {
              const text = result.text.trim()
              setTranscript(text)
              console.log('[Voice] Whisper result:', text)
              onResult(text)
            } else {
              console.warn('[Voice] Whisper returned empty')
              setState('sleeping')
              setTranscript('')
            }
          } catch (err) {
            console.error('[Voice] Whisper error:', err)
            setState('sleeping')
            setTranscript('')
          }
        }
        reader.readAsDataURL(blob)
      }

      recorder.start()
      // Auto-stop after 8 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 8000)
    } catch (err) {
      console.error('[Voice] Whisper fallback failed:', err)
      stopVol()
      setState('sleeping')
    }
  }, [startVol, stopVol])

  // ── Listen (SpeechRecognition with retry + Whisper fallback) ───────────────
  const listen = useCallback((onResult: (text: string) => void) => {
    if (!SR) {
      console.warn('[Voice] SpeechRecognition not supported, using Whisper fallback')
      whisperFallback(onResult)
      return
    }

    // Stop any existing session
    try { recRef.current?.abort() } catch {}
    recRef.current = null
    setTranscript('')
    setState('listening')
    startVol()

    console.log('[Voice] Starting SpeechRecognition...')

    // Small gap ensures any previous recognition session fully closed
    setTimeout(() => {
      const rec = new SR() as SpeechRecognition
      rec.lang            = 'en-US'
      rec.continuous      = false
      rec.interimResults  = true
      rec.maxAlternatives = 3

      let finalText  = ''
      let interimText = ''
      let silenceTimer: ReturnType<typeof setTimeout> | null = null

      rec.onstart = () => {
        recRef.current = rec
        retryCount.current = 0 // reset retries on successful start
        console.log('[Voice] ✅ SpeechRecognition started')
      }

      rec.onresult = (e: SpeechRecognitionEvent) => {
        finalText = ''; interimText = ''
        for (let i = 0; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          e.results[i].isFinal ? (finalText += t) : (interimText = t)
        }
        setTranscript(finalText || interimText)
        console.log('[Voice] onresult:', finalText || interimText)

        if (silenceTimer) clearTimeout(silenceTimer)
        silenceTimer = setTimeout(() => {
          try { rec.stop() } catch {}
        }, 1500)
      }

      rec.onspeechend = () => {
        console.log('[Voice] onspeechend')
        if (silenceTimer) clearTimeout(silenceTimer)
        try { rec.stop() } catch {}
      }

      rec.onend = () => {
        console.log('[Voice] onend → final:', `"${finalText}"`, 'interim:', `"${interimText}"`)
        if (silenceTimer) clearTimeout(silenceTimer)
        stopVol()
        recRef.current = null

        const text = (finalText || interimText).trim()
        if (text) {
          setTranscript(text)
          setState('thinking')
          console.log('[Voice] ✅ Sending to AI:', text)
          onResult(text)
        } else {
          console.warn('[Voice] No speech detected')
          setState('sleeping')
          setTranscript('')
        }
      }

      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        console.error('[Voice] SpeechRecognition error:', e.error, e.message)
        if (silenceTimer) clearTimeout(silenceTimer)
        stopVol()
        recRef.current = null

        if (e.error === 'network') {
          retryCount.current++
          if (retryCount.current <= MAX_RETRIES) {
            console.log(`[Voice] Network error, retry ${retryCount.current}/${MAX_RETRIES}...`)
            const delay = Math.pow(2, retryCount.current) * 500
            setTimeout(() => listen(onResult), delay)
            return
          }
          // All retries exhausted, try Whisper
          console.log('[Voice] All retries exhausted, falling back to Whisper')
          whisperFallback(onResult)
          return
        }

        if (e.error === 'no-speech') {
          // User didn't speak — not an error, just go back to sleep
          setState('sleeping')
          setTranscript('')
          return
        }

        setState('sleeping')
        setTranscript('')
      }

      try {
        rec.start()
      } catch (err) {
        console.error('[Voice] rec.start() threw:', err)
        stopVol()
        // Try Whisper as fallback
        whisperFallback(onResult)
      }
    }, 250)
  }, [startVol, stopVol, whisperFallback])

  // ── Speak (SpeechSynthesis TTS) ────────────────────────────────────────────
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
      .replace(/[🔑⚠️✅❌📅🌤️📰🎯🤖💬🔔📋📌📩💡📧👤▶️⏹️🌐]/g, '')
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

  // ── Stop everything ────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    try { recRef.current?.abort() } catch {}
    recRef.current = null
    try { window.speechSynthesis.cancel() } catch {}
    stopVol()
    setState('sleeping')
    setTranscript('')
  }, [stopVol])

  const isSupported = !!SR || !!(window as any).zeta?.audio?.transcribe

  return { state, setState, transcript, volume, listen, speak, stop, isSupported }
}
