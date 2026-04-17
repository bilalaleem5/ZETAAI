/**
 * orchestratorAgent.ts — ZETA AI Brain (REBUILT)
 *
 * Routes ALL inputs through intent detection → JSON action/response
 * Now includes: tasks, CRM, drafts, daily briefing, web search, memory context
 */
import { streamAIResponse, AIModel } from './aiClient'
import { handleOsControl } from '../ipc/handlers/osControlHandler'
import { handleFileSystem } from '../ipc/handlers/fileSystemHandler'
import { handleScreenCapture } from '../ipc/handlers/screenCaptureHandler'
import { handleOpenApp, handleCloseApp } from '../ipc/handlers/appLauncherHandler'
import { handleWeather, formatWeatherForAI } from '../ipc/handlers/weatherHandler'
import { handleNews, formatNewsForAI } from '../ipc/handlers/newsHandler'
import { handleCalendar, handleReminders, formatScheduleForAI } from '../ipc/handlers/calendarHandler'
import { handleWebIntelligence } from '../ipc/handlers/webIntelligenceHandler'
import * as mem from '../memory/memoryStore'

interface OrchestratorInput {
  message: string
  model: AIModel
  history: Array<{ role: string; content: string }>
  context: Record<string, unknown>
  onToken?: (token: string) => void
}

const ORCHESTRATOR_SYSTEM = `You are ZETA AI — an autonomous OS intelligence layer, personal executive assistant, CRM manager, and human-like AI companion.

You MUST respond in ONE of the two JSON formats below. Do not output anything else outside the JSON.

FORMAT 1: CONVERSATION MODE
If the user is chatting, greeting, asking questions, sharing feelings, or making small talk:
{
  "type": "conversation",
  "reply": "Your natural, human-like response here."
}
*Personality*: Be casual, warm, slightly playful. Support Urdu/Roman Urdu mixed with English naturally. Be empathetic and concise (2-4 sentences for casual chat, longer for detailed questions). Never start with "Certainly" or "Sure".

FORMAT 2: COMMAND MODE
For any actionable request — OS tasks, app control, search, CRM, tasks, drafts, weather, news, etc.:
{
  "action": "ACTION_NAME",
  "params": { "key": "value" },
  "spoken_reply": "Natural confirmation to speak aloud (1 sentence max)"
}

AVAILABLE ACTIONS:
- OPEN_APP: { "name": "app name" }
- CLOSE_APP: { "name": "app name" }
- MOVE_MOUSE / CLICK_MOUSE: { "x": 0, "y": 0 }
- TYPE_TEXT: { "text": "string" }
- KEY_SHORTCUT: { "keys": ["ctrl", "c"] }
- TAKE_SCREENSHOT / READ_SCREEN: {}
- WRITE_FILE: { "filePath": "string", "content": "string" }
- READ_FILE: { "filePath": "string" }
- LIST_DIR: { "dirPath": "string" }
- GET_WEATHER: { "city": "string" }
- GET_NEWS: { "category": "string", "query": "string" }
- WEB_SEARCH: { "query": "string" }
- ADD_EVENT: { "title": "string", "date": "string", "time": "string" }
- ADD_REMINDER: { "text": "string", "datetime": "string" }
- GET_SCHEDULE: {}

- ADD_TASK: { "title": "string", "deadline": "YYYY-MM-DD", "priority": "low|medium|high|critical", "description": "string" }
- COMPLETE_TASK: { "task_id": "string" }
- LIST_TASKS: { "status": "pending|completed|overdue" }
- RESCHEDULE_TASK: { "task_id": "string", "new_deadline": "YYYY-MM-DD" }

- ADD_LEAD: { "name": "string", "company": "string", "role": "string", "email": "string", "source": "string" }
- LIST_LEADS: { "status": "new|contacted|qualified", "query": "string" }
- SEARCH_LEADS: { "query": "string" }

- ADD_CONTACT: { "name": "string", "email": "string", "phone": "string", "company": "string" }
- LIST_CONTACTS: { "query": "string" }

- DRAFT_EMAIL: { "to": "string", "subject": "string", "body": "string" }
- DRAFT_WHATSAPP: { "to": "string", "body": "string" }
- LIST_DRAFTS: { "type": "email|whatsapp" }
- APPROVE_DRAFT: { "draft_id": "string" }

- DAILY_BRIEFING: {}
- TASK_SUMMARY: {}

SAFETY RULES:
- NEVER send emails/messages without explicit user approval — ALWAYS create DRAFTS first
- NEVER perform destructive actions (delete files, mass operations) without confirmation
- NEVER expose API keys in responses
- Always show preview before execution for communication
- For lead search queries, use WEB_SEARCH to find leads then ADD_LEAD to store them

PROACTIVE BEHAVIOR:
- If you see overdue tasks in the context, mention them proactively
- If the user seems to be planning, suggest creating tasks
- If discussing contacts/leads, suggest next actions (follow-up, draft message)
- When showing data, format it clearly with emojis and structure

RESPONSE RULES:
- spoken_reply must be short and natural (for TTS)
- For data-heavy responses (task lists, lead lists), put details in the reply field too
- Understand mixed Urdu/English commands like "task add karo", "leads dhundo", "email bana do"

CRITICAL: YOUR ENTIRE RESPONSE MUST BE A VALID JSON OBJECT ONLY.`

