import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

type OsAction =
  | 'mouse-move'
  | 'mouse-click'
  | 'type-text'
  | 'key-shortcut'
  | 'scroll'
  | 'list-windows'
  | 'focus-window'

interface OsPayload {
  x?: number
  y?: number
  text?: string
  keys?: string[]
  direction?: 'up' | 'down'
  amount?: number
  windowTitle?: string
}

export async function handleOsControl(
  action: OsAction,
  payload: OsPayload
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (action) {
      case 'mouse-move': {
        const { mouse, Point } = await import('@nut-tree-fork/nut-js')
        await mouse.setPosition(new Point(payload.x ?? 0, payload.y ?? 0))
        return { success: true }
      }

      case 'mouse-click': {
        const { mouse, Point, Button } = await import('@nut-tree-fork/nut-js')
        await mouse.setPosition(new Point(payload.x ?? 0, payload.y ?? 0))
        await mouse.click(Button.LEFT)
        return { success: true }
      }

      case 'type-text': {
        const { keyboard } = await import('@nut-tree-fork/nut-js')
        await keyboard.type(payload.text ?? '')
        return { success: true }
      }

      case 'key-shortcut': {
        const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
        const keyMap: Record<string, unknown> = {
          ctrl: Key.LeftControl,
          alt: Key.LeftAlt,
          shift: Key.LeftShift,
          win: Key.LeftWin,
          c: Key.C,
          v: Key.V,
          z: Key.Z,
          a: Key.A,
          s: Key.S,
          tab: Key.Tab,
          enter: Key.Return,
          escape: Key.Escape,
          space: Key.Space,
          f5: Key.F5
        }
        const keys = (payload.keys ?? []).map((k) => keyMap[k.toLowerCase()] ?? Key.Space)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await keyboard.pressKey(...(keys as any[]))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await keyboard.releaseKey(...(keys as any[]))
        return { success: true }
      }

      case 'scroll': {
        const { mouse, ScrollDirection } = await import('@nut-tree-fork/nut-js')
        const dir = payload.direction === 'up' ? ScrollDirection.UP : ScrollDirection.DOWN
        await mouse.scroll(dir, payload.amount ?? 3)
        return { success: true }
      }

      case 'list-windows': {
        if (process.platform === 'win32') {
          const { stdout } = await execAsync(
            'powershell -command "Get-Process | Where-Object {$_.MainWindowTitle -ne \'\'} | Select-Object -Property ProcessName, MainWindowTitle | ConvertTo-Json"'
          )
          return { success: true, data: JSON.parse(stdout) }
        } else if (process.platform === 'darwin') {
          const { stdout } = await execAsync(
            `osascript -e 'tell application "System Events" to get name of every process whose visible is true'`
          )
          return { success: true, data: stdout.split(', ').map((s) => s.trim()) }
        } else {
          const { stdout } = await execAsync('wmctrl -l')
          return { success: true, data: stdout.split('\n').filter(Boolean) }
        }
      }

      case 'focus-window': {
        if (process.platform === 'win32') {
          await execAsync(
            `powershell -command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate('${payload.windowTitle}')"`
          )
        } else if (process.platform === 'darwin') {
          await execAsync(`osascript -e 'tell application "${payload.windowTitle}" to activate'`)
        } else {
          await execAsync(`wmctrl -a "${payload.windowTitle}"`)
        }
        return { success: true }
      }

      default:
        return { success: false, error: `Unknown OS action: ${action}` }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[OsControl:${action}] Error:`, errMsg)
    return { success: false, error: errMsg }
  }
}
