import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const DATA_DIR = path.join(os.homedir(), 'ZetaAI', 'memory')
const FILES = {
  tasks:    path.join(DATA_DIR, 'tasks.json'),
  contacts: path.join(DATA_DIR, 'contacts.json'),
  leads:    path.join(DATA_DIR, 'leads.json'),
  drafts:   path.join(DATA_DIR, 'drafts.json'),
  prefs:    path.join(DATA_DIR, 'prefs.json'),
  logs:     path.join(DATA_DIR, 'logs.json'),
}

async function ensureDir() { await fs.mkdir(DATA_DIR, { recursive: true }) }
async function read<T>(file: string): Promise<T[]> {
  try { return JSON.parse(await fs.readFile(file, 'utf-8')) } catch { return [] }
}
async function write(file: string, data: unknown) {
  await ensureDir(); await fs.writeFile(file, JSON.stringify(data, null, 2))
}

// ── Tasks ──────────────────────────────────────────────────────────────────
export interface Task {
  id: string; title: string; deadline?: string; priority: 'high'|'medium'|'low'
  status: 'pending'|'completed'|'overdue'; createdAt: string; completedAt?: string; notes?: string
}

export const TaskEngine = {
  async list(filter?: Partial<Task>): Promise<Task[]> {
    const tasks = await read<Task>(FILES.tasks)
    // Auto-detect overdue
    const now = new Date()
    return tasks
      .map(t => t.deadline && new Date(t.deadline) < now && t.status === 'pending'
        ? { ...t, status: 'overdue' as const } : t)
      .filter(t => !filter || Object.entries(filter).every(([k,v]) => t[k as keyof Task] === v))
  },
  async add(task: Omit<Task,'id'|'createdAt'|'status'>): Promise<Task> {
    const tasks = await read<Task>(FILES.tasks)
    const t: Task = { ...task, id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'pending' }
    await write(FILES.tasks, [...tasks, t]); return t
  },
  async complete(id: string): Promise<boolean> {
    const tasks = await read<Task>(FILES.tasks)
    const idx = tasks.findIndex(t => t.id === id)
    if (idx < 0) return false
    tasks[idx] = { ...tasks[idx], status: 'completed', completedAt: new Date().toISOString() }
    await write(FILES.tasks, tasks); return true
  },
  async delete(id: string): Promise<boolean> {
    const tasks = await read<Task>(FILES.tasks)
    const filtered = tasks.filter(t => t.id !== id)
    await write(FILES.tasks, filtered); return filtered.length < tasks.length
  },
  async summary(): Promise<string> {
    const all = await this.list()
    const pending  = all.filter(t => t.status === 'pending')
    const overdue  = all.filter(t => t.status === 'overdue')
    const done     = all.filter(t => t.status === 'completed')
    return `📋 Tasks: ${pending.length} pending, ${overdue.length} overdue, ${done.length} completed\n` +
      (overdue.length  ? `⚠️ Overdue: ${overdue.map(t=>t.title).join(', ')}\n` : '') +
      (pending.length  ? `📌 Pending: ${pending.slice(0,3).map(t=>t.title).join(', ')}` : '')
  }
}

// ── Contacts ───────────────────────────────────────────────────────────────
export interface Contact {
  id: string; name: string; email?: string; whatsapp?: string; company?: string; notes?: string; createdAt: string
}

export const ContactStore = {
  async list(): Promise<Contact[]> { return read<Contact>(FILES.contacts) },
  async add(c: Omit<Contact,'id'|'createdAt'>): Promise<Contact> {
    const contacts = await read<Contact>(FILES.contacts)
    const contact: Contact = { ...c, id: Date.now().toString(), createdAt: new Date().toISOString() }
    await write(FILES.contacts, [...contacts, contact]); return contact
  },
  async find(query: string): Promise<Contact[]> {
    const all = await this.list()
    const q = query.toLowerCase()
    return all.filter(c => c.name.toLowerCase().includes(q) || c.email?.includes(q) || c.company?.toLowerCase().includes(q))
  }
}

// ── Leads / CRM ────────────────────────────────────────────────────────────
export interface Lead {
  id: string; name: string; company?: string; role?: string; email?: string
  whatsapp?: string; source?: string; status: 'new'|'contacted'|'responded'|'converted'|'lost'
  notes?: string; createdAt: string
}

export const CRMStore = {
  async list(status?: Lead['status']): Promise<Lead[]> {
    const leads = await read<Lead>(FILES.leads)
    return status ? leads.filter(l => l.status === status) : leads
  },
  async add(l: Omit<Lead,'id'|'createdAt'|'status'>): Promise<Lead> {
    const leads = await read<Lead>(FILES.leads)
    const lead: Lead = { ...l, id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'new' }
    await write(FILES.leads, [...leads, lead]); return lead
  },
  async updateStatus(id: string, status: Lead['status']): Promise<boolean> {
    const leads = await read<Lead>(FILES.leads)
    const idx = leads.findIndex(l => l.id === id)
    if (idx < 0) return false
    leads[idx] = { ...leads[idx], status }
    await write(FILES.leads, leads); return true
  }
}

// ── Drafts (Email/WhatsApp) ────────────────────────────────────────────────
export interface Draft {
  id: string; type: 'email'|'whatsapp'; to: string; subject?: string
  body: string; status: 'draft'|'sent'; createdAt: string
}

export const DraftStore = {
  async list(): Promise<Draft[]> { return read<Draft>(FILES.drafts) },
  async save(d: Omit<Draft,'id'|'createdAt'|'status'>): Promise<Draft> {
    const drafts = await read<Draft>(FILES.drafts)
    const draft: Draft = { ...d, id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'draft' }
    await write(FILES.drafts, [...drafts, draft]); return draft
  },
  async markSent(id: string): Promise<boolean> {
    const drafts = await read<Draft>(FILES.drafts)
    const idx = drafts.findIndex(d => d.id === id)
    if (idx < 0) return false
    drafts[idx] = { ...drafts[idx], status: 'sent' }
    await write(FILES.drafts, drafts); return true
  }
}

// ── Daily Briefing ─────────────────────────────────────────────────────────
export async function getDailyBriefing(): Promise<string> {
  const taskSummary = await TaskEngine.summary()
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return `🌅 Good ${now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'}!\n📅 ${date} | ${time}\n\n${taskSummary}`
}