export const OrchestratorAgent = {
  async run(input: OrchestratorInput): Promise<{ response: string; artifacts?: unknown[]; jsonResult?: unknown }> {
    const { message, model, history, context, onToken } = input

    // ── Augment context with real-time data ──────────────────────────────────
    const lowerMsg = message.toLowerCase()
    let augmentedContext = ''

    // Always include memory context for proactive behavior
    try {
      augmentedContext += `\n${mem.getFullMemoryContext()}`
    } catch { /* memory not critical */ }

    if (lowerMsg.match(/weather|temperature|mausam|garmi|sardi|barish|موسم/)) {
      try {
        const wRes = await handleWeather('current', {})
        if (wRes.success && wRes.data) augmentedContext += `\n[WEATHER]: ${formatWeatherForAI(wRes.data)}`
      } catch {}
    }

    if (lowerMsg.match(/news|khabar|headlines|kya hua|خبر/)) {
      try {
        const nRes = await handleNews('headlines', {})
        if (nRes.success && nRes.data) augmentedContext += `\n[NEWS]:\n${formatNewsForAI(nRes.data as never)}`
      } catch {}
    }

    if (lowerMsg.match(/schedule|calendar|reminder|event|meeting|kal|aaj|کل|آج/)) {
      try {
        const [evRes, remRes] = await Promise.all([handleCalendar('today', {}), handleReminders('upcoming', {})])
        if (evRes.success && remRes.success) {
          augmentedContext += `\n[SCHEDULE]:\n${formatScheduleForAI((evRes.data as never) || [], (remRes.data as never) || [])}`
        }
      } catch {}
    }

    if (lowerMsg.match(/briefing|brief|summary|خلاصہ|report|daily/)) {
      try {
        const brief = mem.getDailyBriefingData()
        augmentedContext += `\n[DAILY BRIEFING DATA]:
Overdue: ${brief.overdueTasks.map(t => t.title).join(', ') || 'None'}
Due today: ${brief.todayTasks.map(t => t.title).join(', ') || 'None'}
Pending: ${brief.pendingTasks.map(t => `${t.title} (${t.priority})`).join(', ') || 'None'}
Yesterday completed: ${brief.yesterdayCompleted.map(t => t.title).join(', ') || 'None'}
Recent leads: ${brief.recentLeads.map(l => `${l.name}@${l.company}`).join(', ') || 'None'}
Pending drafts: ${brief.pendingDrafts.length}`
      } catch {}
    }

    const currentTime = new Date().toLocaleString()
    const today = new Date().toISOString().split('T')[0]
    const fullMessage = `${message}\n\n[Context:\nTime: ${currentTime}\nDate: ${today}${augmentedContext}\n]`

    const messages = [
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: fullMessage }
    ]

    console.log('[Orchestrator] Calling AI with JSON strict mode.')
    let fullJsonStr = ''
    try {
      fullJsonStr = await streamAIResponse({
        model,
        systemPrompt: ORCHESTRATOR_SYSTEM,
        messages,
        onToken: undefined,
        temperature: 0.6,
        responseFormat: { type: 'json_object' }
      })
    } catch (err) {
      console.error('[OrchestratorAgent] AI call failed:', err)
      throw err
    }

    try {
      const parsed = JSON.parse(fullJsonStr.trim()) as Record<string, any>
      let responseText = ''

      // ── COMMAND MODE ────────────────────────────────────────────────────
      if (parsed.action) {
        console.log('[OrchestratorAgent] Executing action:', parsed.action)
        const actionResult = await executeAction(parsed as any)
        const spokenReply = parsed.spoken_reply || 'Done.'

        // Build detailed text response from action result
        responseText = buildActionResponse(parsed.action, parsed.params, actionResult, spokenReply)

        if (onToken) {
          const words = responseText.split(' ')
          for (const w of words) {
            onToken(w + ' ')
            await new Promise(r => setTimeout(r, 20))
          }
        }

        return {
          response: responseText,
          jsonResult: parsed,
          artifacts: [{ type: 'action_result', action: parsed.action, result: actionResult }]
        }
      }

      // ── CONVERSATION MODE ───────────────────────────────────────────────
      if (parsed.type === 'conversation' && parsed.reply) {
        responseText = parsed.reply
      } else {
        responseText = parsed.reply || fullJsonStr
      }

      if (onToken && responseText) {
        const words = responseText.split(' ')
        for (const w of words) {
          onToken(w + ' ')
          await new Promise(r => setTimeout(r, 25))
        }
      }

      return { response: responseText, jsonResult: parsed }
    } catch (e) {
      console.error('[OrchestratorAgent] Failed to parse JSON or execute:', e)
      const fallback = 'Sorry, I had trouble processing that. Could you try again?'
      if (onToken) onToken(fallback)
      return { response: fallback }
    }
  }
}

