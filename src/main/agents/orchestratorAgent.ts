import { streamAIResponse, AIModel } from './aiClient'
import { handleOsControl } from '../ipc/handlers/osControlHandler'
import { handleFileSystem } from '../ipc/handlers/fileSystemHandler'
import { handleScreenCapture } from '../ipc/handlers/screenCaptureHandler'
import { handleOpenApp, handleCloseApp } from '../ipc/handlers/appLauncherHandler'
import { handleWeather, formatWeatherForAI } from '../ipc/handlers/weatherHandler'
import { handleNews, formatNewsForAI } from '../ipc/handlers/newsHandler'
import { handleCalendar, handleReminders, formatScheduleForAI } from '../ipc/handlers/calendarHandler'
import { ConversationAgent, isConversationalMessage } from './conversationAgent'

interface OrchestratorInput {
  message: string
  model: AIModel
  history: Array<{ role: string; content: string }>
  context: Record<string, unknown>
  onToken?: (token: string) => void
}

const ORCHESTRATOR_SYSTEM = `You are ZETA AI — an autonomous OS intelligence layer AND a human-like AI companion.

You have TWO modes:

MODE 1: COMMAND MODE (when user gives commands/tasks)
Respond with text AND optionally a JSON action block:
\`\`\`json
{
  "action": "OPEN_APP"|"CLOSE_APP"|"MOVE_MOUSE"|"CLICK_MOUSE"|"TYPE_TEXT"|"KEY_SHORTCUT"|"TAKE_SCREENSHOT"|"READ_SCREEN"|"WRITE_FILE"|"READ_FILE"|"LIST_DIR"|"GET_WEATHER"|"GET_NEWS"|"ADD_EVENT"|"ADD_REMINDER"|"GET_SCHEDULE"|"WEB_SEARCH",
  "params": { ... }
}
\`\`\`

Params:
- OPEN_APP/CLOSE_APP: { name: string }
- MOVE_MOUSE/CLICK_MOUSE: { x: number, y: number }
- TYPE_TEXT: { text: string }
- KEY_SHORTCUT: { keys: string[] }
- TAKE_SCREENSHOT/READ_SCREEN: {}
- WRITE_FILE: { filePath: string, content: string }
- READ_FILE: { filePath: string }
- LIST_DIR: { dirPath: string }
- GET_WEATHER: { city?: string }
- GET_NEWS: { category?: string, query?: string }
- ADD_EVENT: { title: string, date: string, time?: string, description?: string }
- ADD_REMINDER: { text: string, datetime: string }
- GET_SCHEDULE: {}
- WEB_SEARCH: { query: string }

MODE 2: CONVERSATION MODE (greetings, small talk, emotions)
Respond naturally, warmly, like a human companion. Short responses. Support Urdu/Hinglish.

RULES: Never start with "Certainly!", "Great!", "Sure!". Be concise. Real-world info is injected automatically.`

export const OrchestratorAgent = {
  async run(input: OrchestratorInput): Promise<{ response: string; artifacts?: unknown[] }> {
    const { message, model, history, context, onToken } = input

    // Route to conversation agent for casual chat
    if (isConversationalMessage(message)) {
      const weatherCtx = context.weather as string | undefined
      const timeCtx = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const result = await ConversationAgent.run({
        message, model, history,
        context: { time: timeCtx, weather: weatherCtx },
        onToken
      })
      return result
    }

    // Augment with real-world context if relevant
    const lowerMsg = message.toLowerCase()
    let augmentedContext = ''

    if (lowerMsg.match(/weather|temperature|mausam|garmi|sardi|barish/)) {
      const wRes = await handleWeather('current', {})
      if (wRes.success && wRes.data) {
        augmentedContext += `\n[WEATHER]: ${formatWeatherForAI(wRes.data)}`
      }
    }

    if (lowerMsg.match(/news|khabar|headlines|kya hua/)) {
      const nRes = await handleNews('headlines', {})
      if (nRes.success && nRes.data) {
        augmentedContext += `\n[NEWS]:\n${formatNewsForAI(nRes.data as never)}`
      }
    }

    if (lowerMsg.match(/schedule|calendar|reminder|event|meeting|kal ka|aaj ka/)) {
      const [evRes, remRes] = await Promise.all([
        handleCalendar('today', {}),
        handleReminders('upcoming', {})
      ])
      if (evRes.success && remRes.success) {
        augmentedContext += `\n[SCHEDULE]:\n${formatScheduleForAI(
          (evRes.data as never) || [],
          (remRes.data as never) || []
        )}`
      }
    }

    const currentTime = new Date().toLocaleString()
    const fullMessage = augmentedContext
      ? `${message}\n\n[Time: ${currentTime}]${augmentedContext}`
      : `${message}\n\n[Time: ${currentTime}]`

    const messages = [
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: fullMessage }
    ]

    const response = await streamAIResponse({
      model,
      systemPrompt: ORCHESTRATOR_SYSTEM,
      messages,
      onToken,
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
    case 'OPEN_APP':
      return handleOpenApp(action.params.name as string)
    case 'CLOSE_APP':
      return handleCloseApp(action.params.name as string)
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
    case 'GET_WEATHER':
      return handleWeather('current', { city: action.params.city as string | undefined })
    case 'GET_NEWS':
      return handleNews('headlines', {
        category: (action.params.category as string) as import('../ipc/handlers/newsHandler').NewsCategory | undefined,
        query: action.params.query as string | undefined
      })
    case 'ADD_EVENT':
      return handleCalendar('add', {
        event: {
          title: action.params.title as string,
          date: action.params.date as string,
          time: action.params.time as string | undefined,
          description: action.params.description as string | undefined
        }
      })
    case 'ADD_REMINDER':
      return handleReminders('add', {
        text: action.params.text as string,
        datetime: action.params.datetime as string
      })
    case 'GET_SCHEDULE': {
      const [evRes, remRes] = await Promise.all([
        handleCalendar('upcoming', { days: 7 }),
        handleReminders('upcoming', {})
      ])
      return { events: evRes.data, reminders: remRes.data }
    }
    default:
      return { error: `Unknown action: ${action.action}` }
  }
}
