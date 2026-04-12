import { promises as fs } from 'fs'
import { shell } from 'electron'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

type FsAction = 'read' | 'write' | 'list' | 'mkdir' | 'delete' | 'open-editor' | 'open-file'

interface FsPayload {
  filePath?: string
  content?: string
  dirPath?: string
  recursive?: boolean
}

export async function handleFileSystem(
  action: FsAction,
  payload: FsPayload
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (action) {
      case 'read': {
        const content = await fs.readFile(payload.filePath!, 'utf-8')
        return { success: true, data: content }
      }

      case 'write': {
        const dir = path.dirname(payload.filePath!)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(payload.filePath!, payload.content ?? '', 'utf-8')
        return { success: true }
      }

      case 'list': {
        const entries = await fs.readdir(payload.dirPath!, { withFileTypes: true })
        const data = entries.map((e) => ({
          name: e.name,
          isDirectory: e.isDirectory(),
          path: path.join(payload.dirPath!, e.name)
        }))
        return { success: true, data }
      }

      case 'mkdir': {
        await fs.mkdir(payload.dirPath!, { recursive: true })
        return { success: true }
      }

      case 'delete': {
        await fs.rm(payload.filePath!, { recursive: true, force: true })
        return { success: true }
      }

      case 'open-editor': {
        // Try VSCode first, then system default
        try {
          await execAsync(`code "${payload.filePath}"`)
        } catch {
          shell.openPath(payload.filePath!)
        }
        return { success: true }
      }

      case 'open-file': {
        shell.openPath(payload.filePath!)
        return { success: true }
      }

      default:
        return { success: false, error: `Unknown FS action: ${action}` }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[FileSystem:${action}] Error:`, errMsg)
    return { success: false, error: errMsg }
  }
}
