import React from 'react'
import { Minus, Square, X, Zap, Menu } from 'lucide-react'
import { useSettingsStore } from '../../store'

export function TitleBar(): React.ReactElement {
  const { toggleSidebar, setSettingsOpen } = useSettingsStore()

  return (
    <div className="drag-region flex items-center justify-between h-10 px-4 bg-[#08080f] border-b border-[rgba(139,92,246,0.15)] flex-shrink-0">
      {/* Left: Menu + Logo */}
      <div className="flex items-center gap-3 no-drag">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-[#475569] hover:text-[#8b5cf6] hover:bg-[rgba(139,92,246,0.1)] transition-all"
        >
          <Menu size={14} />
        </button>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap size={14} className="text-[#8b5cf6]" fill="currentColor" />
            <div className="absolute inset-0 blur-sm bg-[#8b5cf6] opacity-60" />
          </div>
          <span className="text-xs font-semibold tracking-widest text-[#8b5cf6] uppercase">
            ZETA AI
          </span>
        </div>
      </div>

      {/* Center: Status */}
      <div className="flex items-center gap-1.5 drag-region">
        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
        <span className="text-[10px] text-[#475569] font-mono tracking-wider">SYSTEM ONLINE</span>
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={() => setSettingsOpen(true)}
          className="text-[10px] px-2 py-0.5 rounded text-[#475569] hover:text-[#8b5cf6] hover:bg-[rgba(139,92,246,0.1)] transition-all mr-2 font-mono"
        >
          VAULT
        </button>
        <button
          onClick={() => window.zeta.window.minimize()}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[rgba(255,255,255,0.05)] text-[#475569] hover:text-[#94a3b8] transition-all"
        >
          <Minus size={10} />
        </button>
        <button
          onClick={() => window.zeta.window.maximize()}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[rgba(255,255,255,0.05)] text-[#475569] hover:text-[#94a3b8] transition-all"
        >
          <Square size={9} />
        </button>
        <button
          onClick={() => window.zeta.window.close()}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[rgba(239,68,68,0.15)] text-[#475569] hover:text-[#ef4444] transition-all"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  )
}
