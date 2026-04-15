import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

export interface CalendarEvent {
  id: string
  title: string
  date: string // ISO date string
  time?: string // HH:mm
  description?: string
  recurring?: 'daily' | 'weekly' | 'monthly' | 'none'
  reminder?: number // minutes before
  createdAt: number
}

export interface Reminder {
  id: string
  text: string
  datetime: string // ISO datetime
  completed: boolean
  createdAt: number
}

const DATA_DIR = path.join(os.homedir(), 'ZetaAI', 'data')
const EVENTS_FILE = path.join(DATA_DIR, 'events.json')
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json')

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function loadEvents(): Promise<CalendarEvent[]> {
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveEvents(events: CalendarEvent[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2))
}

async function loadReminders(): Promise<Reminder[]> {
  try {
    const data = await fs.readFile(REMINDERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveReminders(reminders: Reminder[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminders, null, 2))
}

export async function handleCalendar(
  action: 'list' | 'add' | 'delete' | 'today' | 'upcoming',
  payload: {
    event?: Partial<CalendarEvent>
    id?: string
    date?: string
    days?: number
  }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (action) {
      case 'list': {
        const events = await loadEvents()
        return { success: true, data: events }
      }

      case 'add': {
        const events = await loadEvents()
        const newEvent: CalendarEvent = {
          id: `evt_${Date.now()}`,
          title: payload.event?.title || 'Untitled Event',
          date: payload.event?.date || new Date().toISOString().split('T')[0],
          time: payload.event?.time,
          description: payload.event?.description,
          recurring: payload.event?.recurring || 'none',
          reminder: payload.event?.reminder,
          createdAt: Date.now()
        }
        events.push(newEvent)
        await saveEvents(events)
        return { success: true, data: newEvent }
      }

      case 'delete': {
        const events = await loadEvents()
        const filtered = events.filter((e) => e.id !== payload.id)
        await saveEvents(filtered)
        return { success: true, data: { deleted: payload.id } }
      }

      case 'today': {
        const events = await loadEvents()
        const today = new Date().toISOString().split('T')[0]
        const todayEvents = events.filter((e) => e.date === today)
        return { success: true, data: todayEvents }
      }

      case 'upcoming': {
        const events = await loadEvents()
        const now = new Date()
        const days = payload.days || 7
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        const upcoming = events
          .filter((e) => {
            const d = new Date(e.date)
            return d >= now && d <= future
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        return { success: true, data: upcoming }
      }

      default:
        return { success: false, error: `Unknown calendar action: ${action}` }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    return { success: false, error: errMsg }
  }
}

export async function handleReminders(
  action: 'list' | 'add' | 'complete' | 'delete' | 'upcoming',
  payload: {
    text?: string
    datetime?: string
    id?: string
  }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (action) {
      case 'list': {
        const reminders = await loadReminders()
        return { success: true, data: reminders.filter((r) => !r.completed) }
      }

      case 'add': {
        const reminders = await loadReminders()
        const newReminder: Reminder = {
          id: `rem_${Date.now()}`,
          text: payload.text || 'Untitled Reminder',
          datetime: payload.datetime || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          completed: false,
          createdAt: Date.now()
        }
        reminders.push(newReminder)
        await saveReminders(reminders)
        return { success: true, data: newReminder }
      }

      case 'complete': {
        const reminders = await loadReminders()
        const updated = reminders.map((r) =>
          r.id === payload.id ? { ...r, completed: true } : r
        )
        await saveReminders(updated)
        return { success: true, data: { completed: payload.id } }
      }

      case 'delete': {
        const reminders = await loadReminders()
        const filtered = reminders.filter((r) => r.id !== payload.id)
        await saveReminders(filtered)
        return { success: true, data: { deleted: payload.id } }
      }

      case 'upcoming': {
        const reminders = await loadReminders()
        const now = Date.now()
        const upcoming = reminders
          .filter((r) => !r.completed && new Date(r.datetime).getTime() >= now)
          .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
          .slice(0, 10)
        return { success: true, data: upcoming }
      }

      default:
        return { success: false, error: `Unknown reminder action: ${action}` }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    return { success: false, error: errMsg }
  }
}

// Format events/reminders for AI
export function formatScheduleForAI(events: CalendarEvent[], reminders: Reminder[]): string {
  const parts: string[] = []

  if (events.length > 0) {
    parts.push('EVENTS:\n' + events.map((e) => `- ${e.time ? e.time + ' ' : ''}${e.title} (${e.date})`).join('\n'))
  }
  if (reminders.length > 0) {
    parts.push('REMINDERS:\n' + reminders.map((r) => `- ${r.text} at ${new Date(r.datetime).toLocaleString()}`).join('\n'))
  }

  return parts.join('\n\n') || 'No upcoming events or reminders.'
}
