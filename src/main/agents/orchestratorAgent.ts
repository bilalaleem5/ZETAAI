import { streamAIResponse, AIModel, callAI } from './aiClient'
import { handleOsControl } from '../ipc/handlers/osControlHandler'
import { handleFileSystem } from '../ipc/handlers/fileSystemHandler'
import { handleScreenCapture } from '../ipc/handlers/screenCaptureHandler'
import { handleOpenApp, handleCloseApp } from '../ipc/handlers/appLauncherHandler'
import { handleWeather, formatWeatherForAI } from '../ipc/handlers/weatherHandler'
import { handleNews, formatNewsForAI } from '../ipc/handlers/newsHandler'
import { handleCalendar, handleReminders, formatScheduleForAI } from '../ipc/handlers/calendarHandler'
import { TaskEngine, CRMStore, DraftStore, ContactStore, getDailyBriefing } from '../ipc/handlers/memoryHandler'

interface OrchestratorInput {
  message: string; model: AIModel
  history: Array<{ role: string; content: string }>
  context: Record<string, unknown>; onToken?: (token: string) => void
}

const SYSTEM = `You are ZETA — an autonomous AI personal assistant and productivity engine.

You control the user's computer, manage their tasks/CRM/calendar, search the web, draft emails/WhatsApp messages, and hold natural conversations.

RESPOND IN EXACTLY ONE OF THESE JSON FORMATS:

FORMAT A — Conversation / Information:
{"type":"conversation","reply":"Your response here"}

FORMAT B — Single OS/Web Action:
{"action":"ACTION_NAME","params":{...}}

FORMAT C — Multi-step plan (for complex requests):
{"type":"plan","steps":["Step 1","Step 2"],"firstAction":{"action":"ACTION_NAME","params":{...}}}

ACTIONS AVAILABLE:
- OPEN_APP: {"name":"app_name"}
- CLOSE_APP: {"name":"app_name"}
- TYPE_TEXT: {"text":"..."}
- KEY_SHORTCUT: {"keys":["ctrl","c"]}
- TAKE_SCREENSHOT: {}
- WRITE_FILE: {"filePath":"...","content":"..."}
- READ_FILE: {"filePath":"..."}
- LIST_DIR: {"dirPath":"..."}
- GET_WEATHER: {"city":"city_name"}
- GET_NEWS: {"category":"general","query":"optional"}
- WEB_SEARCH: {"query":"search query"}
- ADD_TASK: {"title":"...","deadline":"ISO date","priority":"high|medium|low"}
- LIST_TASKS: {"status":"pending|completed|overdue"}
- COMPLETE_TASK: {"id":"task_id"}
- ADD_LEAD: {"name":"...","company":"...","role":"...","email":"...","source":"..."}
- LIST_LEADS: {"status":"new|contacted"}
- DRAFT_EMAIL: {"to":"...","subject":"...","body":"..."}
- DRAFT_WHATSAPP: {"to":"...","body":"..."}
- GET_BRIEFING: {}
- GET_SCHEDULE: {}
- ADD_EVENT: {"title":"...","date":"ISO","time":"HH:mm"}
- ADD_REMINDER: {"text":"...","datetime":"ISO"}

RULES:
- NEVER send emails/WhatsApp without user saying "send" or "confirm"
- ALWAYS draft first, ask confirmation before any external action
- Support Urdu/Hinglish naturally
- Keep replies concise but complete
- YOUR ENTIRE RESPONSE MUST BE VALID JSON`

