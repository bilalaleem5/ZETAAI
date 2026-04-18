import { useCallback } from 'react'
import { useStreamManager } from './useStreamManager'
import { useChatStore, useSettingsStore } from '../store'

export function useChat() {
  const {
    activeConversationId, createConversation, addMessage,
    updateMessage, setIsStreaming, isStreaming, getActiveMessages
  } = useChatStore()
  const { agentMode } = useSettingsStore()

  // Join singleton stream manager - store updates handled there
  useStreamManager(undefined, undefined)

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming || !content.trim()) return

    const cid = activeConversationId ?? createConversation()
    addMessage(cid, { role: 'user', content, agentMode })
    const aId = addMessage(cid, { role: 'assistant', content: '', agentMode, isStreaming: true })
    setIsStreaming(true)

    try {
      const zeta = (window as any).zeta
      if (!zeta?.agent?.chat) {
        throw new Error('ZETA bridge not available — restart the app')
      }
      const hist = useChatStore.getState().getActiveMessages()
        .slice(0, -1).map(m => ({ role: m.role, content: m.content }))
      const res = await zeta.agent.chat({
        message: content, model: 'groq', agentMode, conversationHistory: hist
      })
      // FIX: Do NOT update message here — let stream-complete handler finalize it
      // Only handle hard IPC failure (stream events will never fire in this case)
      if (res === undefined || res === null) {
        updateMessage(cid, aId, { content: '⚠️ No response received.', isStreaming: false, error: true })
        setIsStreaming(false)
      }
    } catch (err) {
      // JS exception — stream-complete will NOT fire, handle here
      updateMessage(cid, aId, {
        content: `⚠️ ${err instanceof Error ? err.message : String(err)}`,
        isStreaming: false, error: true
      })
      setIsStreaming(false)
    }
  }, [activeConversationId, isStreaming, agentMode])

  return { sendMessage, isStreaming, messages: getActiveMessages() }
}
