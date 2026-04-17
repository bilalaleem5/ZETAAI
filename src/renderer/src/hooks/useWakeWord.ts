/**
 * useWakeWord — Always-listening background wake-word detector
 * Listens for "zeta" then calls onWake()
 */
import { useEffect, useRef, useCallback, useState } from 'react'

const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export function useWakeWord({ onWake, enabled = true }: {
  wakeWord?: string
  onWake: () => void
  enabled?: boolean
}) {
  const recRef    = useRef<SpeechRecognition | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runRef    = useRef(false)
  const enableRef = useRef(enabled)
  const onWakeRef = useRef(onWake)
  const [isWatching, setIsWatching] = useState(false)

  onWakeRef.current  = onWake
  enableRef.current  = enabled

  const stopRec = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (recRef.current) { try { recRef.current.abort() } catch {}; recRef.current = null }
    setIsWatching(false)
  }, [])

  const start = useCallback(() => {
    if (!enableRef.current || !runRef.current) return
    if (!SR) { console.warn('[Wake] SpeechRecognition unavailable'); return }

    stopRec()

    const r = new SR() as SpeechRecognition
    r.continuous      = true
    r.interimResults  = true
    r.lang            = 'en-US'
    r.maxAlternatives = 3

    r.onstart = () => {
      recRef.current = r
      setIsWatching(true)
      console.log('[Wake] 👂 Listening for "Zeta"...')
    }

    r.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        for (let j = 0; j < e.results[i].length; j++) {
          const t = e.results[i][j].transcript.toLowerCase().trim()
          if (t.includes('zeta') || t.includes('xeta') || t.includes('seta') || t.includes('beta ai')) {
            console.log('[Wake] 🎯 Wake word detected:', `"${t}"`)
            runRef.current = false
            stopRec()
            // 300ms gap before command mic starts — critical for Chrome
            setTimeout(() => onWakeRef.current(), 300)
            return
          }
        }
      }
    }

    r.onend = () => {
      setIsWatching(false)
      if (recRef.current === r) recRef.current = null
      if (runRef.current && enableRef.current) {
        timerRef.current = setTimeout(start, 600)
      }
    }

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      setIsWatching(false)
      if (recRef.current === r) recRef.current = null
      if (e.error === 'aborted') return
      console.warn('[Wake] Error:', e.error)
      if (runRef.current && enableRef.current) {
        timerRef.current = setTimeout(start, e.error === 'not-allowed' ? 5000 : 1500)
      }
    }

    try {
      r.start()
    } catch (err) {
      console.error('[Wake] start() failed:', err)
      if (runRef.current) timerRef.current = setTimeout(start, 2000)
    }
  }, [stopRec])

  const restartWatching = useCallback((ms = 1500) => {
    stopRec()
    timerRef.current = setTimeout(() => {
      if (!enableRef.current) return
      runRef.current = true
      start()
    }, ms)
  }, [start, stopRec])

  useEffect(() => {
    if (enabled) { runRef.current = true; start() }
    else { runRef.current = false; stopRec() }
    return () => { runRef.current = false; stopRec() }
  }, [enabled, start, stopRec])

  return { isWatching, restartWatching }
}

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