export const OrchestratorAgent = {
  async run(input: OrchestratorInput): Promise<{ response: string; artifacts?: unknown[] }> {
    const { message, model, history, onToken } = input

    // Auto-inject relevant context
    const lower = message.toLowerCase()
    let ctx = `[Time: ${new Date().toLocaleString()}]`

    if (lower.match(/weather|temperature|mausam|garmi|sardi|barish/)) {
      const w = await handleWeather('current', {})
      if (w.success && w.data) ctx += `\n${formatWeatherForAI(w.data)}`
    }
    if (lower.match(/news|khabar|headlines/)) {
      const n = await handleNews('headlines', {})
      if (n.success && n.data) ctx += `\n${formatNewsForAI(n.data as any)}`
    }
    if (lower.match(/task|kaam|schedule|reminder|aaj|kal/)) {
      const summary = await TaskEngine.summary()
      ctx += `\n${summary}`
    }
    if (lower.match(/briefing|morning|good morning|subah/)) {
      ctx += `\n${await getDailyBriefing()}`
    }

    const msgs = [
      ...history.slice(-8).map(h => ({ role: h.role as 'user'|'assistant', content: h.content })),
      { role: 'user' as const, content: `${message}\n\n${ctx}` }
    ]

    let jsonStr = ''
    try {
      jsonStr = await streamAIResponse({
        model, systemPrompt: SYSTEM, messages: msgs,
        onToken: undefined, temperature: 0.5,
        responseFormat: { type: 'json_object' }
      })
    } catch (err) { throw err }

    let parsed: Record<string, any>
    try { parsed = JSON.parse(jsonStr.trim()) }
    catch { 
      // Fallback: treat as conversation
      const fallback = 'I understand. How can I help you further?'
      if (onToken) for (const w of fallback.split(' ')) { onToken(w + ' '); await delay(25) }
      return { response: fallback }
    }

    // ── Execute action ───────────────────────────────────────────────────────
    if (parsed.action) {
      console.log('[Orchestrator] Action:', parsed.action, parsed.params)
      const result = await executeAction(parsed.action, parsed.params || {})
      const summary = formatResult(parsed.action, parsed.params || {}, result)
      if (onToken) for (const w of summary.split(' ')) { onToken(w + ' '); await delay(20) }
      return { response: summary, artifacts: [{ action: parsed.action, result }] }
    }

    // ── Multi-step plan ──────────────────────────────────────────────────────
    if (parsed.type === 'plan') {
      let planText = `📋 Plan:\n${parsed.steps?.map((s: string, i: number) => `${i+1}. ${s}`).join('\n')}\n\n`
      if (parsed.firstAction) {
        const result = await executeAction(parsed.firstAction.action, parsed.firstAction.params || {})
        planText += formatResult(parsed.firstAction.action, parsed.firstAction.params, result)
      }
      if (onToken) for (const w of planText.split(' ')) { onToken(w + ' '); await delay(20) }
      return { response: planText }
    }

    // ── Conversation ─────────────────────────────────────────────────────────
    const reply = parsed.reply || parsed.response || 'Done.'
    if (onToken) {
      const words = reply.split(' ')
      for (const w of words) { onToken(w + ' '); await delay(30) }
    }
    return { response: reply }
  }
}

async function executeAction(action: string, p: Record<string, any>): Promise<unknown> {
  switch (action) {
    case 'OPEN_APP':      return handleOpenApp(p.name)
    case 'CLOSE_APP':     return handleCloseApp(p.name)
    case 'TYPE_TEXT':     return handleOsControl('type-text', { text: p.text })
    case 'KEY_SHORTCUT':  return handleOsControl('key-shortcut', { keys: p.keys })
    case 'TAKE_SCREENSHOT':
    case 'READ_SCREEN':   return handleScreenCapture('screenshot')
    case 'WRITE_FILE':    return handleFileSystem('write', { filePath: p.filePath, content: p.content })
    case 'READ_FILE':     return handleFileSystem('read', { filePath: p.filePath })
    case 'LIST_DIR':      return handleFileSystem('list', { dirPath: p.dirPath })
    case 'GET_WEATHER':   return handleWeather('current', { city: p.city })
    case 'GET_NEWS':      return handleNews('headlines', { category: p.category, query: p.query })
    case 'WEB_SEARCH':    return webSearch(p.query)
    case 'ADD_TASK':      return TaskEngine.add({ title: p.title, deadline: p.deadline, priority: p.priority || 'medium' })
    case 'LIST_TASKS':    return TaskEngine.list(p.status ? { status: p.status } : undefined)
    case 'COMPLETE_TASK': return TaskEngine.complete(p.id)
    case 'ADD_LEAD':      return CRMStore.add({ name: p.name, company: p.company, role: p.role, email: p.email, source: p.source })
    case 'LIST_LEADS':    return CRMStore.list(p.status)
    case 'DRAFT_EMAIL':   return DraftStore.save({ type: 'email', to: p.to, subject: p.subject, body: p.body })
    case 'DRAFT_WHATSAPP':return DraftStore.save({ type: 'whatsapp', to: p.to, body: p.body })
    case 'GET_BRIEFING':  return getDailyBriefing()
    case 'GET_SCHEDULE': {
      const [ev, rem] = await Promise.all([handleCalendar('today', {}), handleReminders('upcoming', {})])
      return formatScheduleForAI(ev.data as any || [], rem.data as any || [])
    }
    case 'ADD_EVENT':    return handleCalendar('add', { event: { title: p.title, date: p.date, time: p.time } })
    case 'ADD_REMINDER': return handleReminders('add', { text: p.text, datetime: p.datetime })
    default: return { error: `Unknown action: ${action}` }
  }
}

