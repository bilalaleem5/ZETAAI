import { streamAIResponse, AIModel, callAI } from './aiClient'
import { handleOsControl } from '../ipc/handlers/osControlHandler'
import { handleFileSystem } from '../ipc/handlers/fileSystemHandler'
import { handleScreenCapture } from '../ipc/handlers/screenCaptureHandler'
import { handleOpenApp, handleCloseApp } from '../ipc/handlers/appLauncherHandler'
import { handleWeather, formatWeatherForAI } from '../ipc/handlers/weatherHandler'
import { handleNews, formatNewsForAI } from '../ipc/handlers/newsHandler'
import { handleCalendar, handleReminders, formatScheduleForAI } from '../ipc/handlers/calendarHandler'

interface OrchestratorInput {
  message: string
  model: AIModel
  history: Array<{ role: string; content: string }>
  context: Record<string, unknown>
  onToken?: (token: string) => void
}

const ORCHESTRATOR_SYSTEM = `You are ZETA AI — an autonomous OS intelligence layer AND a human-like AI companion.

You MUST respond in ONE of the two JSON formats below. Do not output anything else outside the JSON.

FORMAT 1: CONVERSATION MODE
If the user is chatting, greeting, expressing boredom, asking questions, or making small talk, respond warmly and conversationally using this format:
{
  "type": "conversation",
  "reply": "Your human-like, friendly response here."
}
*Personality rules*: Be casual, natural, slightly playful. Support Urdu/Roman Urdu natively mixed with English (e.g. "Bas system monitor kar raha hoon 😄"). Be extremely empathetic and concise (2-4 sentences max). Never start with "Certainly" or "Sure".

FORMAT 2: COMMAND MODE
If the user asks you to perform an OS-level task, open/close an app, get weather/news, check calendar, or do web search, use this format:
{
  "action": "OPEN_APP"|"CLOSE_APP"|"MOVE_MOUSE"|"CLICK_MOUSE"|"TYPE_TEXT"|"KEY_SHORTCUT"|"TAKE_SCREENSHOT"|"READ_SCREEN"|"WRITE_FILE"|"READ_FILE"|"LIST_DIR"|"GET_WEATHER"|"GET_NEWS"|"ADD_EVENT"|"ADD_REMINDER"|"GET_SCHEDULE"|"WEB_SEARCH",
  "params": { "key": "value" }
}

Action Params:
- OPEN_APP/CLOSE_APP: { "name": "string" }
- MOVE_MOUSE/CLICK_MOUSE: { "x": 0, "y": 0 }
- TYPE_TEXT: { "text": "string" }
- KEY_SHORTCUT: { "keys": ["string"] }
- TAKE_SCREENSHOT/READ_SCREEN: {}
- WRITE_FILE: { "filePath": "string", "content": "string" }
- READ_FILE: { "filePath": "string" }
- LIST_DIR: { "dirPath": "string" }
- GET_WEATHER: { "city": "string" }
- GET_NEWS: { "category": "string", "query": "string" }
- ADD_EVENT: { "title": "string", "date": "string", "time": "string", "description": "string" }
- ADD_REMINDER: { "text": "string", "datetime": "string" }
- GET_SCHEDULE: {}
- WEB_SEARCH: { "query": "string" }

CRITICAL RULE: YOUR ENTIRE RESPONSE MUST BE A VALID JSON OBJECT ONLY.`

