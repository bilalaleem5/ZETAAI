import React, { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { WelcomeScreen } from './WelcomeScreen'
import { useChatStore } from '../../store'
import { Zap } from 'lucide-react'

interface ChatViewProps {
  sendMessage: (msg: string) => void
  isStreaming: boolean
}

export function ChatView({ sendMessage, isStreaming }: ChatViewProps): React.ReactElement {
  // Read messages directly from store — NO useChat() here (prevents double instantiation)
  const messages = useChatStore((s) => {
    const conv = s.conversations.find(c => c.id === s.activeConversationId)
    return conv?.messages ?? []
  })
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <WelcomeScreen onSend={sendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} isLast={idx === messages.length - 1} />
            ))}

            {/* Typing indicator */}
            {isStreaming &&
              messages[messages.length - 1]?.isStreaming &&
              messages[messages.length - 1]?.content === '' && (
              <div className="flex items-start gap-3 py-3 animate-fade">
                <div className="w-7 h-7 rounded-lg bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.3)] flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap size={13} className="text-[#8b5cf6] animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 mt-3">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {!isEmpty && (
        <div className="flex-shrink-0 border-t border-[rgba(139,92,246,0.1)] bg-[#08080f]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
          </div>
        </div>
      )}
    </div>
  )
}