async function webSearch(query: string): Promise<unknown> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return { error: 'TAVILY_API_KEY not configured' }
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, search_depth: 'basic', max_results: 5 })
    })
    const data = await res.json() as any
    return data.results?.map((r: any) => ({ title: r.title, url: r.url, snippet: r.content?.slice(0, 200) })) || []
  } catch (e) { return { error: String(e) } }
}

function formatResult(action: string, params: Record<string, any>, result: unknown): string {
  const r = result as any
  switch (action) {
    case 'OPEN_APP':      return r?.success ? `✅ Opened ${params.name}` : `❌ Could not open ${params.name}: ${r?.error}`
    case 'CLOSE_APP':     return r?.success ? `✅ Closed ${params.name}` : `❌ Could not close ${params.name}`
    case 'GET_WEATHER':
      if (r?.success && r?.data) {
        const d = r.data; return `🌤️ ${d.city}: ${d.temp}°C, ${d.description}. Feels like ${d.feelsLike}°C. Humidity ${d.humidity}%.`
      }
      return `⚠️ Weather data unavailable`
    case 'GET_NEWS':
      if (r?.success && Array.isArray(r?.data)) {
        return `📰 Top headlines:\n${r.data.slice(0,3).map((n: any, i: number) => `${i+1}. ${n.title}`).join('\n')}`
      }
      return `⚠️ News unavailable`
    case 'WEB_SEARCH':
      if (Array.isArray(r)) {
        return `🔍 Found ${r.length} results for "${params.query}":\n${r.slice(0,3).map((x: any,i: number)=>`${i+1}. ${x.title}\n   ${x.snippet}`).join('\n\n')}`
      }
      return `⚠️ Search failed: ${r?.error}`
    case 'ADD_TASK':      return r?.id ? `✅ Task added: "${r.title}" (${r.priority} priority)` : `❌ Failed to add task`
    case 'LIST_TASKS':
      if (Array.isArray(r) && r.length > 0) {
        return `📋 Tasks (${r.length}):\n${r.map((t:any)=>`• [${t.status}] ${t.title}${t.deadline?` — due ${new Date(t.deadline).toLocaleDateString()}`:''}`).join('\n')}`
      }
      return `📋 No tasks found`
    case 'COMPLETE_TASK': return r ? `✅ Task marked complete` : `❌ Task not found`
    case 'ADD_LEAD':      return r?.id ? `✅ Lead saved: ${r.name}${r.company ? ` @ ${r.company}` : ''}` : `❌ Failed to save lead`
    case 'DRAFT_EMAIL':   return `📩 Email drafted to ${params.to}:\nSubject: ${params.subject}\n\n${params.body}\n\n⚠️ Type "send email" to confirm sending.`
    case 'DRAFT_WHATSAPP':return `💬 WhatsApp message drafted to ${params.to}:\n${params.body}\n\n⚠️ Type "send message" to confirm.`
    case 'GET_BRIEFING':  return typeof r === 'string' ? r : `📅 ${JSON.stringify(r)}`
    case 'GET_SCHEDULE':  return typeof r === 'string' ? r : `📅 ${JSON.stringify(r)}`
    case 'ADD_EVENT':     return r?.success ? `📅 Event added: ${params.title}` : `❌ Failed to add event`
    case 'ADD_REMINDER':  return r?.success ? `🔔 Reminder set: ${params.text}` : `❌ Failed to set reminder`
    case 'WRITE_FILE':    return r?.success ? `📄 File saved: ${params.filePath}` : `❌ Failed to save file`
    case 'READ_FILE':     return r?.success ? `📄 File: ${r.data}` : `❌ Failed to read file`
    default: return JSON.stringify(result, null, 2).slice(0, 500)
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
