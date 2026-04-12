import React, { useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatView } from './components/chat/ChatView'
import { TitleBar } from './components/ui/TitleBar'
import { SettingsModal } from './components/ui/SettingsModal'
import { useSettingsStore } from './store'

export default function App(): React.ReactElement {
  const { sidebarOpen, settingsOpen } = useSettingsStore()

  // Init: create default conversation on first load
  useEffect(() => {
    const { conversations, createConversation } = require('./store').useChatStore.getState()
    if (conversations.length === 0) {
      createConversation()
    }
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      {/* Custom Title Bar */}
      <TitleBar />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
            sidebarOpen ? 'w-72' : 'w-0'
          }`}
        >
          <Sidebar />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 overflow-hidden">
          <ChatView />
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal />}
    </div>
  )
}
