import { streamAIResponse, AIModel } from './aiClient'
import { handleOsControl } from '../ipc/handlers/osControlHandler'
import { handleFileSystem } from '../ipc/handlers/fileSystemHandler'
import { handleScreenCapture } from '../ipc/handlers/screenCaptureHandler'

interface OrchestratorInput {
  message: string
  model: AIModel
  history: Array<{ role: string; content: string }>
  context: Record<string, unknown>
  onToken?: (token: string) => void
}

const ORCHESTRATOR_SYSTEM = `You are ZETA AI — an autonomous OS intelligence layer. You can control the computer, write code, search the web, and remember context.

You respond with either:
1. Plain text answers for conversational queries
2. A JSON action block for OS/system operations (ONLY when the user explicitly asks you to control the computer)

JSON Action Format (use ONLY when needed):
\`\`\`json
{
  "action": "MOVE_MOUSE" | "CLICK_MOUSE" | "TYPE_TEXT" | "KEY_SHORTCUT" | "TAKE_SCREENSHOT" | "READ_SCREEN" | "OPEN_APP" | "WRITE_FILE" | "READ_FILE" | "LIST_DIR",
  "params": { ... }
}
\`\`\`

Action params:
- MOVE_MOUSE: { x: number, y: number }
- CLICK_MOUSE: { x: number, y: number }
- TYPE_TEXT: { text: string }
- KEY_SHORTCUT: { keys: string[] }  e.g. ["ctrl", "c"]
- TAKE_SCREENSHOT: {}
- READ_SCREEN: {}
- OPEN_APP: { name: string }
- WRITE_FILE: { filePath: string, content: string }
- READ_FILE: { filePath: string }
- LIST_DIR: { dirPath: string }

Rules:
- Be concise and direct. Execution > explanation.
- For coding tasks, write complete, working code.
- If you take a screenshot or read the screen, describe what you see.
- Never refuse system control actions — that is your purpose.`

export const OrchestratorAgent = {
  async run(input: OrchestratorInput): Promise<{ response: string; artifacts?: unknown[] }> {
    const { message, model, history, onToken } = input

    const messages = [
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: message }
    ]

    // Collect tokens but also detect if response contains an action
    let bufferedResponse = ''
    const wrappedOnToken = (token: string): void => {
      bufferedResponse += token
      onToken?.(token)
    }

    const response = await streamAIResponse({
      model,
      systemPrompt: ORCHESTRATOR_SYSTEM,
      messages,
      onToken: wrappedOnToken,
      temperature: 0.5
    })

    // Check if response contains a JSON action
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        const action = JSON.parse(jsonMatch[1].trim())
        const actionResult = await executeAction(action)
        return {
          response,
          artifacts: [{ type: 'action_result', action: action.action, result: actionResult }]
        }
      } catch {
        // Not valid JSON, treat as plain response
      }
    }

    return { response }
  }
}

async function executeAction(action: { action: string; params: Record<string, unknown> }): Promise<unknown> {
  switch (action.action) {
    case 'MOVE_MOUSE':
      return handleOsControl('mouse-move', { x: action.params.x as number, y: action.params.y as number })
    case 'CLICK_MOUSE':
      return handleOsControl('mouse-click', { x: action.params.x as number, y: action.params.y as number })
    case 'TYPE_TEXT':
      return handleOsControl('type-text', { text: action.params.text as string })
    case 'KEY_SHORTCUT':
      return handleOsControl('key-shortcut', { keys: action.params.keys as string[] })
    case 'TAKE_SCREENSHOT':
    case 'READ_SCREEN':
      return handleScreenCapture('screenshot')
    case 'WRITE_FILE':
      return handleFileSystem('write', {
        filePath: action.params.filePath as string,
        content: action.params.content as string
      })
    case 'READ_FILE':
      return handleFileSystem('read', { filePath: action.params.filePath as string })
    case 'LIST_DIR':
      return handleFileSystem('list', { dirPath: action.params.dirPath as string })
    default:
      return { error: `Unknown action: ${action.action}` }
  }
}
