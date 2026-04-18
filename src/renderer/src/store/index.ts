import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────
export type AgentMode = 'auto' | 'coder' | 'web' | 'rag' | 'builder' | 'os' | 'chat'
export type AIModel = 'groq'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  agentMode?: AgentMode
  artifacts?: unknown[]
  isStreaming?: boolean
  error?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

// ─── Chat Store ───────────────────────────────────────────────────────────────
interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  isStreaming: boolean
  streamingContent: string

  // Actions
  createConversation: () => string
  setActiveConversation: (id: string) => void
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  appendStreamToken: (conversationId: string, messageId: string, token: string) => void
  setIsStreaming: (val: boolean) => void
  clearStreamingContent: () => void
  deleteConversation: (id: string) => void
  getActiveConversation: () => Conversation | null
  getActiveMessages: () => Message[]
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isStreaming: false,
      streamingContent: '',

      createConversation: () => {
        const id = `conv_${Date.now()}`
        const conv: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        set((s) => ({ conversations: [conv, ...s.conversations], activeConversationId: id }))
        return id
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addMessage: (conversationId, message) => {
        const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`
        const newMsg: Message = { id, timestamp: Date.now(), ...message }
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c
            // Auto-title from first user message
            const title = c.messages.length === 0 && message.role === 'user'
              ? message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '')
              : c.title
            return { ...c, title, messages: [...c.messages, newMsg], updatedAt: Date.now() }
          })
        }))
        return id
      },

      updateMessage: (conversationId, messageId, updates) => {
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
            }
          })
        }))
      },

      appendStreamToken: (conversationId, messageId, token) => {
        set((s) => ({
          streamingContent: s.streamingContent + token,
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, content: m.content + token } : m
              )
            }
          })
        }))
      },

      setIsStreaming: (val) => set({ isStreaming: val }),
      clearStreamingContent: () => set({ streamingContent: '' }),

      deleteConversation: (id) => {
        set((s) => {
          const filtered = s.conversations.filter((c) => c.id !== id)
          const newActive = s.activeConversationId === id
            ? filtered[0]?.id ?? null
            : s.activeConversationId
          return { conversations: filtered, activeConversationId: newActive }
        })
      },

      getActiveConversation: () => {
        const s = get()
        return s.conversations.find((c) => c.id === s.activeConversationId) ?? null
      },

      getActiveMessages: () => {
        const conv = get().getActiveConversation()
        return conv?.messages ?? []
      }
    }),
    {
      name: 'zeta-chat-store',
      partialize: (s) => ({ conversations: s.conversations, activeConversationId: s.activeConversationId })
    }
  )
)

// ─── Settings Store ───────────────────────────────────────────────────────────
interface SettingsState {
  model: AIModel
  agentMode: AgentMode
  sidebarOpen: boolean
  settingsOpen: boolean
  theme: 'dark' | 'darker'
  ragIndexed: boolean
  ragFileCount: number

  setModel: (model: AIModel) => void
  setAgentMode: (mode: AgentMode) => void
  toggleSidebar: () => void
  setSidebarOpen: (val: boolean) => void
  setSettingsOpen: (val: boolean) => void
  setRagIndexed: (val: boolean, count?: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      model: 'groq',
      agentMode: 'auto',
      sidebarOpen: true,
      settingsOpen: false,
      theme: 'dark',
      ragIndexed: false,
      ragFileCount: 0,

      setModel: (model) => set({ model }),
      setAgentMode: (agentMode) => set({ agentMode }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (val) => set({ sidebarOpen: val }),
      setSettingsOpen: (val) => set({ settingsOpen: val }),
      setRagIndexed: (val, count) =>
        set({ ragIndexed: val, ragFileCount: count ?? 0 })
    }),
    { name: 'zeta-settings-store' }
  )
)
