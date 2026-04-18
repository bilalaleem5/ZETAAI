import { IpcMain, BrowserWindow } from 'electron'
import { handleAgentChat } from './handlers/agentHandler'
import { handleOsControl } from './handlers/osControlHandler'
import { handleFileSystem } from './handlers/fileSystemHandler'
import { handleWebIntelligence } from './handlers/webIntelligenceHandler'
import { handleScreenCapture } from './handlers/screenCaptureHandler'
import { handleSecurityVault } from './handlers/securityHandler'
import { handleRagMemory } from './handlers/ragMemoryHandler'
import { handleWeather } from './handlers/weatherHandler'
import { handleNews } from './handlers/newsHandler'
import { handleCalendar, handleReminders } from './handlers/calendarHandler'
import { handleOpenApp, handleCloseApp } from './handlers/appLauncherHandler'
import { handleAudioTranscribe } from './handlers/audioHandler'
import { TaskEngine, CRMStore, DraftStore, ContactStore, getDailyBriefing } from './handlers/memoryHandler'

export function registerAllIpcHandlers(ipcMain: IpcMain, mainWindow: BrowserWindow): void {
  // Audio
  handleAudioTranscribe(ipcMain)

  // AI Chat
  ipcMain.handle('agent:chat', (_, payload) => handleAgentChat(payload, mainWindow))

  // OS
  ipcMain.handle('os:mouse-move',   (_, p) => handleOsControl('mouse-move',   p))
  ipcMain.handle('os:mouse-click',  (_, p) => handleOsControl('mouse-click',  p))
  ipcMain.handle('os:type-text',    (_, p) => handleOsControl('type-text',    p))
  ipcMain.handle('os:key-shortcut', (_, p) => handleOsControl('key-shortcut', p))
  ipcMain.handle('os:scroll',       (_, p) => handleOsControl('scroll',       p))
  ipcMain.handle('os:list-windows', ()     => handleOsControl('list-windows', {}))
  ipcMain.handle('os:focus-window', (_, p) => handleOsControl('focus-window', p))
  ipcMain.handle('app:open',  (_, p) => handleOpenApp(p.name))
  ipcMain.handle('app:close', (_, p) => handleCloseApp(p.name))

  // File System
  ipcMain.handle('fs:read-file',      (_, p) => handleFileSystem('read',        p))
  ipcMain.handle('fs:write-file',     (_, p) => handleFileSystem('write',       p))
  ipcMain.handle('fs:list-dir',       (_, p) => handleFileSystem('list',        p))
  ipcMain.handle('fs:create-dir',     (_, p) => handleFileSystem('mkdir',       p))
  ipcMain.handle('fs:delete',         (_, p) => handleFileSystem('delete',      p))
  ipcMain.handle('fs:open-in-editor', (_, p) => handleFileSystem('open-editor', p))
  ipcMain.handle('fs:open-file',      (_, p) => handleFileSystem('open-file',   p))

  // Web
  ipcMain.handle('web:search',       (_, p) => handleWebIntelligence('search',    p))
  ipcMain.handle('web:scrape',       (_, p) => handleWebIntelligence('scrape',    p))
  ipcMain.handle('web:summarize-url',(_, p) => handleWebIntelligence('summarize', p))

  // Screen
  ipcMain.handle('screen:capture', () => handleScreenCapture('screenshot'))
  ipcMain.handle('screen:ocr',     () => handleScreenCapture('ocr'))

  // Vault
  ipcMain.handle('vault:set-key',  (_, p) => handleSecurityVault('set',  p))
  ipcMain.handle('vault:get-key',  (_, p) => handleSecurityVault('get',  p))
  ipcMain.handle('vault:delete-key',(_, p) => handleSecurityVault('delete', p))
  ipcMain.handle('vault:list-keys', ()    => handleSecurityVault('list', {}))

  // RAG
  ipcMain.handle('rag:ingest', (_, p) => handleRagMemory('ingest', p))
  ipcMain.handle('rag:query',  (_, p) => handleRagMemory('query',  p))
  ipcMain.handle('rag:clear',  ()     => handleRagMemory('clear',  {}))

  // Weather & News
  ipcMain.handle('weather:current',  (_, p) => handleWeather('current',  p || {}))
  ipcMain.handle('weather:forecast', (_, p) => handleWeather('forecast', p || {}))
  ipcMain.handle('news:headlines',   (_, p) => handleNews('headlines', p || {}))
  ipcMain.handle('news:search',      (_, p) => handleNews('search',    p || {}))

  // Calendar & Reminders
  ipcMain.handle('calendar:list',     ()     => handleCalendar('list',     {}))
  ipcMain.handle('calendar:add',      (_, p) => handleCalendar('add',      p))
  ipcMain.handle('calendar:delete',   (_, p) => handleCalendar('delete',   p))
  ipcMain.handle('calendar:today',    ()     => handleCalendar('today',    {}))
  ipcMain.handle('calendar:upcoming', (_, p) => handleCalendar('upcoming', p || {}))
  ipcMain.handle('reminder:list',     ()     => handleReminders('list',     {}))
  ipcMain.handle('reminder:add',      (_, p) => handleReminders('add',      p))
  ipcMain.handle('reminder:complete', (_, p) => handleReminders('complete', p))
  ipcMain.handle('reminder:delete',   (_, p) => handleReminders('delete',   p))
  ipcMain.handle('reminder:upcoming', ()     => handleReminders('upcoming', {}))

  // ── Memory / Task / CRM / Drafts ────────────────────────────────────────
  ipcMain.handle('memory:tasks:list',     (_, p) => TaskEngine.list(p))
  ipcMain.handle('memory:tasks:add',      (_, p) => TaskEngine.add(p))
  ipcMain.handle('memory:tasks:complete', (_, p) => TaskEngine.complete(p.id))
  ipcMain.handle('memory:tasks:delete',   (_, p) => TaskEngine.delete(p.id))
  ipcMain.handle('memory:tasks:summary',  ()     => TaskEngine.summary())
  ipcMain.handle('memory:leads:list',     (_, p) => CRMStore.list(p?.status))
  ipcMain.handle('memory:leads:add',      (_, p) => CRMStore.add(p))
  ipcMain.handle('memory:leads:status',   (_, p) => CRMStore.updateStatus(p.id, p.status))
  ipcMain.handle('memory:drafts:list',    ()     => DraftStore.list())
  ipcMain.handle('memory:drafts:save',    (_, p) => DraftStore.save(p))
  ipcMain.handle('memory:drafts:sent',    (_, p) => DraftStore.markSent(p.id))
  ipcMain.handle('memory:contacts:list',  ()     => ContactStore.list())
  ipcMain.handle('memory:contacts:add',   (_, p) => ContactStore.add(p))
  ipcMain.handle('memory:contacts:find',  (_, p) => ContactStore.find(p.query))
  ipcMain.handle('memory:briefing',       ()     => getDailyBriefing())
}