// ── Build human-readable response from action results ─────────────────────────
function buildActionResponse(action: string, params: Record<string, any> | undefined, result: any, spokenReply: string): string {
  const p = params || {}
  try {
    switch (action) {
      case 'GET_WEATHER':
        if (result?.success && result?.data) {
          const d = result.data
          return `🌤️ **${d.city || 'Your area'}**: ${d.temp}°C, ${d.description}. Feels like ${d.feelsLike}°C. Humidity ${d.humidity}%, wind ${d.windSpeed} km/h.`
        }
        return spokenReply

      case 'GET_NEWS':
        if (result?.success && result?.data) {
          const articles = result.data as Array<{ title: string; source?: string }>
          return `📰 **Headlines:**\n${articles.slice(0, 5).map((a, i) => `${i + 1}. ${a.title} (${a.source || 'News'})`).join('\n')}`
        }
        return spokenReply

      case 'WEB_SEARCH':
        if (result?.success && result?.data) {
          const results = result.data as Array<{ title: string; url: string; snippet: string }>
          return `🌐 **Search results for "${p.query}":**\n${results.slice(0, 5).map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   🔗 ${r.url}`).join('\n\n')}`
        }
        return spokenReply

      case 'ADD_TASK':
        if (result?.id) return `✅ Task added: **${result.title}** ${result.deadline ? `(due ${result.deadline})` : ''} — Priority: ${result.priority}`
        return spokenReply

      case 'COMPLETE_TASK':
        if (result?.title) return `✅ Completed: **${result.title}**`
        return spokenReply

      case 'LIST_TASKS':
        if (Array.isArray(result)) {
          if (result.length === 0) return '📋 No tasks found matching that filter.'
          return `📋 **Tasks (${result.length}):**\n${result.map((t: any, i: number) =>
            `${i + 1}. ${t.status === 'completed' ? '✅' : t.status === 'overdue' ? '⚠️' : '📌'} **${t.title}** — ${t.priority} ${t.deadline ? `| Due: ${t.deadline}` : ''}`
          ).join('\n')}`
        }
        return spokenReply

      case 'ADD_LEAD':
        if (result?.id) return `🎯 Lead added: **${result.name}** @ ${result.company || 'N/A'} (${result.source})`
        return spokenReply

      case 'LIST_LEADS':
      case 'SEARCH_LEADS':
        if (Array.isArray(result)) {
          if (result.length === 0) return '🎯 No leads found.'
          return `🎯 **Leads (${result.length}):**\n${result.map((l: any, i: number) =>
            `${i + 1}. **${l.name}** — ${l.role || 'N/A'} @ ${l.company || 'N/A'} | Status: ${l.status} ${l.email ? `| 📧 ${l.email}` : ''}`
          ).join('\n')}`
        }
        return spokenReply

      case 'ADD_CONTACT':
        if (result?.id) return `👤 Contact added: **${result.name}** ${result.email ? `(${result.email})` : ''}`
        return spokenReply

      case 'LIST_CONTACTS':
        if (Array.isArray(result)) {
          if (result.length === 0) return '👤 No contacts found.'
          return `👤 **Contacts (${result.length}):**\n${result.map((c: any, i: number) =>
            `${i + 1}. **${c.name}** ${c.company ? `@ ${c.company}` : ''} ${c.email ? `| ${c.email}` : ''} ${c.phone ? `| ${c.phone}` : ''}`
          ).join('\n')}`
        }
        return spokenReply

      case 'DRAFT_EMAIL':
        return `📧 **Email Draft Created:**\n**To:** ${p.to}\n**Subject:** ${p.subject}\n**Body:**\n${p.body}\n\n⚠️ *Draft saved. Say "approve" or "send" to confirm.*`

      case 'DRAFT_WHATSAPP':
        return `💬 **WhatsApp Draft Created:**\n**To:** ${p.to}\n**Message:**\n${p.body}\n\n⚠️ *Draft saved. Say "approve" to confirm.*`

      case 'LIST_DRAFTS':
        if (Array.isArray(result)) {
          if (result.length === 0) return '📩 No drafts pending.'
          return `📩 **Drafts (${result.length}):**\n${result.map((d: any, i: number) =>
            `${i + 1}. ${d.type === 'email' ? '📧' : '💬'} To: ${d.to} | ${d.subject || d.body?.slice(0, 40)} | Status: ${d.status}`
          ).join('\n')}`
        }
        return spokenReply

      case 'DAILY_BRIEFING':
      case 'TASK_SUMMARY':
        if (typeof result === 'string') return result
        if (typeof result === 'object') {
          const b = result as any
          let brief = '📌 **Daily Briefing:**\n'
          if (b.overdueTasks?.length) brief += `⚠️ **Overdue:** ${b.overdueTasks.map((t: any) => t.title).join(', ')}\n`
          if (b.todayTasks?.length) brief += `📅 **Today:** ${b.todayTasks.map((t: any) => t.title).join(', ')}\n`
          if (b.pendingTasks?.length) brief += `📋 **Pending:** ${b.pendingTasks.map((t: any) => `${t.title} (${t.priority})`).join(', ')}\n`
          if (b.yesterdayCompleted?.length) brief += `✅ **Yesterday:** ${b.yesterdayCompleted.map((t: any) => t.title).join(', ')}\n`
          if (b.pendingDrafts?.length) brief += `📩 **Unsent drafts:** ${b.pendingDrafts.length}\n`
          if (b.recentLeads?.length) brief += `🎯 **Recent leads:** ${b.recentLeads.map((l: any) => l.name).join(', ')}\n`
          return brief || spokenReply
        }
        return spokenReply

      case 'OPEN_APP':
        return `▶️ Opening **${p.name}**...`

      case 'CLOSE_APP':
        return `⏹️ Closing **${p.name}**...`

      case 'GET_SCHEDULE':
        if (result?.events || result?.reminders) {
          let txt = '📅 **Schedule:**\n'
          if (result.events?.length) txt += result.events.map((e: any) => `• ${e.title} — ${e.date} ${e.time || ''}`).join('\n') + '\n'
          if (result.reminders?.length) txt += `🔔 **Reminders:**\n` + result.reminders.map((r: any) => `• ${r.text} — ${r.datetime}`).join('\n')
          return txt || 'No scheduled events.'
        }
        return spokenReply

      default:
        return spokenReply
    }
  } catch {
    return spokenReply
  }
}

// ── Execute action from AI JSON ──────────────────────────────────────────────
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
    case 'WEB_SEARCH': return handleWebIntelligence('search', { query: p.query as string })

    // ── Memory System Actions ──────────────────────────────────────────────
    case 'ADD_TASK': return mem.addTask(p.title as string, {
      description: p.description as string | undefined,
      deadline: (p.deadline || p.new_deadline) as string | undefined,
      priority: (p.priority as any) || 'medium'
    })
    case 'COMPLETE_TASK': return mem.completeTask(p.task_id as string)
    case 'LIST_TASKS': return mem.listTasks(p.status ? { status: p.status as any } : undefined)
    case 'RESCHEDULE_TASK': return mem.rescheduleTask(p.task_id as string, p.new_deadline as string)
    case 'TASK_SUMMARY': return mem.getTaskSummary()

    case 'ADD_LEAD': return mem.addLead({
      name: p.name as string, company: p.company as string,
      role: p.role as string, email: p.email as string,
      source: (p.source as string) || 'manual', status: 'new'
    })
    case 'LIST_LEADS': return mem.listLeads(p as any)
    case 'SEARCH_LEADS': return mem.listLeads({ query: p.query as string })

    case 'ADD_CONTACT': return mem.addContact(p.name as string, {
      email: p.email as string, phone: p.phone as string,
      company: p.company as string, whatsapp: p.whatsapp as string
    })
    case 'LIST_CONTACTS': return mem.listContacts(p.query as string)

    case 'DRAFT_EMAIL': return mem.addDraft({
      type: 'email', to: p.to as string,
      subject: p.subject as string, body: p.body as string
    })
    case 'DRAFT_WHATSAPP': return mem.addDraft({
      type: 'whatsapp', to: p.to as string, body: p.body as string
    })
    case 'LIST_DRAFTS': return mem.listDrafts(p.type ? { type: p.type as any } : undefined)
    case 'APPROVE_DRAFT': return mem.approveDraft(p.draft_id as string)

    case 'DAILY_BRIEFING': return mem.getDailyBriefingData()

    default: return { error: `Unknown action: ${action.action}` }
  }
}
