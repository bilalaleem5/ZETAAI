/**
 * memoryStore.ts — Persistent memory system for ZETA AI
 * Stores tasks, contacts, leads, messages, preferences, history
 * Uses electron-store for encrypted local persistence
 */

interface Task {
  id: string
  title: string
  description?: string
  deadline?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  createdAt: string
  completedAt?: string
  tags?: string[]
}

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  whatsapp?: string
  company?: string
  role?: string
  notes?: string
  createdAt: string
}

interface Lead {
  id: string
  name: string
  company?: string
  role?: string
  email?: string
  phone?: string
  source: string
  sourceUrl?: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  notes?: string
  createdAt: string
  updatedAt: string
}

interface MessageDraft {
  id: string
  type: 'email' | 'whatsapp'
  to: string
  subject?: string
  body: string
  status: 'draft' | 'approved' | 'sent'
  createdAt: string
  sentAt?: string
  contactId?: string
  leadId?: string
}

interface UserPreference {
  key: string
  value: unknown
  updatedAt: string
}

interface HistoryEntry {
  id: string
  action: string
  details: string
  timestamp: string
  category: 'task' | 'communication' | 'search' | 'system' | 'crm'
}

interface MemoryState {
  tasks: Task[]
  contacts: Contact[]
  leads: Lead[]
  messageDrafts: MessageDraft[]
  preferences: UserPreference[]
  history: HistoryEntry[]
}

let store: any = null

function getStore() {
  if (!store) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Store = require('electron-store')
    store = new Store({
      name: 'zeta-memory',
      encryptionKey: 'zeta-memory-v1',
      defaults: {
        tasks: [],
        contacts: [],
        leads: [],
        messageDrafts: [],
        preferences: [],
        history: []
      } as MemoryState
    })
  }
  return store
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function now(): string {
  return new Date().toISOString()
}

// ── Tasks ────────────────────────────────────────────────────────────────────
export function addTask(title: string, opts?: { description?: string; deadline?: string; priority?: Task['priority']; tags?: string[] }): Task {
  const s = getStore()
  const task: Task = {
    id: `task_${uid()}`,
    title,
    description: opts?.description,
    deadline: opts?.deadline,
    priority: opts?.priority || 'medium',
    status: 'pending',
    createdAt: now(),
    tags: opts?.tags
  }
  const tasks = s.get('tasks') as Task[]
  tasks.push(task)
  s.set('tasks', tasks)
  logHistory('task', 'add_task', `Added: ${title}`)
  return task
}

export function completeTask(taskId: string): Task | null {
  const s = getStore()
  const tasks = s.get('tasks') as Task[]
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx === -1) return null
  tasks[idx].status = 'completed'
  tasks[idx].completedAt = now()
  s.set('tasks', tasks)
  logHistory('task', 'complete_task', `Completed: ${tasks[idx].title}`)
  return tasks[idx]
}

export function listTasks(filter?: { status?: Task['status']; priority?: Task['priority'] }): Task[] {
  const s = getStore()
  let tasks = s.get('tasks') as Task[]
  // Auto-detect overdue
  const today = new Date().toISOString().split('T')[0]
  tasks = tasks.map(t => {
    if (t.status === 'pending' && t.deadline && t.deadline < today) {
      return { ...t, status: 'overdue' as const }
    }
    return t
  })
  s.set('tasks', tasks)
  if (filter?.status) tasks = tasks.filter(t => t.status === filter.status)
  if (filter?.priority) tasks = tasks.filter(t => t.priority === filter.priority)
  return tasks
}

export function rescheduleTask(taskId: string, newDeadline: string): Task | null {
  const s = getStore()
  const tasks = s.get('tasks') as Task[]
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx === -1) return null
  tasks[idx].deadline = newDeadline
  if (tasks[idx].status === 'overdue') tasks[idx].status = 'pending'
  s.set('tasks', tasks)
  logHistory('task', 'reschedule_task', `Rescheduled: ${tasks[idx].title} → ${newDeadline}`)
  return tasks[idx]
}

export function deleteTask(taskId: string): boolean {
  const s = getStore()
  const tasks = s.get('tasks') as Task[]
  const filtered = tasks.filter(t => t.id !== taskId)
  if (filtered.length === tasks.length) return false
  s.set('tasks', filtered)
  return true
}

export function getOverdueTasks(): Task[] {
  return listTasks({ status: 'overdue' })
}

export function getPendingTasks(): Task[] {
  return listTasks({ status: 'pending' })
}