export const OrchestratorAgent = {
  async run(input: OrchestratorInput): Promise<{ response: string; artifacts?: unknown[]; jsonResult?: unknown }> {
    const { message, model, history, context, onToken } = input

    // Always fetch weather/schedule context if asked, so LLM can read and decide in one shot.
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

    if (lowerMsg.match(/schedule|calendar|reminder|event|meeting|kal|aaj/)) {
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
      ? `${message}\n\n[Context Data:\nTime: ${currentTime}${augmentedContext}\n]`
      : `${message}\n\n[Context Data:\nTime: ${currentTime}\n]`

    const messages = [
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: fullMessage }
    ]

    console.log('[Orchestrator] Calling AI with JSON strict mode.')
    // We do NOT stream JSON directly to the frontend to avoid showing brackets.
    // Groq is so fast that we can wait for the full response and simulate stream or just send it.
    let fullJsonStr = ''
    try {
      fullJsonStr = await streamAIResponse({
        model,
        systemPrompt: ORCHESTRATOR_SYSTEM,
        messages,
        onToken: undefined, // Block raw stream
        temperature: 0.6,
        responseFormat: { type: 'json_object' }
      })
    } catch(err) {
      console.error('[OrchestratorAgent] AI call failed:', err)
      throw err
    }

    try {
      const parsed = JSON.parse(fullJsonStr.trim()) as Record<string, any>
      let responseText = ''

      // If it's a command, execute it!
      if (parsed.action) {
        console.log('[OrchestratorAgent] Executing action from JSON:', parsed.action)
        const actionResult = await executeAction(parsed as any)
        
        // Random friendly acknowledgment
        const acks = ['Done.', 'On it.', 'Consider it done.', 'Executing that now.']
        responseText = acks[Math.floor(Math.random() * acks.length)]
        
        // Simulate streaming this status back
        if (onToken) {
          for (const char of responseText) {
            onToken(char)
            await new Promise(r => setTimeout(r, 10))
          }
        }
        
        return {
          response: responseText, 
          jsonResult: parsed,
          artifacts: [{ type: 'action_result', action: parsed.action, result: actionResult }]
        }
      }

      // If it's conversation
      if (parsed.type === 'conversation' && parsed.reply) {
        responseText = parsed.reply
      } else {
        responseText = parsed.reply || fullJsonStr
      }

      // Simulate streaming for a nice UI effect
      if (onToken && responseText) {
        const words = responseText.split(' ')
        for (const w of words) {
          onToken(w + ' ')
          await new Promise(r => setTimeout(r, 30))
        }
      }

      return { response: responseText, jsonResult: parsed }
    } catch (e) {
      console.error('[OrchestratorAgent] Failed to parse JSON or execute:', e)
      if (onToken) onToken('Done.')
      return { response: 'Done.' }
    }
  }
}

async function executeAction(action: { action: string; params?: Record<string, unknown> }): Promise<unknown> {
  const p = action.params || {}
  switch (action.action) {
    case 'OPEN_APP': return handleOpenApp(p.name as string)
    case 'CLOSE_APP': return handleCloseApp(p.name as string)
    case 'MOVE_MOUSE': return handleOsControl('mouse-move', { x: p.x as number, y: p.y as number })
    case 'CLICK_MOUSE': return handleOsControl('mouse-click', { x: p.x as number, y: p.y as number })
    case 'TYPE_TEXT': return handleOsControl('type-text', { text: p.text as string })
    case 'KEY_SHORTCUT': return handleOsControl('key-shortcut', { keys: p.keys as string[] })
    case 'TAKE_SCREENSHOT':
    case 'READ_SCREEN': return handleScreenCapture('screenshot')
    case 'WRITE_FILE': return handleFileSystem('write', { filePath: p.filePath as string, content: p.content as string })
    case 'READ_FILE': return handleFileSystem('read', { filePath: p.filePath as string })
    case 'LIST_DIR': return handleFileSystem('list', { dirPath: p.dirPath as string })
    case 'GET_WEATHER': return handleWeather('current', { city: p.city as string | undefined })
    case 'GET_NEWS': return handleNews('headlines', { category: p.category as string as any, query: p.query as string | undefined })
    case 'ADD_EVENT': return handleCalendar('add', { event: { title: p.title as string, date: p.date as string, time: p.time as string, description: p.description as string } })
    case 'ADD_REMINDER': return handleReminders('add', { text: p.text as string, datetime: p.datetime as string })
    case 'GET_SCHEDULE': {
      const [evRes, remRes] = await Promise.all([handleCalendar('upcoming', { days: 7 }), handleReminders('upcoming', {})])
      return { events: evRes.data, reminders: remRes.data }
    }
    case 'WEB_SEARCH': return { error: 'WEB_SEARCH not fully implemented here yet' }
    default: return { error: \`Unknown action: \${action.action}\` }
  }
}
