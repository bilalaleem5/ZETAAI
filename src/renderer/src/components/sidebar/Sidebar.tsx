import React from 'react'
import {
  Plus, MessageSquare, Trash2, Code2, Globe, Brain,
  Layout, Cpu, Zap, ChevronRight, MessageCircle
} from 'lucide-react'
import { useChatStore, useSettingsStore, AgentMode, AIModel } from '../../store'

const AGENTS: { mode: AgentMode; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  {
    mode: 'auto',
    label: 'Auto',
    icon: <Zap size={13} />,
    color: '#8b5cf6',
    desc: 'Smart routing'
  },
  {
    mode: 'coder',
    label: 'Coder',
    icon: <Code2 size={13} />,
    color: '#06b6d4',
    desc: 'Write & execute code'
  },
  {
    mode: 'web',
    label: 'Web',
    icon: <Globe size={13} />,
    color: '#10b981',
    desc: 'Search & scrape'
  },
  {
    mode: 'rag',
    label: 'Memory',
    icon: <Brain size={13} />,
    color: '#f59e0b',
    desc: 'Document intelligence'
  },
  {
    mode: 'builder',
    label: 'Builder',
    icon: <Layout size={13} />,
    color: '#ec4899',
    desc: 'Generate websites'
  },
  {
    mode: 'os',
    label: 'OS Control',
    icon: <Cpu size={13} />,
    color: '#ef4444',
    desc: 'System automation'
  },
  {
    mode: 'chat',
    label: 'Chat Mode',
    icon: <MessageCircle size={13} />,
    color: '#00e5cc',
    desc: 'Human-like conversation'
  }
]

const MODELS: { id: AIModel; label: string; badge: string }[] = [
  { id: 'groq', label: 'Llama 3.3 70B', badge: 'Groq' }
]

export function Sidebar(): React.ReactElement {
  const { conversations, activeConversationId, createConversation, setActiveConversation, deleteConversation } =
    useChatStore()
  const { agentMode, setAgentMode, model, setModel } = useSettingsStore()

  const handleNewChat = () => {
    createConversation()
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="h-full w-72 bg-[#08080f] border-r border-[rgba(139,92,246,0.12)] flex flex-col overflow-hidden">
      {/* New Chat Button */}
      <div className="p-3 border-b border-[rgba(139,92,246,0.1)]">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[rgba(139,92,246,0.1)] hover:bg-[rgba(139,92,246,0.18)] border border-[rgba(139,92,246,0.2)] hover:border-[rgba(139,92,246,0.4)] text-[#8b5cf6] transition-all group"
        >
          <Plus size={14} />
          <span className="text-sm font-medium flex-1 text-left">New Chat</span>
          <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* Agent Mode Selector */}
      <div className="p-3 border-b border-[rgba(139,92,246,0.1)]">
        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest mb-2">Agent Mode</p>
        <div className="grid grid-cols-3 gap-1.5">
          {AGENTS.map((agent) => (
            <button
              key={agent.mode}
              onClick={() => setAgentMode(agent.mode)}
              title={agent.desc}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-all border ${
                agentMode === agent.mode
                  ? 'border-[rgba(139,92,246,0.5)] text-white'
                  : 'border-transparent text-[#475569] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.03)]'
              }`}
              style={
                agentMode === agent.mode
                  ? { background: `${agent.color}18`, color: agent.color, borderColor: `${agent.color}40` }
                  : {}
              }
            >
              <span style={agentMode === agent.mode ? { color: agent.color } : {}}>{agent.icon}</span>
              {agent.label}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selector */}
      <div className="p-3 border-b border-[rgba(139,92,246,0.1)]">
        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest mb-2">Model</p>
        <div className="flex flex-col gap-1">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all border ${
                model === m.id
                  ? 'bg-[rgba(139,92,246,0.12)] border-[rgba(139,92,246,0.35)] text-[#c4b5fd]'
                  : 'border-transparent text-[#475569] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <span className="font-medium">{m.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  model === m.id
                    ? 'bg-[rgba(139,92,246,0.2)] text-[#8b5cf6]'
                    : 'bg-[rgba(255,255,255,0.05)] text-[#475569]'
                }`}
              >
                {m.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest mb-2 px-1">History</p>
        {conversations.length === 0 ? (
          <p className="text-xs text-[#334155] text-center mt-4 px-2">No conversations yet</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all ${
                  conv.id === activeConversationId
                    ? 'bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.2)]'
                    : 'hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <MessageSquare
                  size={12}
                  className={conv.id === activeConversationId ? 'text-[#8b5cf6]' : 'text-[#334155]'}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${conv.id === activeConversationId ? 'text-[#e2e8f0]' : 'text-[#64748b]'}`}>
                    {conv.title}
                  </p>
                  <p className="text-[9px] text-[#334155] font-mono">{formatTime(conv.updatedAt)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conv.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#334155] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-all"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[rgba(139,92,246,0.1)]">
        <p className="text-[9px] text-[#1e293b] text-center font-mono tracking-widest">
          ZETA AI v1.0 · LOCAL FIRST · ZERO TRUST
        </p>
      </div>
    </div>
  )
}
