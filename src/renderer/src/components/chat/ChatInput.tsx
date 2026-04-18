import React, { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react'
import { Send, Loader2, Mic, MicOff, Paperclip, Square } from 'lucide-react'
import { useSettingsStore } from '../../store'

const PLACEHOLDERS: Record<string, string> = {
  auto:    'Ask ZETA anything — or click 🎤 to speak...',
  coder:   'Describe the code you want to write or fix...',
  web:     'What do you want me to search or research?',
  rag:     'Ask about your indexed documents...',
  builder: 'Describe the website you want to build...',
  chat:    'Just talk... hi, kaise ho, kya scene hai? 😄',
  os:      'Tell ZETA what to do on your computer...'
}

interface Props { onSend: (msg: string) => void; isStreaming: boolean }

export function ChatInput({ onSend, isStreaming }: Props): React.ReactElement {
  const [value,       setValue]      = useState('')
  const [listening,   setListening]  = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const { agentMode } = useSettingsStore()

  // Cleanup on unmount
  useEffect(() => () => {
    try { recorderRef.current?.stop() } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const startListening = useCallback(async () => {
    if (listening || transcribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: Blob[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setListening(false)

        const blob = new Blob(chunks, { type: 'audio/webm' })
        if (blob.size < 1000) return

        setTranscribing(true)
        setValue('Transcribing...')

        try {
          const reader = new FileReader()
          const b64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '')
            reader.readAsDataURL(blob)
          })
          if (!b64) { setTranscribing(false); setValue(''); return }

          const zeta = (window as any).zeta
          if (!zeta?.audio?.transcribe) {
            setValue('⚠️ Voice not available — type your message')
            setTranscribing(false)
            return
          }
          const res = await zeta.audio.transcribe(b64)
          setTranscribing(false)
          if (res?.success && res.text?.trim()) {
            const text = res.text.trim()
            setValue('')
            onSend(text)
          } else {
            setValue('')
          }
        } catch (e) {
          console.error('[ChatInput] Whisper error:', e)
          setTranscribing(false)
          setValue('')
        }
      }
      recorderRef.current = recorder
      recorder.start()
      setListening(true)

      // Max 15 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 15000)
    } catch (e) {
      console.error('[ChatInput] Mic access denied:', e)
    }
  }, [listening, transcribing, onSend])

  const stopListening = useCallback(() => {
    try {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    } catch {}
  }, [])

  const toggleVoice = listening ? stopListening : startListening

  const handleSend = useCallback(() => {
    const msg = value.trim()
    if (!msg || isStreaming || transcribing) return
    onSend(msg); setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [value, isStreaming, transcribing, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (transcribing) return
    setValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  return (
    <div className={`relative rounded-2xl border bg-[#0f0f1a] transition-all ${
      listening
        ? 'border-[rgba(16,185,129,0.6)] shadow-[0_0_20px_rgba(16,185,129,0.15)]'
        : transcribing
          ? 'border-[rgba(245,158,11,0.5)] shadow-[0_0_15px_rgba(245,158,11,0.1)]'
          : 'border-[rgba(139,92,246,0.2)] focus-within:border-[rgba(139,92,246,0.45)]'
    }`}>
      {listening && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-[9px] text-[#10b981] font-mono uppercase tracking-widest">Recording — click stop when done</span>
          </div>
        </div>
      )}
      {transcribing && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 size={10} className="text-[#f59e0b] animate-spin" />
            <span className="text-[9px] text-[#f59e0b] font-mono uppercase tracking-widest">Transcribing with Whisper...</span>
          </div>
        </div>
      )}
      <textarea
        ref={textareaRef} value={value} onChange={handleChange} onKeyDown={handleKeyDown}
        placeholder={listening ? 'Speak now...' : PLACEHOLDERS[agentMode] || PLACEHOLDERS.auto}
        disabled={isStreaming || transcribing} rows={1}
        className="w-full bg-transparent text-sm text-[#e2e8f0] placeholder-[#334155] resize-none outline-none px-4 pt-3.5 pb-12 leading-relaxed disabled:opacity-50"
        style={{ minHeight: '56px', maxHeight: '200px' }}
      />
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={toggleVoice} title={listening ? 'Stop recording' : 'Voice input (Whisper STT)'}
            disabled={transcribing}
            className={`p-1.5 rounded-lg transition-all ${
              listening
                ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.4)] animate-pulse'
                : transcribing
                  ? 'text-[#f59e0b] cursor-wait'
                  : 'text-[#475569] hover:text-[#8b5cf6] hover:bg-[rgba(139,92,246,0.08)]'
            }`}>
            {listening ? <Square size={13} /> : transcribing ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
          </button>
          <button className="p-1.5 rounded-lg text-[#334155] hover:text-[#64748b] hover:bg-[rgba(255,255,255,0.04)] transition-all">
            <Paperclip size={13} />
          </button>
        </div>
        <button onClick={handleSend} disabled={!value.trim() || isStreaming || transcribing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            value.trim() && !isStreaming && !transcribing
              ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
              : 'bg-[rgba(139,92,246,0.1)] text-[#475569] cursor-not-allowed'
          }`}>
          {isStreaming ? <><Loader2 size={11} className="animate-spin" /><span>Generating</span></> : <><Send size={11} /><span>Send</span></>}
        </button>
      </div>
    </div>
  )
}
