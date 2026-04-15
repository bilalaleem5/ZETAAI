import React, { useState } from 'react'
import {
  Mouse, Keyboard, Monitor, FolderOpen, Globe,
  ChevronDown, ChevronUp, Play, Square, Camera,
  Type, Zap, Terminal, X
} from 'lucide-react'

interface WidgetProps {
  onClose?: () => void
}

// ── Mouse Control Widget ──────────────────────────────────────────────────────
function MouseWidget(): React.ReactElement {
  const [x, setX] = useState('500')
  const [y, setY] = useState('500')
  const [status, setStatus] = useState('')

  const move = async () => {
    setStatus('Moving...')
    const res = await window.zeta.os.mouseMove(parseInt(x), parseInt(y))
    setStatus(res.success ? `✓ Moved to (${x}, ${y})` : `✗ ${res.error}`)
  }

  const click = async () => {
    setStatus('Clicking...')
    const res = await window.zeta.os.mouseClick(parseInt(x), parseInt(y))
    setStatus(res.success ? `✓ Clicked at (${x}, ${y})` : `✗ ${res.error}`)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-[#475569] uppercase tracking-wider block mb-1">X</label>
          <input
            value={x}
            onChange={e => setX(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[rgba(139,92,246,0.2)] rounded-lg px-2 py-1.5 text-xs text-[#e2e8f0] outline-none font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] text-[#475569] uppercase tracking-wider block mb-1">Y</label>
          <input
            value={y}
            onChange={e => setY(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[rgba(139,92,246,0.2)] rounded-lg px-2 py-1.5 text-xs text-[#e2e8f0] outline-none font-mono"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={move} className="flex-1 py-1.5 rounded-lg bg-[rgba(139,92,246,0.12)] hover:bg-[rgba(139,92,246,0.22)] text-[#8b5cf6] text-xs border border-[rgba(139,92,246,0.2)] transition-all">
          Move
        </button>
        <button onClick={click} className="flex-1 py-1.5 rounded-lg bg-[rgba(6,182,212,0.12)] hover:bg-[rgba(6,182,212,0.22)] text-[#06b6d4] text-xs border border-[rgba(6,182,212,0.2)] transition-all">
          Click
        </button>
      </div>
      {status && <p className="text-[10px] font-mono text-[#64748b]">{status}</p>}
    </div>
  )
}

// ── Keyboard Widget ───────────────────────────────────────────────────────────
function KeyboardWidget(): React.ReactElement {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')

  const typeText = async () => {
    if (!text) return
    setStatus('Typing...')
    const res = await window.zeta.os.typeText(text)
    setStatus(res.success ? '✓ Typed' : `✗ ${res.error}`)
  }

  const shortcuts = [
    { label: 'Copy', keys: ['ctrl', 'c'] },
    { label: 'Paste', keys: ['ctrl', 'v'] },
    { label: 'Save', keys: ['ctrl', 's'] },
    { label: 'Undo', keys: ['ctrl', 'z'] },
    { label: 'All', keys: ['ctrl', 'a'] },
    { label: 'Tab', keys: ['tab'] }
  ]

  const pressShortcut = async (keys: string[]) => {
    setStatus(`Pressing ${keys.join('+')}...`)
    const res = await window.zeta.os.keyShortcut(keys)
    setStatus(res.success ? `✓ ${keys.join('+')}` : `✗ ${res.error}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && typeText()}
          placeholder="Type text to inject..."
          className="flex-1 bg-[#0a0a0f] border border-[rgba(139,92,246,0.2)] rounded-lg px-2 py-1.5 text-xs text-[#e2e8f0] placeholder-[#334155] outline-none"
        />
        <button onClick={typeText} className="px-3 py-1.5 rounded-lg bg-[rgba(139,92,246,0.12)] hover:bg-[rgba(139,92,246,0.22)] text-[#8b5cf6] text-xs border border-[rgba(139,92,246,0.2)] transition-all">
          <Type size={11} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {shortcuts.map(s => (
          <button
            key={s.label}
            onClick={() => pressShortcut(s.keys)}
            className="py-1.5 rounded-lg bg-[#0a0a0f] hover:bg-[rgba(139,92,246,0.08)] text-[#64748b] hover:text-[#8b5cf6] text-[10px] border border-[rgba(139,92,246,0.1)] hover:border-[rgba(139,92,246,0.3)] transition-all font-mono"
          >
            {s.label}
          </button>
        ))}
      </div>
      {status && <p className="text-[10px] font-mono text-[#64748b]">{status}</p>}
    </div>
  )
}

// ── Screen Widget ─────────────────────────────────────────────────────────────
function ScreenWidget(): React.ReactElement {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [loading, setLoading] = useState(false)

  const capture = async () => {
    setLoading(true)
    const res = await window.zeta.screen.capture()
    setLoading(false)
    if (res.success && res.data) setScreenshot(res.data as string)
  }

  const readScreen = async () => {
    setLoading(true)
    const res = await window.zeta.screen.ocr()
    setLoading(false)
    if (res.success && res.data) setOcrText(res.data as string)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={capture}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[rgba(16,185,129,0.1)] hover:bg-[rgba(16,185,129,0.18)] text-[#10b981] text-xs border border-[rgba(16,185,129,0.2)] transition-all disabled:opacity-50"
        >
          <Camera size={11} />
          Screenshot
        </button>
        <button
          onClick={readScreen}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] hover:bg-[rgba(245,158,11,0.18)] text-[#f59e0b] text-xs border border-[rgba(245,158,11,0.2)] transition-all disabled:opacity-50"
        >
          <Monitor size={11} />
          Read OCR
        </button>
      </div>
      {screenshot && (
        <img src={screenshot} alt="screen" className="w-full rounded-lg border border-[rgba(139,92,246,0.15)] opacity-90" />
      )}
      {ocrText && (
        <div className="bg-[#0a0a0f] border border-[rgba(139,92,246,0.15)] rounded-lg p-2 max-h-24 overflow-y-auto">
          <p className="text-[10px] text-[#64748b] font-mono leading-relaxed whitespace-pre-wrap">{ocrText.slice(0, 400)}</p>
        </div>
      )}
    </div>
  )
}

// ── Terminal Widget ───────────────────────────────────────────────────────────
function WindowsWidget(): React.ReactElement {
  const [windows, setWindows] = useState<Array<{ ProcessName: string; MainWindowTitle: string }>>([])
  const [loading, setLoading] = useState(false)

  const listWindows = async () => {
    setLoading(true)
    const res = await window.zeta.os.listWindows()
    setLoading(false)
    if (res.success && res.data) {
      const data = res.data
      if (Array.isArray(data)) setWindows(data as Array<{ ProcessName: string; MainWindowTitle: string }>)
    }
  }

  const focus = async (title: string) => {
    await window.zeta.os.focusWindow(title)
  }

  return (
    <div className="space-y-3">
      <button
        onClick={listWindows}
        disabled={loading}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[rgba(139,92,246,0.1)] hover:bg-[rgba(139,92,246,0.18)] text-[#8b5cf6] text-xs border border-[rgba(139,92,246,0.2)] transition-all"
      >
        <Terminal size={11} />
        {loading ? 'Scanning...' : 'List Open Windows'}
      </button>
      {windows.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {windows.filter(w => w.MainWindowTitle).slice(0, 8).map((w, i) => (
            <button
              key={i}
              onClick={() => focus(w.MainWindowTitle)}
              className="w-full text-left px-2 py-1.5 rounded-lg bg-[#0a0a0f] hover:bg-[rgba(139,92,246,0.08)] border border-transparent hover:border-[rgba(139,92,246,0.2)] transition-all"
            >
              <p className="text-[10px] text-[#64748b] font-mono truncate">{w.MainWindowTitle}</p>
              <p className="text-[9px] text-[#334155]">{w.ProcessName}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main WidgetPanel ──────────────────────────────────────────────────────────
const WIDGETS = [
  { id: 'mouse', label: 'Ghost Mouse', icon: <Mouse size={12} />, color: '#8b5cf6', component: <MouseWidget /> },
  { id: 'keyboard', label: 'Phantom Typer', icon: <Keyboard size={12} />, color: '#06b6d4', component: <KeyboardWidget /> },
  { id: 'screen', label: 'Screen Intel', icon: <Monitor size={12} />, color: '#10b981', component: <ScreenWidget /> },
  { id: 'windows', label: 'Window Control', icon: <Terminal size={12} />, color: '#f59e0b', component: <WindowsWidget /> }
]

export function WidgetPanel(): React.ReactElement {
  const [open, setOpen] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)

  if (!visible) return (
    <button
      onClick={() => setVisible(true)}
      className="fixed bottom-20 right-4 w-9 h-9 rounded-xl bg-[#0f0f1a] border border-[rgba(139,92,246,0.3)] flex items-center justify-center text-[#8b5cf6] hover:bg-[rgba(139,92,246,0.1)] transition-all shadow-lg z-40"
    >
      <Zap size={14} />
    </button>
  )

  return (
    <div className="fixed bottom-20 right-4 z-40 w-64 animate-slide-up">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0f0f1a] border border-[rgba(139,92,246,0.25)] rounded-t-xl">
        <div className="flex items-center gap-2">
          <Zap size={11} className="text-[#8b5cf6]" />
          <span className="text-[10px] font-semibold text-[#8b5cf6] uppercase tracking-widest">OS Control</span>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-[#334155] hover:text-[#64748b] transition-colors"
        >
          <X size={11} />
        </button>
      </div>

      {/* Widgets */}
      <div className="bg-[#0a0a0f] border border-t-0 border-[rgba(139,92,246,0.2)] rounded-b-xl overflow-hidden">
        {WIDGETS.map((w, i) => (
          <div key={w.id} className={i > 0 ? 'border-t border-[rgba(139,92,246,0.08)]' : ''}>
            <button
              onClick={() => setOpen(open === w.id ? null : w.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[rgba(255,255,255,0.02)] transition-all"
            >
              <div className="flex items-center gap-2">
                <span style={{ color: w.color }}>{w.icon}</span>
                <span className="text-[11px] text-[#64748b] font-medium">{w.label}</span>
              </div>
              {open === w.id
                ? <ChevronUp size={10} className="text-[#334155]" />
                : <ChevronDown size={10} className="text-[#334155]" />
              }
            </button>
            {open === w.id && (
              <div className="px-3 pb-3 animate-fade">
                {w.component}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
