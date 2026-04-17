import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

contextBridge.exposeInMainWorld('electron', electronAPI)

const zetaAPI = {
  // ── Window Controls ──────────────────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },

  // ── Agent Chat (streaming) ────────────────────────────────────────────────
  agent: {
    chat: (payload: {
      message: string
      model: 'gemini' | 'groq'
      agentMode: 'auto' | 'coder' | 'web' | 'rag' | 'builder' | 'os' | 'chat'
      conversationHistory: Array<{ role: string; content: string }>
      context?: Record<string, unknown>
    }) => ipcRenderer.invoke('agent:chat', payload),

    onStreamToken: (callback: (token: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { token: string }) =>
        callback(data.token)
      ipcRenderer.on('agent:stream-token', handler)
      return () => ipcRenderer.removeListener('agent:stream-token', handler)
    },

    onStreamComplete: (callback: (metadata?: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { metadata?: unknown }) =>
        callback(data.metadata)
      ipcRenderer.on('agent:stream-complete', handler)
      return () => ipcRenderer.removeListener('agent:stream-complete', handler)
    }
  },

  // ── Audio STT ────────────────────────────────────────────────────────────
  audio: {
    transcribe: (base64Audio: string) => ipcRenderer.invoke('audio:transcribe', { base64Audio })
  },

  // ── OS Control ───────────────────────────────────────────────────────────
  os: {
    mouseMove: (x: number, y: number) => ipcRenderer.invoke('os:mouse-move', { x, y }),
    mouseClick: (x: number, y: number) => ipcRenderer.invoke('os:mouse-click', { x, y }),
    typeText: (text: string) => ipcRenderer.invoke('os:type-text', { text }),
    keyShortcut: (keys: string[]) => ipcRenderer.invoke('os:key-shortcut', { keys }),
    scroll: (direction: 'up' | 'down', amount?: number) =>
      ipcRenderer.invoke('os:scroll', { direction, amount }),
    listWindows: () => ipcRenderer.invoke('os:list-windows'),
    focusWindow: (windowTitle: string) => ipcRenderer.invoke('os:focus-window', { windowTitle })
  },

  // ── App Launcher ─────────────────────────────────────────────────────────
  app: {
    open: (name: string) => ipcRenderer.invoke('app:open', { name }),
    close: (name: string) => ipcRenderer.invoke('app:close', { name })
  },

  // ── File System ──────────────────────────────────────────────────────────
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', { filePath }),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:write-file', { filePath, content }),
    listDir: (dirPath: string) => ipcRenderer.invoke('fs:list-dir', { dirPath }),
    createDir: (dirPath: string) => ipcRenderer.invoke('fs:create-dir', { dirPath }),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs:delete', { filePath }),
    openInEditor: (filePath: string) => ipcRenderer.invoke('fs:open-in-editor', { filePath }),
    openFile: (filePath: string) => ipcRenderer.invoke('fs:open-file', { filePath })
  },

  // ── Web Intelligence ─────────────────────────────────────────────────────
  web: {
    search: (query: string) => ipcRenderer.invoke('web:search', { query }),
    scrape: (url: string) => ipcRenderer.invoke('web:scrape', { url }),
    summarizeUrl: (url: string) => ipcRenderer.invoke('web:summarize-url', { url })
  },

  // ── Screen & Vision ──────────────────────────────────────────────────────
  screen: {
    capture: () => ipcRenderer.invoke('screen:capture'),
    ocr: () => ipcRenderer.invoke('screen:ocr')
  },

  // ── Security Vault ───────────────────────────────────────────────────────
  vault: {
    setKey: (key: string, value: string) => ipcRenderer.invoke('vault:set-key', { key, value }),
    getKey: (key: string) => ipcRenderer.invoke('vault:get-key', { key }),
    deleteKey: (key: string) => ipcRenderer.invoke('vault:delete-key', { key }),
    listKeys: () => ipcRenderer.invoke('vault:list-keys')
  },

  // ── RAG Memory ───────────────────────────────────────────────────────────
  rag: {
    ingest: (payload: { filePath?: string; dirPath?: string }) =>
      ipcRenderer.invoke('rag:ingest', payload),
    query: (query: string, topK?: number) => ipcRenderer.invoke('rag:query', { query, topK }),
    clear: () => ipcRenderer.invoke('rag:clear')
  },

  // ── Weather ──────────────────────────────────────────────────────────────
  weather: {
    current: (city?: string) => ipcRenderer.invoke('weather:current', { city }),
    forecast: (city?: string) => ipcRenderer.invoke('weather:forecast', { city })
  },

  // ── News ─────────────────────────────────────────────────────────────────
  news: {
    headlines: (category?: string) => ipcRenderer.invoke('news:headlines', { category }),
    search: (query: string) => ipcRenderer.invoke('news:search', { query })
  },

  // ── Calendar ─────────────────────────────────────────────────────────────
  calendar: {
    list: () => ipcRenderer.invoke('calendar:list'),
    add: (event: { title: string; date: string; time?: string; description?: string }) =>
      ipcRenderer.invoke('calendar:add', { event }),
    delete: (id: string) => ipcRenderer.invoke('calendar:delete', { id }),
    today: () => ipcRenderer.invoke('calendar:today'),
    upcoming: (days?: number) => ipcRenderer.invoke('calendar:upcoming', { days })
  },

  // ── Reminders ────────────────────────────────────────────────────────────
  reminder: {
    list: () => ipcRenderer.invoke('reminder:list'),
    add: (text: string, datetime: string) => ipcRenderer.invoke('reminder:add', { text, datetime }),
    complete: (id: string) => ipcRenderer.invoke('reminder:complete', { id }),
    delete: (id: string) => ipcRenderer.invoke('reminder:delete', { id }),
    upcoming: () => ipcRenderer.invoke('reminder:upcoming')
  },

  // ── Memory System (Tasks, CRM, Contacts, Drafts) ─────────────────────────
  memory: {
    // Tasks
    addTask: (title: string, opts?: { description?: string; deadline?: string; priority?: string; tags?: string[] }) =>
      ipcRenderer.invoke('memory:add-task', { title, ...opts }),
    completeTask: (taskId: string) => ipcRenderer.invoke('memory:complete-task', { taskId }),
    listTasks: (filter?: { status?: string; priority?: string }) =>
      ipcRenderer.invoke('memory:list-tasks', filter || {}),
    rescheduleTask: (taskId: string, newDeadline: string) =>
      ipcRenderer.invoke('memory:reschedule-task', { taskId, newDeadline }),
    deleteTask: (taskId: string) => ipcRenderer.invoke('memory:delete-task', { taskId }),
    taskSummary: () => ipcRenderer.invoke('memory:task-summary'),

    // Contacts
    addContact: (name: string, opts?: { email?: string; phone?: string; company?: string; whatsapp?: string }) =>
      ipcRenderer.invoke('memory:add-contact', { name, ...opts }),
    listContacts: (query?: string) => ipcRenderer.invoke('memory:list-contacts', { query }),
    updateContact: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke('memory:update-contact', { id, updates }),
    deleteContact: (id: string) => ipcRenderer.invoke('memory:delete-contact', { id }),

    // Leads / CRM
    addLead: (data: { name: string; company?: string; role?: string; email?: string; source: string; status?: string }) =>
      ipcRenderer.invoke('memory:add-lead', data),
    listLeads: (filter?: { status?: string; query?: string }) =>
      ipcRenderer.invoke('memory:list-leads', filter || {}),
    updateLead: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke('memory:update-lead', { id, updates }),
    deleteLead: (id: string) => ipcRenderer.invoke('memory:delete-lead', { id }),
    leadSummary: () => ipcRenderer.invoke('memory:lead-summary'),

    // Drafts
    addDraft: (data: { type: 'email' | 'whatsapp'; to: string; subject?: string; body: string }) =>
      ipcRenderer.invoke('memory:add-draft', data),
    listDrafts: (filter?: { type?: string; status?: string }) =>
      ipcRenderer.invoke('memory:list-drafts', filter || {}),
    approveDraft: (id: string) => ipcRenderer.invoke('memory:approve-draft', { id }),
    deleteDraft: (id: string) => ipcRenderer.invoke('memory:delete-draft', { id }),

    // Context & Briefing
    fullContext: () => ipcRenderer.invoke('memory:full-context'),
    dailyBriefing: () => ipcRenderer.invoke('memory:daily-briefing'),
    history: (count?: number, category?: string) =>
      ipcRenderer.invoke('memory:history', { count, category }),

    // Preferences
    setPreference: (key: string, value: unknown) =>
      ipcRenderer.invoke('memory:set-preference', { key, value }),
    getPreference: (key: string) => ipcRenderer.invoke('memory:get-preference', { key })
  }
}

contextBridge.exposeInMainWorld('zeta', zetaAPI)

declare global {
  interface Window {
    zeta: typeof zetaAPI
    electron: typeof electronAPI
  }
}
