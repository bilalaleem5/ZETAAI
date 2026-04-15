import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Common app name → executable mapping
const APP_MAP_WIN: Record<string, string> = {
  chrome: 'start chrome',
  'google chrome': 'start chrome',
  firefox: 'start firefox',
  edge: 'start msedge',
  notepad: 'start notepad',
  'notepad++': 'start notepad++',
  vscode: 'start code',
  'visual studio code': 'start code',
  code: 'start code',
  calculator: 'start calc',
  terminal: 'start cmd',
  cmd: 'start cmd',
  powershell: 'start powershell',
  explorer: 'start explorer',
  'file explorer': 'start explorer',
  spotify: 'start spotify',
  discord: 'start discord',
  slack: 'start slack',
  zoom: 'start zoom',
  teams: 'start teams',
  word: 'start winword',
  excel: 'start excel',
  powerpoint: 'start powerpnt',
  paint: 'start mspaint',
  vlc: 'start vlc',
  obs: 'start obs64',
  steam: 'start steam',
  task_manager: 'start taskmgr',
  'task manager': 'start taskmgr',
  settings: 'start ms-settings:',
  control_panel: 'control',
  'control panel': 'control'
}

const APP_MAP_MAC: Record<string, string> = {
  chrome: 'open -a "Google Chrome"',
  'google chrome': 'open -a "Google Chrome"',
  firefox: 'open -a Firefox',
  safari: 'open -a Safari',
  finder: 'open -a Finder',
  terminal: 'open -a Terminal',
  vscode: 'open -a "Visual Studio Code"',
  code: 'open -a "Visual Studio Code"',
  calculator: 'open -a Calculator',
  spotify: 'open -a Spotify',
  discord: 'open -a Discord',
  slack: 'open -a Slack',
  zoom: 'open -a Zoom',
  word: 'open -a "Microsoft Word"',
  excel: 'open -a "Microsoft Excel"',
  powerpoint: 'open -a "Microsoft PowerPoint"',
  notes: 'open -a Notes',
  mail: 'open -a Mail',
  messages: 'open -a Messages',
  music: 'open -a Music',
  photos: 'open -a Photos',
  vlc: 'open -a VLC'
}

const APP_MAP_LINUX: Record<string, string> = {
  chrome: 'google-chrome &',
  'google chrome': 'google-chrome &',
  firefox: 'firefox &',
  chromium: 'chromium-browser &',
  terminal: 'x-terminal-emulator &',
  vscode: 'code &',
  code: 'code &',
  calculator: 'gnome-calculator &',
  spotify: 'spotify &',
  discord: 'discord &',
  slack: 'slack &',
  files: 'nautilus &',
  'file manager': 'nautilus &',
  vlc: 'vlc &',
  gedit: 'gedit &',
  notepad: 'gedit &'
}

export async function handleOpenApp(appName: string): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  const name = appName.toLowerCase().trim()
  const platform = process.platform

  try {
    let command: string | undefined

    if (platform === 'win32') {
      command = APP_MAP_WIN[name]
      if (!command) {
        // Try directly
        command = `start ${appName}`
      }
    } else if (platform === 'darwin') {
      command = APP_MAP_MAC[name]
      if (!command) {
        // Try with open -a
        command = `open -a "${appName}"`
      }
    } else {
      command = APP_MAP_LINUX[name]
      if (!command) {
        command = `${appName} &`
      }
    }

    await execAsync(command)
    return { success: true, data: `${appName} opened successfully` }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[OpenApp] Failed to open ${appName}:`, errMsg)
    return { success: false, error: `Could not open ${appName}: ${errMsg}` }
  }
}

export async function handleCloseApp(appName: string): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  try {
    if (process.platform === 'win32') {
      await execAsync(`taskkill /IM "${appName}.exe" /F`)
    } else if (process.platform === 'darwin') {
      await execAsync(`osascript -e 'quit app "${appName}"'`)
    } else {
      await execAsync(`pkill -f "${appName}"`)
    }
    return { success: true, data: `${appName} closed` }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    return { success: false, error: errMsg }
  }
}
