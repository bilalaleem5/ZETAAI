import { useCallback } from 'react'
import { useStreamManager } from './useStreamManager'
import { useChatStore, useSettingsStore } from '../store'

export function useChat() {
  const { activeConversationId, createConversation, addMessage, updateMessage, setIsStreaming, isStreaming, getActiveMessages } = useChatStore()
  const { agentMode } = useSettingsStore()
  useStreamManager(undefined, undefined)

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming || !content.trim()) return
    const cid = activeConversationId ?? createConversation()
    addMessage(cid, { role: 'user', content, agentMode })
    const aId = addMessage(cid, { role: 'assistant', content: '', agentMode, isStreaming: true })
    setIsStreaming(true)
    try {
      const hist = useChatStore.getState().getActiveMessages().slice(0,-1).map(m=>({role:m.role,content:m.content}))
      const res = await (window as any).zeta.agent.chat({ message: content, model: 'groq', agentMode, conversationHistory: hist })
      if (!res?.success && res?.error) { updateMessage(cid, aId, { content: `⚠️ ${res.error}`, isStreaming: false, error: true }); setIsStreaming(false) }
    } catch (err) {
      updateMessage(cid, aId, { content: `⚠️ ${err instanceof Error ? err.message : String(err)}`, isStreaming: false, error: true })
      setIsStreaming(false)
    }
  }, [activeConversationId, isStreaming, agentMode])

  return { sendMessage, isStreaming, messages: getActiveMessages() }
}
