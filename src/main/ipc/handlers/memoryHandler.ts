/**
 * memoryHandler.ts — IPC handlers for ZETA memory system
 * Tasks, Contacts, Leads, Drafts, History
 */
import { IpcMain } from 'electron'
import * as mem from '../../memory/memoryStore'

export function registerMemoryHandlers(ipcMain: IpcMain): void {
  // ── Tasks ────────────────────────────────────────────────────────────────
  ipcMain.handle('memory:add-task', (_, p) => {
    try {
      const task = mem.addTask(p.title, { description: p.description, deadline: p.deadline, priority: p.priority, tags: p.tags })
      return { success: true, data: task }
    } catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('memory:complete-task', (_, p) => {
    const task = mem.completeTask(p.taskId)
    return task ? { success: true, data: task } : { success: false, error: 'Task not found' }
  })

  ipcMain.handle('memory:list-tasks', (_, p) => {
    return { success: true, data: mem.listTasks(p || {}) }
  })

  ipcMain.handle('memory:reschedule-task', (_, p) => {
    const task = mem.rescheduleTask(p.taskId, p.newDeadline)
    return task ? { success: true, data: task } : { success: false, error: 'Task not found' }
  })

  ipcMain.handle('memory:delete-task', (_, p) => {
    return { success: mem.deleteTask(p.taskId) }
  })

  ipcMain.handle('memory:task-summary', () => {
    return { success: true, data: mem.getTaskSummary() }
  })

  // ── Contacts ─────────────────────────────────────────────────────────────
  ipcMain.handle('memory:add-contact', (_, p) => {
    const contact = mem.addContact(p.name, p)
    return { success: true, data: contact }
  })

  ipcMain.handle('memory:list-contacts', (_, p) => {
    return { success: true, data: mem.listContacts(p?.query) }
  })

  ipcMain.handle('memory:update-contact', (_, p) => {
    const contact = mem.updateContact(p.id, p.updates)
    return contact ? { success: true, data: contact } : { success: false, error: 'Contact not found' }
  })

  ipcMain.handle('memory:delete-contact', (_, p) => {
    return { success: mem.deleteContact(p.id) }
  })

  // ── Leads ────────────────────────────────────────────────────────────────
  ipcMain.handle('memory:add-lead', (_, p) => {
    const lead = mem.addLead(p)
    return { success: true, data: lead }
  })

  ipcMain.handle('memory:list-leads', (_, p) => {
    return { success: true, data: mem.listLeads(p || {}) }
  })

  ipcMain.handle('memory:update-lead', (_, p) => {
    const lead = mem.updateLead(p.id, p.updates)
    return lead ? { success: true, data: lead } : { success: false, error: 'Lead not found' }
  })

  ipcMain.handle('memory:delete-lead', (_, p) => {
    return { success: mem.deleteLead(p.id) }
  })

  ipcMain.handle('memory:lead-summary', () => {
    return { success: true, data: mem.getLeadSummary() }
  })

  // ── Drafts ───────────────────────────────────────────────────────────────
  ipcMain.handle('memory:add-draft', (_, p) => {
    const draft = mem.addDraft(p)
    return { success: true, data: draft }
  })

  ipcMain.handle('memory:list-drafts', (_, p) => {
    return { success: true, data: mem.listDrafts(p || {}) }
  })

  ipcMain.handle('memory:approve-draft', (_, p) => {
    const draft = mem.approveDraft(p.id)
    return draft ? { success: true, data: draft } : { success: false, error: 'Draft not found' }
  })

  ipcMain.handle('memory:delete-draft', (_, p) => {
    return { success: mem.deleteDraft(p.id) }
  })

  // ── Memory Context ───────────────────────────────────────────────────────
  ipcMain.handle('memory:full-context', () => {
    return { success: true, data: mem.getFullMemoryContext() }
  })

  ipcMain.handle('memory:daily-briefing', () => {
    return { success: true, data: mem.getDailyBriefingData() }
  })

  ipcMain.handle('memory:history', (_, p) => {
    return { success: true, data: mem.getRecentHistory(p?.count || 20, p?.category) }
  })

  // ── Preferences ──────────────────────────────────────────────────────────
  ipcMain.handle('memory:set-preference', (_, p) => {
    mem.setPreference(p.key, p.value)
    return { success: true }
  })

  ipcMain.handle('memory:get-preference', (_, p) => {
    return { success: true, data: mem.getPreference(p.key) }
  })
}
