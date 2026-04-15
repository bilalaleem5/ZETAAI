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

export function registerAllIpcHandlers(ipcMain: IpcMain, mainWindow: BrowserWindow): void {
  // ─── Audio & Voice ────────────────────────────────────────────────────────
  handleAudioTranscribe(ipcMain)

  // ─── Core AI Chat ─────────────────────────────────────────────────────────
  ipcMain.handle('agent:chat', (_, payload) => handleAgentChat(payload, mainWindow))

  // ─── OS Control ──────────────────────────────────────────────────────────
  ipcMain.handle('os:mouse-move', (_, payload) => handleOsControl('mouse-move', payload))
  ipcMain.handle('os:mouse-click', (_, payload) => handleOsControl('mouse-click', payload))
  ipcMain.handle('os:type-text', (_, payload) => handleOsControl('type-text', payload))
  ipcMain.handle('os:key-shortcut', (_, payload) => handleOsControl('key-shortcut', payload))
  ipcMain.handle('os:scroll', (_, payload) => handleOsControl('scroll', payload))
  ipcMain.handle('os:list-windows', () => handleOsControl('list-windows', {}))
  ipcMain.handle('os:focus-window', (_, payload) => handleOsControl('focus-window', payload))

  // ─── App Launcher ─────────────────────────────────────────────────────────
  ipcMain.handle('app:open', (_, payload) => handleOpenApp(payload.name))
  ipcMain.handle('app:close', (_, payload) => handleCloseApp(payload.name))

  // ─── File System ──────────────────────────────────────────────────────────
  ipcMain.handle('fs:read-file', (_, payload) => handleFileSystem('read', payload))
  ipcMain.handle('fs:write-file', (_, payload) => handleFileSystem('write', payload))
  ipcMain.handle('fs:list-dir', (_, payload) => handleFileSystem('list', payload))
  ipcMain.handle('fs:create-dir', (_, payload) => handleFileSystem('mkdir', payload))
  ipcMain.handle('fs:delete', (_, payload) => handleFileSystem('delete', payload))
  ipcMain.handle('fs:open-in-editor', (_, payload) => handleFileSystem('open-editor', payload))
  ipcMain.handle('fs:open-file', (_, payload) => handleFileSystem('open-file', payload))

  // ─── Web Intelligence ─────────────────────────────────────────────────────
  ipcMain.handle('web:search', (_, payload) => handleWebIntelligence('search', payload))
  ipcMain.handle('web:scrape', (_, payload) => handleWebIntelligence('scrape', payload))
  ipcMain.handle('web:summarize-url', (_, payload) => handleWebIntelligence('summarize', payload))

  // ─── Screen & Vision ──────────────────────────────────────────────────────
  ipcMain.handle('screen:capture', () => handleScreenCapture('screenshot'))
  ipcMain.handle('screen:ocr', () => handleScreenCapture('ocr'))

  // ─── Security Vault ───────────────────────────────────────────────────────
  ipcMain.handle('vault:set-key', (_, payload) => handleSecurityVault('set', payload))
  ipcMain.handle('vault:get-key', (_, payload) => handleSecurityVault('get', payload))
  ipcMain.handle('vault:delete-key', (_, payload) => handleSecurityVault('delete', payload))
  ipcMain.handle('vault:list-keys', () => handleSecurityVault('list', {}))

  // ─── RAG Memory ───────────────────────────────────────────────────────────
  ipcMain.handle('rag:ingest', (_, payload) => handleRagMemory('ingest', payload))
  ipcMain.handle('rag:query', (_, payload) => handleRagMemory('query', payload))
  ipcMain.handle('rag:clear', () => handleRagMemory('clear', {}))

  // ─── Weather ──────────────────────────────────────────────────────────────
  ipcMain.handle('weather:current', (_, payload) => handleWeather('current', payload || {}))
  ipcMain.handle('weather:forecast', (_, payload) => handleWeather('forecast', payload || {}))

  // ─── News ─────────────────────────────────────────────────────────────────
  ipcMain.handle('news:headlines', (_, payload) => handleNews('headlines', payload || {}))
  ipcMain.handle('news:search', (_, payload) => handleNews('search', payload || {}))

  // ─── Calendar & Reminders ─────────────────────────────────────────────────
  ipcMain.handle('calendar:list', () => handleCalendar('list', {}))
  ipcMain.handle('calendar:add', (_, payload) => handleCalendar('add', payload))
  ipcMain.handle('calendar:delete', (_, payload) => handleCalendar('delete', payload))
  ipcMain.handle('calendar:today', () => handleCalendar('today', {}))
  ipcMain.handle('calendar:upcoming', (_, payload) => handleCalendar('upcoming', payload || {}))
  ipcMain.handle('reminder:list', () => handleReminders('list', {}))
  ipcMain.handle('reminder:add', (_, payload) => handleReminders('add', payload))
  ipcMain.handle('reminder:complete', (_, payload) => handleReminders('complete', payload))
  ipcMain.handle('reminder:delete', (_, payload) => handleReminders('delete', payload))
  ipcMain.handle('reminder:upcoming', () => handleReminders('upcoming', {}))
}
