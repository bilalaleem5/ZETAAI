/**
 * useWakeWord — Always-listening via AudioContext energy detection
 * 
 * ARCHITECTURE: Instead of Chrome SpeechRecognition (unreliable in Electron),
 * we use AudioContext energy analysis to detect when someone is speaking,
 * then use Whisper STT to check if they said the wake word.
 * 
 * Flow: mic → AudioContext energy → threshold → record 2s → Whisper STT → check "zeta"
 */
import { useEffect, useRef, useCallback, useState } from 'react'

const WAKE_WORDS = ['zeta', 'xeta', 'seta', 'beta ai', 'zita', 'zeeta', 'data', 'theta']
const ENERGY_THRESHOLD = 40  // average byte frequency threshold for "someone is speaking"
const SILENCE_AFTER_MS = 1500 // ms of silence after speech to trigger STT
const MIN_SPEECH_MS = 300     // minimum speech duration to bother transcribing

export function useWakeWord({ onWake, enabled = true }: {
  wakeWord?: string
  onWake: () => void
  enabled?: boolean
}) {
  const [isWatching, setIsWatching] = useState(false)
  const enabledRef = useRef(enabled)
  const onWakeRef = useRef(onWake)
  const activeRef = useRef(false)
  const cooldownRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  onWakeRef.current = onWake
  enabledRef.current = enabled

  const stopAll = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    activeRef.current = false
    cleanupRef.current?.()
    cleanupRef.current = null
    setIsWatching(false)
  }, [])

  const startListening = useCallback(() => {
    if (!enabledRef.current || activeRef.current || cooldownRef.current) return
    activeRef.current = true

    let alive = true
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let animId: number
    let recorder: MediaRecorder | null = null
    let isSpeaking = false
    let speechStart = 0
    let silenceTimer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      alive = false
      if (silenceTimer) clearTimeout(silenceTimer)
      cancelAnimationFrame(animId)
      try { recorder?.stop() } catch {}
      stream?.getTracks().forEach(t => t.stop())
      try { ctx?.close() } catch {}
      activeRef.current = false
      setIsWatching(false)
    }
    cleanupRef.current = cleanup

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(s => {
        if (!alive) { s.getTracks().forEach(t => t.stop()); return }
        stream = s
        ctx = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.3
        ctx.createMediaStreamSource(stream).connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        setIsWatching(true)
        console.log('[Wake] 👂 Listening for "Zeta" (Whisper-based)...')

        const processAudio = () => {
          if (!alive) return
          analyser.getByteFrequencyData(data)
          const avg = data.reduce((a, b) => a + b, 0) / data.length

          if (avg > ENERGY_THRESHOLD) {
            // Speech detected
            if (!isSpeaking) {
              isSpeaking = true
              speechStart = Date.now()
            }
            // Reset silence timer
            if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null }
            silenceTimer = setTimeout(() => {
              // Silence after speech — check with Whisper
              if (isSpeaking && Date.now() - speechStart > MIN_SPEECH_MS) {
                isSpeaking = false
                recordAndCheck()
              } else {
                isSpeaking = false
              }
            }, SILENCE_AFTER_MS)
          }

          animId = requestAnimationFrame(processAudio)
        }
        processAudio()

        async function recordAndCheck() {
          if (!alive || !stream || cooldownRef.current) return
          cancelAnimationFrame(animId) // pause energy detection during recording

          try {
            // Record a short clip
            const rec = new MediaRecorder(stream!, { mimeType: 'audio/webm' })
            const chunks: Blob[] = []
            rec.ondataavailable = e => chunks.push(e.data)

            const result = await new Promise<string>((resolve) => {
              rec.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                if (blob.size < 1000) { resolve(''); return }
                const reader = new FileReader()
                reader.onloadend = async () => {
                  const b64 = (reader.result as string).split(',')[1]
                  if (!b64) { resolve(''); return }
                  try {
                    const zeta = (window as any).zeta
                    if (!zeta?.audio?.transcribe) { resolve(''); return }
                    const res = await zeta.audio.transcribe(b64)
                    resolve(res?.success ? (res.text || '') : '')
                  } catch { resolve('') }
                }
                reader.readAsDataURL(blob)
              }
              rec.start()
              setTimeout(() => {
                if (rec.state === 'recording') rec.stop()
              }, 2000) // record 2 seconds
            })

            const lower = result.toLowerCase().trim()
            console.log('[Wake] Whisper heard:', `"${lower}"`)

            if (lower && WAKE_WORDS.some(w => lower.includes(w))) {
              console.log('[Wake] 🎯 Wake word DETECTED!')
              cooldownRef.current = true
              setIsWatching(false)
              cleanup()
              setTimeout(() => onWakeRef.current(), 300)
              return
            }
          } catch (e) {
            console.warn('[Wake] Record/transcribe error:', e)
          }

          // Resume energy detection
          if (alive) {
            animId = requestAnimationFrame(processAudio)
          }
        }
      })
      .catch(e => {
        console.error('[Wake] Mic access denied:', e)
        activeRef.current = false
        setIsWatching(false)
      })
  }, [])

  const restartWatching = useCallback((ms = 1500) => {
    stopAll()
    cooldownRef.current = false
    timerRef.current = setTimeout(() => {
      if (enabledRef.current) startListening()
    }, ms)
  }, [startListening, stopAll])

  useEffect(() => {
    if (enabled) startListening()
    else stopAll()
    return () => stopAll()
  }, [enabled, startListening, stopAll])

  return { isWatching, restartWatching }
}

// ── Clap Detection (keep as-is, it's audio-based and works) ──────────────────
export function useClapDetection({ onClap, enabled = true }: {
  onClap: () => void
  enabled?: boolean
}) {
  const onClapRef = useRef(onClap)
  onClapRef.current = onClap

  useEffect(() => {
    if (!enabled) return
    let alive = true, animId: number, lastClap = 0, wasLoud = false
    let stream: MediaStream | null = null, ctx: AudioContext | null = null

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(s => {
        if (!alive) { s.getTracks().forEach(t => t.stop()); return }
        stream = s; ctx = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.1
        ctx.createMediaStreamSource(stream).connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          if (!alive) return
          analyser.getByteFrequencyData(data)
          const isLoud = Math.max(...Array.from(data)) > 185
          if (isLoud && !wasLoud) {
            const now = Date.now(), gap = now - lastClap
            if (gap > 150 && gap < 700) { onClapRef.current(); lastClap = 0 }
            else lastClap = now
          }
          wasLoud = isLoud
          animId = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => {})

    return () => {
      alive = false; cancelAnimationFrame(animId)
      stream?.getTracks().forEach(t => t.stop()); ctx?.close().catch(() => {})
    }
  }, [enabled])
}
