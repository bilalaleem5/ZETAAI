import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceState = 'sleeping' | 'listening' | 'thinking' | 'speaking' | 'error'

export function useVoice() {
  const [state, setState] = useState<VoiceState>('sleeping')
  const [transcript, setTranscript] = useState('')
  const [volume, setVolume] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const volCtx = useRef<AudioContext | null>(null)
  const volStream = useRef<MediaStream | null>(null)
  const volAnim = useRef<number | null>(null)

  useEffect(() => {
    const load = () => {}
    window.speechSynthesis?.getVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  const stopVol = useCallback(() => {
    if (volAnim.current) { cancelAnimationFrame(volAnim.current); volAnim.current = null }
    volStream.current?.getTracks().forEach(t => t.stop())
    volStream.current = null
    try { volCtx.current?.close() } catch {}
    volCtx.current = null
    setVolume(0)
  }, [])

  const startVol = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      volStream.current = s
      const ctx = new AudioContext()
      volCtx.current = ctx
      const a = ctx.createAnalyser()
      a.fftSize = 256
      ctx.createMediaStreamSource(s).connect(a)
      const d = new Uint8Array(a.frequencyBinCount)
      const tick = () => {
        a.getByteFrequencyData(d)
        setVolume(Math.min(d.reduce((x, y) => x + y, 0) / d.length / 60, 1))
        volAnim.current = requestAnimationFrame(tick)
      }
      tick()
      return s
    } catch {
      return null
    }
  }, [])

  /**
   * CRITICAL FIX: Use MediaRecorder + Groq Whisper API instead of unreliable
   * webkitSpeechRecognition. This securely streams audio via Base64 to IPC
   * where Groq's large-v3 transcribes it.
   */
  const listen = useCallback(async (onResult: (text: string) => void) => {
    try { mediaRecorderRef.current?.stop() } catch {}
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    
    setTranscript('')
    setState('listening')
    audioChunksRef.current = []

    console.log('[Voice] Requesting microphone for Whisper STT...')
    const stream = await startVol()
    if (!stream) {
      console.error('[Voice] Failed to get mic stream')
      setState('error')
      setTimeout(() => setState('sleeping'), 2000)
      return
    }

    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorderRef.current = mr

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }

    mr.onstart = () => {
      console.log('[Voice] MediaRecorder started ✅')
      // Stop recording automatically if user says absolutely nothing for 6s
      silenceTimerRef.current = setTimeout(() => {
        console.log('[Voice] Silence timeout reached.')
        if (mr.state === 'recording') mr.stop()
      }, 6000)
    }

    // Process the audio chunk when we stop recording
    mr.onstop = async () => {
      console.log('[Voice] onstop: processing audio chunks...')
      stopVol()

      if (audioChunksRef.current.length === 0) {
        setState('sleeping')
        return
      }

      setState('thinking') // While Whisper is processing

      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      audioChunksRef.current = []

      // Convert Blob to Base64 to safely pass through IPC
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1] // remove data:audio/webm;base64,
        
        try {
          console.log('[Voice] Sending Base64 to Whisper STT via IPC...')
          const res = await (window as any).zeta.audio.transcribe(base64Data)
          if (res?.success && res?.text) {
            console.log('[Voice] Transcribed:', res.text)
            setTranscript(res.text)
            onResult(res.text)
          } else {
            console.warn('[Voice] Whisper STT empty or failed:', res?.error)
            setState('sleeping')
          }
        } catch (err) {
          console.error('[Voice] IPC STT error:', err)
          window.dispatchEvent(new CustomEvent('zeta:direct-command', { detail: { text: `[WHISPER STT ERROR] ${err}` } }))
          setState('sleeping')
        }
      }
    }

    mr.start()
  }, [startVol, stopVol])


  // Speaks text accurately exactly like before
  const speak = useCallback((text: string, onDone?: () => void) => {
    try { window.speechSynthesis.cancel() } catch {}
    setState('speaking')

    const clean = text
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`[^`]*`/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/#{1,6} /g, '')
      .replace(/[🔑⚠️✅❌]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300)

    console.log('[Voice] Speaking:', clean.slice(0, 60))
    if (!clean) { setState('sleeping'); onDone?.(); return }

    let done = false
    const finish = () => {
      if (done) return; done = true
      try { window.speechSynthesis.cancel() } catch {}
      setState('sleeping'); onDone?.()
    }

    const to = setTimeout(finish, Math.min(clean.split(' ').length * 200 + 3000, 20000))

    let spoken = false
    const doSpeak = () => {
      if (spoken) return
      spoken = true
      const u = new SpeechSynthesisUtterance(clean)
      u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0; u.lang = 'en-US'
      const vv = window.speechSynthesis.getVoices()
      const v = vv.find(v => v.name === 'Google US English') ||
                vv.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
                vv.find(v => v.lang === 'en-US') || vv[0]
      if (v) u.voice = v
      u.onend = () => { clearTimeout(to); finish() }
      u.onerror = (e) => { console.warn('[TTS]', e.error); clearTimeout(to); finish() }
      setTimeout(() => { try { window.speechSynthesis.speak(u) } catch { clearTimeout(to); finish() } }, 100)
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak()
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
      setTimeout(doSpeak, 800)
    }
  }, [])

  const stop = useCallback(() => {
    // If currently recording, executing stop will trigger mr.onstop > thinking > onResult
    // so we just cancel everything hard.
    try { mediaRecorderRef.current?.stop() } catch {}
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    audioChunksRef.current = [] // drop audio

    try { window.speechSynthesis.cancel() } catch {}
    stopVol()
    setState('sleeping')
    setTranscript('')
  }, [stopVol])

  return { state, setState, transcript, volume, listen, speak, stop, mediaRecorderRef }
}
