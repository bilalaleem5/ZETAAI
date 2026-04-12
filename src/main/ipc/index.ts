import { IpcMain, BrowserWindow } from 'electron'
import { handleAgentChat } from './handlers/agentHandler'
import { handleOsControl } from './handlers/osControlHandler'
import { handleFileSystem } from './handlers/fileSystemHandler'
import { handleWebIntelligence } from './handlers/webIntelligenceHandler'
import { handleScreenCapture } from './handlers/screenCaptureHandler'
import { handleSecurityVault } from './handlers/securityHandler'
import { handleRagMemory } from './handlers/ragMemoryHandler'

export function registerAllIpcHandlers(ipcMain: IpcMain, mainWindow: BrowserWindow): void {
  // ─── Core AI Chat ────────────────────────────────────────────────────────────
  ipcMain.handle('agent:chat', (_, payload) => handleAgentChat(payload, mainWindow))

  // ─── OS Control ─────────────────────────────────────────────────────────────
  ipcMain.handle('os:mouse-move', (_, payload) => handleOsControl('mouse-move', payload))
  ipcMain.handle('os:mouse-click', (_, payload) => handleOsControl('mouse-click', payload))
  ipcMain.handle('os:type-text', (_, payload) => handleOsControl('type-text', payload))
  ipcMain.handle('os:key-shortcut', (_, payload) => handleOsControl('key-shortcut', payload))
  ipcMain.handle('os:scroll', (_, payload) => handleOsControl('scroll', payload))
  ipcMain.handle('os:list-windows', () => handleOsControl('list-windows', {}))
  ipcMain.handle('os:focus-window', (_, payload) => handleOsControl('focus-window', payload))

  // ─── File System ─────────────────────────────────────────────────────────────
  ipcMain.handle('fs:read-file', (_, payload) => handleFileSystem('read', payload))
  ipcMain.handle('fs:write-file', (_, payload) => handleFileSystem('write', payload))
  ipcMain.handle('fs:list-dir', (_, payload) => handleFileSystem('list', payload))
  ipcMain.handle('fs:create-dir', (_, payload) => handleFileSystem('mkdir', payload))
  ipcMain.handle('fs:delete', (_, payload) => handleFileSystem('delete', payload))
  ipcMain.handle('fs:open-in-editor', (_, payload) => handleFileSystem('open-editor', payload))
  ipcMain.handle('fs:open-file', (_, payload) => handleFileSystem('open-file', payload))

  // ─── Web Intelligence ────────────────────────────────────────────────────────
  ipcMain.handle('web:search', (_, payload) => handleWebIntelligence('search', payload))
  ipcMain.handle('web:scrape', (_, payload) => handleWebIntelligence('scrape', payload))
  ipcMain.handle('web:summarize-url', (_, payload) => handleWebIntelligence('summarize', payload))

  // ─── Screen & Vision ─────────────────────────────────────────────────────────
  ipcMain.handle('screen:capture', () => handleScreenCapture('screenshot'))
  ipcMain.handle('screen:ocr', (_, payload) => handleScreenCapture('ocr', payload))

  // ─── Security Vault ──────────────────────────────────────────────────────────
  ipcMain.handle('vault:set-key', (_, payload) => handleSecurityVault('set', payload))
  ipcMain.handle('vault:get-key', (_, payload) => handleSecurityVault('get', payload))
  ipcMain.handle('vault:delete-key', (_, payload) => handleSecurityVault('delete', payload))
  ipcMain.handle('vault:list-keys', () => handleSecurityVault('list', {}))

  // ─── RAG Memory ──────────────────────────────────────────────────────────────
  ipcMain.handle('rag:ingest', (_, payload) => handleRagMemory('ingest', payload))
  ipcMain.handle('rag:query', (_, payload) => handleRagMemory('query', payload))
  ipcMain.handle('rag:clear', () => handleRagMemory('clear', {}))
}
