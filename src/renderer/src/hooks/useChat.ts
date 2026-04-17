/**
 * useChat — Chat pipeline hook (FIXED: single instantiation)
 * Only handles sending messages. Stream handling is via useStreamManager singleton.
 * Stream-complete is the SOLE source for finalizing messages (no race conditions).
 */
import { useCallback } from 'react'
import { useStreamManager } from './useStreamManager'
import { useChatStore, useSettingsStore } from '../store'

export function useChat() {
  const { activeConversationId, createConversation, addMessage,
          updateMessage, setIsStreaming, isStreaming, getActiveMessages } = useChatStore()
  const { agentMode } = useSettingsStore()

  useStreamManager(undefined, undefined) // join singleton, no own callbacks needed

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming || !content.trim()) return
    const cid = activeConversationId ?? createConversation()
    addMessage(cid, { role: 'user', content, agentMode })
    const aId = addMessage(cid, { role: 'assistant', content: '', agentMode, isStreaming: true })
    setIsStreaming(true)
    try {
      const hist = useChatStore.getState().getActiveMessages().slice(0, -1)
        .map(m => ({ role: m.role, content: m.content }))
      const res = await (window as any).zeta.agent.chat({
        message: content, model: 'groq', agentMode, conversationHistory: hist
      })
      // Only handle JS-level failure where IPC itself crashed (no stream-complete will fire)
      // Do NOT set isStreaming=false here — let stream-complete handle it
      if (!res?.success && res?.error) {
        // Check if stream-complete already handled it (content was populated)
        const currentMsg = useChatStore.getState().getActiveMessages().slice(-1)[0]
        if (currentMsg?.id === aId && !currentMsg.content) {
          // Stream-complete didn't fire, we need to set error ourselves
          updateMessage(cid, aId, { content: `⚠️ ${res.error}`, isStreaming: false, error: true })
          setIsStreaming(false)
        }
      }
    } catch (err) {
      // JS-level exception — stream events won't fire
      updateMessage(cid, aId, {
        content: `⚠️ ${err instanceof Error ? err.message : String(err)}`,
        isStreaming: false, error: true
      })
      setIsStreaming(false)
    }
  }, [activeConversationId, isStreaming, agentMode]) // eslint-disable-line

  return { sendMessage, isStreaming }
}
