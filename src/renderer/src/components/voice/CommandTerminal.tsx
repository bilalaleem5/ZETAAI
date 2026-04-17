import React, { useState, useEffect, useRef } from 'react'
import { ZetaMode } from '../../hooks/useZetaCore'

interface Props {
  mode: ZetaMode
  transcript: string
  streamingText?: string
  lastResponse: string
  onManualSend: (text: string) => void
  isListening: boolean
}

const BOOT_LINES = [
  { text: 'Initializing neural core...', delay: 0, ok: true },
  { text: 'Calibrating arc reactor output', delay: 300, ok: true },
  { text: 'Connecting to threat detection network', delay: 600, ok: true },
  { text: 'Synchronizing tactical database', delay: 900, ok: true },
  { text: 'Establishing secure channel', delay: 1200, ok: true },
  { text: '[ ALL SYSTEMS NOMINAL   STANDING BY ]', delay: 1600, ok: false },
]

export function CommandTerminal({ mode, transcript, streamingText = '', lastResponse, onManualSend, isListening }: Props): React.ReactElement {
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<Array<{ text: string; type: 'system' | 'user' | 'zeta' | 'ok' | 'boot' }>>([])
  const [booted, setBooted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const bootedRef = useRef(false)
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    const timers: ReturnType<typeof setTimeout>[] = []
    BOOT_LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        setLines(prev => [...prev, {
          text: line.ok ? `${line.text.padEnd(45, '.')} OK` : line.text,
          type: line.ok ? 'boot' : 'system'
        }])
        if (i === BOOT_LINES.length - 1) {
          const t2 = setTimeout(() => {
            setLines(prev => [...prev, { text: 'ZETA  ○  Online. All neural cores active. How may I assist you?', type: 'zeta' }])
            setBooted(true)
          }, 400)
          timers.push(t2)
        }
      }, line.delay)
      timers.push(t)
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  // Add transcript line
  useEffect(() => {
    if (transcript && mode === 'listening') {
      // live update — don't add yet
    }
    if (transcript && mode === 'thinking') {
      setLines(prev => {
        // remove duplicate if last was same
        const last = prev[prev.length - 1]
        if (last?.type === 'user' && last.text.includes(transcript)) return prev
        return [...prev, { text: `○  ${transcript}`, type: 'user' }]
      })
    }
  }, [transcript, mode])

  // Add response
  useEffect(() => {
    if (lastResponse && mode === 'sleeping') {
      setLines(prev => {
        const last = prev[prev.length - 1]
        if (last?.type === 'zeta' && last.text.includes(lastResponse.slice(0, 20))) return prev
        return [...prev, {
          text: `ZETA  ○  ${lastResponse.slice(0, 180)}${lastResponse.length > 180 ? '...' : ''}`,
          type: 'zeta'
        }]
      })
    }
  }, [lastResponse, mode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const handleSend = () => {
    if (!input.trim()) return
    setLines(prev => [...prev, { text: `○  ${input}`, type: 'user' }])
    onManualSend(input)
    setInput('')
  }

  return (
    <div className="panel flex flex-col" style={{ height: '100%' }}>
      {/* Terminal header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b" style={{ borderColor: 'rgba(0,229,204,0.15)' }}>
        <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse-cyan" />
        <span className="panel-title tracking-widest">
          ZETA AI · COMMAND INTERFACE · NEURAL LINK {isListening ? 'LISTENING' : 'ACTIVE'}
        </span>
        {isListening && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </span>
        )}
      </div>

      {/* Terminal output */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" style={{ minHeight: 0 }}>
        {lines.map((line, i) => (
          <div key={i} className="terminal-text animate-boot" style={{ animationDelay: `${i * 0.02}s` }}>
            {line.type === 'boot' && (
              <span style={{ color: 'rgba(0,229,204,0.7)' }}>
                {line.text.split('OK')[0]}
                <span className="terminal-ok">OK</span>
              </span>
            )}
            {line.type === 'system' && (
              <span style={{ color: '#00e5cc', textAlign: 'center', display: 'block', letterSpacing: '0.2em' }}>
                {line.text}
              </span>
            )}
            {line.type === 'user' && (
              <span style={{ color: '#00e5cc' }}>{line.text}</span>
            )}
            {line.type === 'zeta' && (
              <span style={{ color: '#00e5cc' }}>{line.text}</span>
            )}
          </div>
        ))}

        {/* Live transcript */}
        {transcript && mode === 'listening' && (
          <div className="terminal-text" style={{ color: 'rgba(0,229,204,0.6)' }}>
            ○  {transcript}<span className="animate-blink">_</span>
          </div>
        )}

        {streamingText && (
          <div style={{fontSize:11,color:'#00e5cc',lineHeight:1.7,marginTop:2}}>
            <span style={{color:'#00b4d8',fontWeight:'bold'}}>ZETA ○  </span>
            {streamingText.slice(-500)}
            <span className="animate-blink" style={{color:'#00b4d8'}}>▋</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-t" style={{ borderColor: 'rgba(0,229,204,0.15)' }}>
        <span style={{ color: 'rgba(0,229,204,0.5)', fontSize: 12 }}>○</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={isListening ? 'Listening...' : 'Type command or say "Zeta"...'}
          className="flex-1 bg-transparent outline-none terminal-text"
          style={{
            color: '#00e5cc',
            fontSize: 12,
            caretColor: '#00e5cc',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="px-4 py-1 text-[11px] font-bold tracking-widest transition-all"
          style={{
            fontFamily: 'Orbitron, monospace',
            color: input.trim() ? '#000d0d' : 'rgba(0,229,204,0.3)',
            background: input.trim() ? '#00e5cc' : 'transparent',
            border: `1px solid ${input.trim() ? '#00e5cc' : 'rgba(0,229,204,0.2)'}`,
            boxShadow: input.trim() ? '0 0 10px #00e5cc' : 'none'
          }}
        >
          TRANSMIT
        </button>
        <button
          onClick={() => setInput('')}
          className="px-2 py-1 text-[11px] tracking-widest"
          style={{
            fontFamily: 'Orbitron, monospace',
            color: 'rgba(0,229,204,0.4)',
            border: '1px solid rgba(0,229,204,0.15)'
          }}
        >
          CLR
        </button>
      </div>
    </div>
  )
}
