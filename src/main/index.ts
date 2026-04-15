import { app, shell, BrowserWindow, ipcMain, nativeTheme, safeStorage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { config } from 'dotenv'
import { registerAllIpcHandlers } from './ipc/index'

// ─── CRITICAL FIX: SSL certificate errors block SpeechRecognition ──────────
// Chrome uses Google servers for SpeechRecognition - SSL must be allowed
app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch('ignore-ssl-errors')
app.commandLine.appendSwitch('disable-web-security', 'false')
// ────────────────────────────────────────────────────────────────────────────


// Load environment variables
config()

// Pre-load vault keys into process.env at startup
function preloadVaultKeys(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Store = require('electron-store')
    const store = new Store({ name: 'zeta-vault', encryptionKey: 'zeta-secure-key-v1' })
    const VAULT_PREFIX = 'vault:'
    const allKeys = Object.keys(store.store as Record<string, unknown>).filter(
      (k: string) => k.startsWith(VAULT_PREFIX) && !k.endsWith(':encrypted')
    )
    for (const storeKey of allKeys) {
      const keyName = storeKey.replace(VAULT_PREFIX, '')
      const raw = store.get(storeKey) as string | undefined
      if (!raw) continue
      const isEncrypted = store.get(`${storeKey}:encrypted`) as boolean
      if (isEncrypted && safeStorage.isEncryptionAvailable()) {
        try {
          const decrypted = safeStorage.decryptString(Buffer.from(raw, 'base64'))
          process.env[keyName.toUpperCase()] = decrypted
        } catch { /* skip */ }
      } else {
        process.env[keyName.toUpperCase()] = raw
      }
    }
    console.log('[Vault] Preloaded keys:', allKeys.map(k => k.replace(VAULT_PREFIX, '')).join(', ') || 'none')
  } catch (e) {
    console.error('[Vault] Preload error:', e)
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
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../resources/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Register all IPC handlers
  registerAllIpcHandlers(ipcMain, mainWindow)

  // ─── CRITICAL FIX: Auto-grant media and mic permissions ──────────
  mainWindow.webContents.session.setPermissionCheckHandler(() => true)
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Grant text-to-speech, camera, mic, and media
    if (permission === 'media' || permission === 'mediaKeySystem') {
      return callback(true)
    }
    callback(true)
  })
  // ─────────────────────────────────────────────────────────────────

  // Window control IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.zetaai')

  // Pre-load all saved API keys from vault into process.env
  preloadVaultKeys()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { mainWindow }