export function getTaskSummary(): string {
  const all = listTasks()
  const pending = all.filter(t => t.status === 'pending')
  const overdue = all.filter(t => t.status === 'overdue')
  const today = new Date().toISOString().split('T')[0]
  const completedToday = all.filter(t => t.completedAt?.startsWith(today))
  const dueToday = all.filter(t => t.deadline?.startsWith(today) && t.status !== 'completed')

  let summary = `📋 Tasks: ${pending.length} pending, ${overdue.length} overdue\n`
  if (dueToday.length > 0) summary += `📅 Due today: ${dueToday.map(t => t.title).join(', ')}\n`
  if (overdue.length > 0) summary += `⚠️ Overdue: ${overdue.map(t => `${t.title} (was due ${t.deadline})`).join(', ')}\n`
  if (completedToday.length > 0) summary += `✅ Completed today: ${completedToday.map(t => t.title).join(', ')}\n`
  return summary
}

// ── Contacts ─────────────────────────────────────────────────────────────────
export function addContact(name: string, opts?: Partial<Omit<Contact, 'id' | 'name' | 'createdAt'>>): Contact {
  const s = getStore()
  const contact: Contact = { id: `contact_${uid()}`, name, ...opts, createdAt: now() }
  const contacts = s.get('contacts') as Contact[]
  contacts.push(contact)
  s.set('contacts', contacts)
  logHistory('crm', 'add_contact', `Added contact: ${name}`)
  return contact
}

export function listContacts(query?: string): Contact[] {
  const s = getStore()
  let contacts = s.get('contacts') as Contact[]
  if (query) {
    const q = query.toLowerCase()
    contacts = contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    )
  }
  return contacts
}

export function updateContact(id: string, updates: Partial<Omit<Contact, 'id' | 'createdAt'>>): Contact | null {
  const s = getStore()
  const contacts = s.get('contacts') as Contact[]
  const idx = contacts.findIndex(c => c.id === id)
  if (idx === -1) return null
  contacts[idx] = { ...contacts[idx], ...updates }
  s.set('contacts', contacts)
  return contacts[idx]
}

export function deleteContact(id: string): boolean {
  const s = getStore()
  const contacts = s.get('contacts') as Contact[]
  const filtered = contacts.filter(c => c.id !== id)
  if (filtered.length === contacts.length) return false
  s.set('contacts', filtered)
  return true
}

// ── Leads ────────────────────────────────────────────────────────────────────
export function addLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead {
  const s = getStore()
  const lead: Lead = { id: `lead_${uid()}`, ...data, createdAt: now(), updatedAt: now() }
  const leads = s.get('leads') as Lead[]
  leads.push(lead)
  s.set('leads', leads)
  logHistory('crm', 'add_lead', `New lead: ${data.name} @ ${data.company || 'N/A'}`)
  return lead
}

export function listLeads(filter?: { status?: Lead['status']; query?: string }): Lead[] {
  const s = getStore()
  let leads = s.get('leads') as Lead[]
  if (filter?.status) leads = leads.filter(l => l.status === filter.status)
  if (filter?.query) {
    const q = filter.query.toLowerCase()
    leads = leads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.role?.toLowerCase().includes(q)
    )
  }
  return leads
}

export function updateLead(id: string, updates: Partial<Omit<Lead, 'id' | 'createdAt'>>): Lead | null {
  const s = getStore()
  const leads = s.get('leads') as Lead[]
  const idx = leads.findIndex(l => l.id === id)
  if (idx === -1) return null
  leads[idx] = { ...leads[idx], ...updates, updatedAt: now() }
  s.set('leads', leads)
  return leads[idx]
}

export function deleteLead(id: string): boolean {
  const s = getStore()
  const leads = s.get('leads') as Lead[]
  const filtered = leads.filter(l => l.id !== id)
  if (filtered.length === leads.length) return false
  s.set('leads', filtered)
  return true
}

export function getLeadSummary(): string {
  const leads = listLeads()
  const byStatus: Record<string, number> = {}
  leads.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1 })
  return `🎯 Leads: ${leads.length} total — ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}`
}

// ── Message Drafts ───────────────────────────────────────────────────────────
export function addDraft(data: Omit<MessageDraft, 'id' | 'createdAt' | 'status'>): MessageDraft {
  const s = getStore()
  const draft: MessageDraft = { id: `draft_${uid()}`, ...data, status: 'draft', createdAt: now() }
  const drafts = s.get('messageDrafts') as MessageDraft[]
  drafts.push(draft)
  s.set('messageDrafts', drafts)
  logHistory('communication', 'draft_created', `${data.type} draft to ${data.to}`)
  return draft
}

