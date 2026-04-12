import React, { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { Send, Loader2, Mic, Paperclip } from 'lucide-react'
import { useSettingsStore } from '../../store'

const AGENT_PLACEHOLDERS: Record<string, string> = {
  auto: 'Ask ZETA anything — it will route to the right agent...',
  coder: 'Describe the code you want to write or fix...',
  web: 'What do you want me to search or research?',
  rag: 'Ask a question about your indexed documents...',
  builder: 'Describe the website you want to build...',
  os: 'Tell ZETA what to do on your computer...'
}

interface Props {
  onSend: (message: string) => void
  isStreaming: boolean
}

export function ChatInput({ onSend, isStreaming }: Props): React.ReactElement {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { agentMode } = useSettingsStore()

  const handleSend = useCallback(() => {
    const msg = value.trim()
    if (!msg || isStreaming) return
    onSend(msg)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const paths = files.map((f) => (f as unknown as { path: string }).path).filter(Boolean)
      if (paths.length > 0) {
        setValue((v) => v + (v ? '\n' : '') + `File: ${paths.join(', ')}`)
      }
    }
  }

  return (
    <div
      className="relative rounded-2xl border border-[rgba(139,92,246,0.2)] bg-[#0f0f1a] focus-within:border-[rgba(139,92,246,0.45)] transition-all"
      onDrop={handleFileDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={AGENT_PLACEHOLDERS[agentMode]}
        disabled={isStreaming}
        rows={1}
        className="w-full bg-transparent text-sm text-[#e2e8f0] placeholder-[#334155] resize-none outline-none px-4 pt-3.5 pb-12 leading-relaxed disabled:opacity-50"
        style={{ minHeight: '56px', maxHeight: '200px' }}
      />

      {/* Bottom toolbar */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-lg text-[#334155] hover:text-[#64748b] hover:bg-[rgba(255,255,255,0.04)] transition-all"
            title="Attach file"
          >
            <Paperclip size={13} />
          </button>
          <button
            className="p-1.5 rounded-lg text-[#334155] hover:text-[#64748b] hover:bg-[rgba(255,255,255,0.04)] transition-all"
            title="Voice input"
          >
            <Mic size={13} />
          </button>
          <span className="text-[9px] text-[#1e293b] font-mono ml-1 hidden sm:block">
            Shift+Enter for newline
          </span>
        </div>

        {/* Character counter + send */}
        <div className="flex items-center gap-2">
          {value.length > 200 && (
            <span className="text-[9px] text-[#334155] font-mono">{value.length}</span>
          )}
          <button
            onClick={handleSend}
            disabled={!value.trim() || isStreaming}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              value.trim() && !isStreaming
                ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                : 'bg-[rgba(139,92,246,0.1)] text-[#475569] cursor-not-allowed'
            }`}
          >
            {isStreaming ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                <span>Generating</span>
              </>
            ) : (
              <>
                <Send size={11} />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
