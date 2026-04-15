import { useEffect, useRef, useCallback, useState } from 'react'

export function useWakeWord({ onWake, enabled = true }: { wakeWord?: string; onWake: () => void; enabled?: boolean }) {
  const recRef    = useRef<SpeechRecognition | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runRef    = useRef(false)
  const enableRef = useRef(enabled)
  const onWakeRef = useRef(onWake)
  const [isWatching, setIsWatching] = useState(false)
  onWakeRef.current  = onWake
  enableRef.current  = enabled

  // FIX #4: Centralized stop helper — aborts the current recognition instance
  // and clears all pending restart timers before doing anything else.
  const stopCurrent = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (recRef.current) {
      try { recRef.current.abort() } catch {}
      recRef.current = null
    }
    setIsWatching(false)
  }, [])

  const start = useCallback(() => {
    if (!enableRef.current || !runRef.current) return

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { console.warn('[Wake] SpeechRecognition not available'); return }

    // FIX #4: Always abort any existing instance before creating a new one.
    // This prevents two simultaneous SpeechRecognition sessions which Chrome
    // silently kills by erroring both with 'aborted'.
    if (recRef.current) {
      try { recRef.current.abort() } catch {}
      recRef.current = null
    }

    const r = new SR()
    r.continuous = true; r.interimResults = true; r.lang = 'en-US'

    r.onstart  = () => { setIsWatching(true); console.log('[Wake] 👂 Listening for "Zeta"...') }

    r.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        for (let j = 0; j < e.results[i].length; j++) {
          const t = e.results[i][j].transcript.toLowerCase()
          if (t.includes('zeta') || t.includes('xeta') || t.includes('seta')) {
            console.log('[Wake] 🎯 Wake word! Heard:', `"${t}"`)
            // FIX #4: Set runRef false BEFORE aborting to prevent the onend
            // handler from scheduling a restart while we're waking up.
            runRef.current = false
            recRef.current = null
            setIsWatching(false)
            try { r.abort() } catch {}
            onWakeRef.current()
            return
          }
        }
      }
    }

    r.onend = () => {
      setIsWatching(false)
      if (recRef.current === r) recRef.current = null
      // Only restart if still supposed to be running
      if (runRef.current && enableRef.current) {
        timerRef.current = setTimeout(start, 600)
      }
    }

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      setIsWatching(false)
      if (recRef.current === r) recRef.current = null
      console.warn('[Wake] Error:', e.error)
      if (e.error === 'aborted') return // intentional abort, do not restart
      if (runRef.current && enableRef.current) {
        timerRef.current = setTimeout(start, e.error === 'not-allowed' ? 5000 : 1500)
      }
    }

    recRef.current = r
    try { r.start() }
    catch (err) {
      console.error('[Wake] start() failed:', err)
      recRef.current = null
      if (runRef.current) timerRef.current = setTimeout(start, 2000)
    }
  }, [stopCurrent]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * FIX #4: restartWatching first fully stops any active session then waits
   * the given delay before re-starting. This guarantees useVoice.listen()'s
   * SpeechRecognition instance has time to fully terminate before we spin up
   * a new wake-word listener (Chrome only allows one instance at a time).
   */
  const restartWatching = useCallback((ms = 1500) => {
    stopCurrent()
    timerRef.current = setTimeout(() => {
      if (!enableRef.current) return
      runRef.current = true
      start()
    }, ms)
  }, [start, stopCurrent])

  useEffect(() => {
    if (enabled) {
      runRef.current = true
      start()
    } else {
      runRef.current = false
      stopCurrent()
    }
    return () => {
      runRef.current = false
      stopCurrent()
    }
  }, [enabled, start, stopCurrent])

  return { isWatching, restartWatching }
}

export function useClapDetection({ onClap, enabled = true }: { onClap: () => void; enabled?: boolean }) {
  const ref = useRef(onClap); ref.current = onClap
  useEffect(() => {
    if (!enabled) return
    let alive = true, id: number, last = 0, loud = false
    let s: MediaStream | null = null, ctx: AudioContext | null = null
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (!alive) { stream.getTracks().forEach(t => t.stop()); return }
      s = stream; ctx = new AudioContext()
      const a = ctx.createAnalyser(); a.fftSize = 256; a.smoothingTimeConstant = 0.1
      ctx.createMediaStreamSource(s).connect(a)
      const d = new Uint8Array(a.frequencyBinCount)
      const tick = () => {
        if (!alive) return
        a.getByteFrequencyData(d)
        const isL = Math.max(...Array.from(d)) > 180
        if (isL && !loud) {
          const now = Date.now(), gap = now - last
          if (gap > 150 && gap < 700) { ref.current(); last = 0 } else last = now
        }
        loud = isL; id = requestAnimationFrame(tick)
      }; tick()
    }).catch(() => {})
    return () => { alive = false; cancelAnimationFrame(id); s?.getTracks().forEach(t => t.stop()); ctx?.close().catch(() => {}) }
  }, [enabled])
}
