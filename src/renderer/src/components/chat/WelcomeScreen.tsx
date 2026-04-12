import React from 'react'
import {
  Zap, Code2, Globe, Brain, Layout, Cpu,
  ArrowRight, Terminal, FileText, Search
} from 'lucide-react'
import { useSettingsStore } from '../../store'

const QUICK_PROMPTS = [
  { icon: <Code2 size={13} />, label: 'Write a Python web scraper', mode: 'coder' as const },
  { icon: <Globe size={13} />, label: 'Search latest AI news', mode: 'web' as const },
  { icon: <Layout size={13} />, label: 'Build me a portfolio website', mode: 'builder' as const },
  { icon: <Terminal size={13} />, label: 'Open VS Code and create a project', mode: 'os' as const },
  { icon: <FileText size={13} />, label: 'Summarize my documents', mode: 'rag' as const },
  { icon: <Search size={13} />, label: 'Research quantum computing trends', mode: 'web' as const }
]

const CAPABILITIES = [
  {
    icon: <Code2 size={16} />,
    color: '#06b6d4',
    title: 'Coder Agent',
    desc: 'Writes & executes real code files on your disk. Supports all languages.'
  },
  {
    icon: <Globe size={16} />,
    color: '#10b981',
    title: 'Web Intelligence',
    desc: 'Searches the web, scrapes pages, and synthesizes real-time information.'
  },
  {
    icon: <Brain size={16} />,
    color: '#f59e0b',
    title: 'RAG Memory',
    desc: 'Indexes your local documents and answers questions from them.'
  },
  {
    icon: <Layout size={16} />,
    color: '#ec4899',
    title: 'Site Builder',
    desc: 'Generates complete HTML/CSS/JS websites and opens them instantly.'
  },
  {
    icon: <Cpu size={16} />,
    color: '#ef4444',
    title: 'OS Control',
    desc: 'Controls your mouse, keyboard, windows, and file system autonomously.'
  },
  {
    icon: <Zap size={16} />,
    color: '#8b5cf6',
    title: 'Auto Mode',
    desc: 'Intelligently routes your request to the right agent automatically.'
  }
]

interface Props {
  onSend: (message: string) => void
}

export function WelcomeScreen({ onSend }: Props): React.ReactElement {
  const { setAgentMode } = useSettingsStore()

  const handleQuickPrompt = (prompt: { label: string; mode: typeof QUICK_PROMPTS[0]['mode'] }) => {
    setAgentMode(prompt.mode)
    onSend(prompt.label)
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-full px-6 py-10 overflow-y-auto">
      {/* Hero */}
      <div className="text-center mb-10 animate-fade">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.35)] flex items-center justify-center animate-pulse-glow">
              <Zap size={22} className="text-[#8b5cf6]" fill="currentColor" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-[#8b5cf6] opacity-20 blur-lg" />
          </div>
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-2 tracking-tight">ZETA AI</h1>
        <p className="text-sm text-[#475569] max-w-md mx-auto leading-relaxed">
          Autonomous OS intelligence. Write code, search the web, build websites,
          control your computer — all with a single prompt.
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[10px] text-[#334155] font-mono tracking-widest uppercase">All systems online</span>
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl mb-8 animate-slide-up">
        {CAPABILITIES.map((cap) => (
          <div
            key={cap.title}
            className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[rgba(139,92,246,0.1)] hover:border-[rgba(139,92,246,0.25)] transition-all group"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 border"
              style={{
                background: `${cap.color}15`,
                borderColor: `${cap.color}25`,
                color: cap.color
              }}
            >
              {cap.icon}
            </div>
            <p className="text-xs font-semibold text-[#e2e8f0] mb-1">{cap.title}</p>
            <p className="text-[11px] text-[#475569] leading-relaxed">{cap.desc}</p>
          </div>
        ))}
      </div>

      {/* Quick Prompts */}
      <div className="w-full max-w-2xl animate-slide-up">
        <p className="text-[10px] font-semibold text-[#334155] uppercase tracking-widest mb-3 text-center">
          Quick Start
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              onClick={() => handleQuickPrompt(prompt)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0f0f1a] border border-[rgba(139,92,246,0.1)] hover:border-[rgba(139,92,246,0.3)] hover:bg-[rgba(139,92,246,0.05)] text-left transition-all group"
            >
              <span className="text-[#475569] group-hover:text-[#8b5cf6] transition-colors flex-shrink-0">
                {prompt.icon}
              </span>
              <span className="text-xs text-[#64748b] group-hover:text-[#94a3b8] transition-colors flex-1">
                {prompt.label}
              </span>
              <ArrowRight
                size={11}
                className="text-[#1e293b] group-hover:text-[#8b5cf6] opacity-0 group-hover:opacity-100 transition-all"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Input at bottom */}
      <div className="w-full max-w-2xl mt-8 animate-slide-up">
        <WelcomeInput onSend={onSend} />
      </div>
    </div>
  )
}

function WelcomeInput({ onSend }: { onSend: (msg: string) => void }): React.ReactElement {
  const [value, setValue] = React.useState('')
  const { agentMode } = useSettingsStore()

  const handleSend = () => {
    if (value.trim()) {
      onSend(value.trim())
      setValue('')
    }
  }

  return (
    <div className="relative rounded-2xl border border-[rgba(139,92,246,0.25)] bg-[#0f0f1a] focus-within:border-[rgba(139,92,246,0.5)] transition-all shadow-[0_0_30px_rgba(139,92,246,0.08)]">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder={`Message ZETA AI (${agentMode} mode)...`}
        autoFocus
        className="w-full bg-transparent text-sm text-[#e2e8f0] placeholder-[#2d3748] outline-none px-4 py-4 pr-14"
      />
      <button
        onClick={handleSend}
        disabled={!value.trim()}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
          value.trim()
            ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
            : 'bg-[rgba(139,92,246,0.08)] text-[#334155] cursor-not-allowed'
        }`}
      >
        <Zap size={14} fill="currentColor" />
      </button>
    </div>
  )
}
