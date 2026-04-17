import { app, shell, BrowserWindow, ipcMain, nativeTheme, safeStorage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { config } from 'dotenv'
import { registerAllIpcHandlers } from './ipc/index'

// ─── MUST be before app.whenReady() ──────────────────────────────────────────
// SSL errors block Chrome SpeechRecognition (connects to Google's servers)
app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch('ignore-ssl-errors')
app.commandLine.appendSwitch('allow-running-insecure-content')
// ─────────────────────────────────────────────────────────────────────────────

config()

function preloadVaultKeys(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Store = require('electron-store')
    const store = new Store({ name: 'zeta-vault', encryptionKey: 'zeta-secure-key-v1' })
    const PREFIX = 'vault:'
    const keys = Object.keys(store.store as Record<string, unknown>)
      .filter((k: string) => k.startsWith(PREFIX) && !k.endsWith(':encrypted'))
    for (const storeKey of keys) {
      const keyName = storeKey.replace(PREFIX, '')
      const raw = store.get(storeKey) as string | undefined
      if (!raw) continue
      const encrypted = store.get(`${storeKey}:encrypted`) as boolean
      if (encrypted && safeStorage.isEncryptionAvailable()) {
        try {
          process.env[keyName.toUpperCase()] = safeStorage.decryptString(Buffer.from(raw, 'base64'))
        } catch { process.env[keyName.toUpperCase()] = raw }
      } else {
        process.env[keyName.toUpperCase()] = raw
      }
    }
    console.log('[Vault] Keys loaded:', keys.map(k => k.replace(PREFIX, '')).join(', ') || 'none')
  } catch (e) {
    console.error('[Vault] Error:', e)
  }
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  nativeTheme.themeSource = 'dark'

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#000d0d',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,          // allows SpeechRecognition in Electron
      allowRunningInsecureContent: true,
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.zetaai')
  preloadVaultKeys()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  createWindow()
  if (mainWindow) registerAllIpcHandlers(ipcMain, mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
