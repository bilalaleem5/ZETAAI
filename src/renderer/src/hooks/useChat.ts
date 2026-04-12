import { useEffect, useRef, useCallback } from 'react'
import { useChatStore, useSettingsStore } from '../store'

export function useChat() {
  const {
    activeConversationId,
    createConversation,
    addMessage,
    appendStreamToken,
    updateMessage,
    setIsStreaming,
    clearStreamingContent,
    isStreaming,
    getActiveMessages
  } = useChatStore()

  const { model, agentMode } = useSettingsStore()
  const streamCleanupRef = useRef<(() => void)[]>([])

  // Register stream listeners
  useEffect(() => {
    const cleanupToken = window.zeta.agent.onStreamToken((token) => {
      const msgs = useChatStore.getState().getActiveMessages()
      const lastMsg = msgs[msgs.length - 1]
      const convId = useChatStore.getState().activeConversationId
      if (lastMsg?.role === 'assistant' && convId) {
        appendStreamToken(convId, lastMsg.id, token)
      }
    })

    const cleanupComplete = window.zeta.agent.onStreamComplete(() => {
      setIsStreaming(false)
      clearStreamingContent()
      // Mark the last assistant message as not streaming
      const msgs = useChatStore.getState().getActiveMessages()
      const lastMsg = msgs[msgs.length - 1]
      const convId = useChatStore.getState().activeConversationId
      if (lastMsg?.role === 'assistant' && convId) {
        updateMessage(convId, lastMsg.id, { isStreaming: false })
      }
    })

    streamCleanupRef.current = [cleanupToken, cleanupComplete]
    return () => streamCleanupRef.current.forEach((fn) => fn())
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || !content.trim()) return

      // Create conversation if none exists
      let convId = activeConversationId
      if (!convId) {
        convId = createConversation()
      }

      // Add user message
      addMessage(convId, { role: 'user', content, agentMode })

      // Add placeholder assistant message
      const assistantMsgId = addMessage(convId, {
        role: 'assistant',
        content: '',
        agentMode,
        isStreaming: true
      })

      setIsStreaming(true)

      try {
        const history = useChatStore
          .getState()
          .getActiveMessages()
          .slice(0, -1) // exclude the empty assistant placeholder
          .map((m) => ({ role: m.role, content: m.content }))

        const result = await window.zeta.agent.chat({
          message: content,
          model,
          agentMode,
          conversationHistory: history
        })

        if (!result.success && result.error) {
          updateMessage(convId, assistantMsgId, {
            content: `⚠️ Error: ${result.error}`,
            isStreaming: false,
            error: true
          })
          setIsStreaming(false)
        }

        if (result.artifacts?.length) {
          updateMessage(convId, assistantMsgId, { artifacts: result.artifacts })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        updateMessage(convId, assistantMsgId, {
          content: `⚠️ Unexpected error: ${msg}`,
          isStreaming: false,
          error: true
        })
        setIsStreaming(false)
      }
    },
    [activeConversationId, isStreaming, model, agentMode]
  )

  return { sendMessage, isStreaming, messages: getActiveMessages() }
}
