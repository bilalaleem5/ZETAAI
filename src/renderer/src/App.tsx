import React, { useEffect, useState } from 'react'
import { ZetaAssistant } from './components/voice/ZetaAssistant'
import { ChatView } from './components/chat/ChatView'
import { Sidebar } from './components/sidebar/Sidebar'
import { SettingsModal } from './components/ui/SettingsModal'
import { useSettingsStore, useChatStore } from './store'
import { useChat } from './hooks/useChat'

type Tab = 'voice' | 'chat'

export default function App(): React.ReactElement {
  const [tab, setTab] = useState<Tab>('voice')
  const { sidebarOpen, settingsOpen, setSettingsOpen } = useSettingsStore()
  const { conversations, createConversation } = useChatStore()
  // useChat ONCE here — passes down to ChatView
  const { sendMessage, isStreaming } = useChat()

  useEffect(() => { if (conversations.length === 0) createConversation() }, [])
  useEffect(() => {
    const h = () => setSettingsOpen(true)
    window.addEventListener('zeta:open-settings', h)
    return () => window.removeEventListener('zeta:open-settings', h)
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: '#000d0d' }}>
      <div className="drag-region flex items-center h-8 px-3 flex-shrink-0 border-b"
        style={{ background: '#000d0d', borderColor: 'rgba(0,229,204,0.15)' }}>
        <div className="no-drag flex items-center gap-3">
          <button onClick={() => (window as any).zeta?.window?.close()} className="no-drag w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-125 transition-all" />
          <button onClick={() => (window as any).zeta?.window?.minimize()} className="no-drag w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-125 transition-all" />
          <button onClick={() => (window as any).zeta?.window?.maximize()} className="no-drag w-3 h-3 rounded-full bg-[#28c940] hover:brightness-125 transition-all" />
        </div>
        <div className="no-drag flex items-center gap-1 ml-4">
          {([{ id: 'voice' as Tab, label: '⚡ ZETA AI' }, { id: 'chat' as Tab, label: '◎ CHAT' }]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.2em', padding: '2px 10px',
              border: `1px solid ${tab === t.id ? 'rgba(0,229,204,0.5)' : 'rgba(0,229,204,0.1)'}`,
              background: tab === t.id ? 'rgba(0,229,204,0.1)' : 'transparent',
              color: tab === t.id ? '#00e5cc' : 'rgba(0,229,204,0.35)', cursor: 'pointer',
              textShadow: tab === t.id ? '0 0 8px #00e5cc' : 'none', transition: 'all 0.2s'
            }}>{t.label}</button>
          ))}
        </div>
        <div className="drag-region flex-1" />
        <div className="no-drag">
          <button onClick={() => setSettingsOpen(true)} style={{
            fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.2em',
            padding: '2px 10px', border: '1px solid rgba(0,229,204,0.15)',
            background: 'transparent', color: 'rgba(0,229,204,0.4)', cursor: 'pointer'
          }}>VAULT</button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {tab === 'chat' && (
          <div style={{ width: sidebarOpen ? 272 : 0, flexShrink: 0, transition: 'width 0.3s', overflow: 'hidden' }}>
            <Sidebar />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {tab === 'voice' ? <ZetaAssistant /> : <ChatView sendMessage={sendMessage} isStreaming={isStreaming} />}
        </div>
      </div>
      {settingsOpen && <SettingsModal />}
    </div>
  )
}