export function listDrafts(filter?: { type?: 'email' | 'whatsapp'; status?: MessageDraft['status'] }): MessageDraft[] {
  const s = getStore()
  let drafts = s.get('messageDrafts') as MessageDraft[]
  if (filter?.type) drafts = drafts.filter(d => d.type === filter.type)
  if (filter?.status) drafts = drafts.filter(d => d.status === filter.status)
  return drafts
}

export function approveDraft(id: string): MessageDraft | null {
  const s = getStore()
  const drafts = s.get('messageDrafts') as MessageDraft[]
  const idx = drafts.findIndex(d => d.id === id)
  if (idx === -1) return null
  drafts[idx].status = 'approved'
  s.set('messageDrafts', drafts)
  logHistory('communication', 'draft_approved', `Approved: ${drafts[idx].type} to ${drafts[idx].to}`)
  return drafts[idx]
}

export function deleteDraft(id: string): boolean {
  const s = getStore()
  const drafts = s.get('messageDrafts') as MessageDraft[]
  const filtered = drafts.filter(d => d.id !== id)
  if (filtered.length === drafts.length) return false
  s.set('messageDrafts', filtered)
  return true
}

// ── Preferences ──────────────────────────────────────────────────────────────
export function setPreference(key: string, value: unknown): void {
  const s = getStore()
  const prefs = s.get('preferences') as UserPreference[]
  const idx = prefs.findIndex(p => p.key === key)
  if (idx >= 0) { prefs[idx] = { key, value, updatedAt: now() } }
  else { prefs.push({ key, value, updatedAt: now() }) }
  s.set('preferences', prefs)
}

export function getPreference(key: string): unknown {
  const s = getStore()
  const prefs = s.get('preferences') as UserPreference[]
  return prefs.find(p => p.key === key)?.value
}

// ── History ──────────────────────────────────────────────────────────────────
export function logHistory(category: HistoryEntry['category'], action: string, details: string): void {
  const s = getStore()
  const history = s.get('history') as HistoryEntry[]
  history.push({ id: `hist_${uid()}`, action, details, timestamp: now(), category })
  // Keep only last 500 entries
  if (history.length > 500) history.splice(0, history.length - 500)
  s.set('history', history)
}

export function getRecentHistory(count = 20, category?: HistoryEntry['category']): HistoryEntry[] {
  const s = getStore()
  let history = s.get('history') as HistoryEntry[]
  if (category) history = history.filter(h => h.category === category)
  return history.slice(-count)
}

// ── Full Memory Context (for AI) ─────────────────────────────────────────────
export function getFullMemoryContext(): string {
  const tasks = getTaskSummary()
  const leads = getLeadSummary()
  const pendingDrafts = listDrafts({ status: 'draft' })
  const recentHistory = getRecentHistory(10)

  let ctx = `[MEMORY CONTEXT]\n${tasks}\n${leads}\n`
  if (pendingDrafts.length > 0) {
    ctx += `📩 Pending drafts: ${pendingDrafts.length} (${pendingDrafts.map(d => `${d.type} to ${d.to}`).join(', ')})\n`
  }
  if (recentHistory.length > 0) {
    ctx += `📜 Recent: ${recentHistory.slice(-5).map(h => h.details).join(' | ')}\n`
  }
  return ctx
}

// ── Daily Briefing Data ──────────────────────────────────────────────────────
export function getDailyBriefingData(): {
  overdueTasks: Task[]
  todayTasks: Task[]
  pendingTasks: Task[]
  recentLeads: Lead[]
  pendingDrafts: MessageDraft[]
  yesterdayCompleted: Task[]
} {
  const all = listTasks()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  return {
    overdueTasks: all.filter(t => t.status === 'overdue'),
    todayTasks: all.filter(t => t.deadline?.startsWith(today) && t.status !== 'completed'),
    pendingTasks: all.filter(t => t.status === 'pending').slice(0, 10),
    recentLeads: listLeads().slice(-5),
    pendingDrafts: listDrafts({ status: 'draft' }),
    yesterdayCompleted: all.filter(t => t.completedAt?.startsWith(yesterday))
  }
}

export type { Task, Contact, Lead, MessageDraft, UserPreference, HistoryEntry }
