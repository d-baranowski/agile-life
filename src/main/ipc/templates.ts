import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type {
  TemplateGroup,
  TicketTemplate,
  TemplateGroupInput,
  TicketTemplateInput,
  GenerateCardsResult
} from '@shared/template.types'
import {
  getTemplateGroups,
  createTemplateGroup,
  updateTemplateGroup,
  deleteTemplateGroup,
  getTemplatesByGroup,
  createTicketTemplate,
  updateTicketTemplate,
  deleteTicketTemplate,
  getBoardById,
  upsertCards
} from '../database/db'
import { TrelloClient } from '../trello/client'

/** Supported mustache-style placeholders and their resolved values at call time. */
function resolvePlaceholders(template: string, now: Date): string {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthPadded = String(month).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const date = `${year}-${monthPadded}-${day}`

  // ISO-like week number: count Mondays since Jan 1.
  // SQLite %W (used elsewhere in the codebase) uses Sunday-based weeks;
  // here we use Monday-based week numbering for a user-friendly "sprint week".
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000)
  const startDow = startOfYear.getDay() // 0=Sun … 6=Sat
  // Shift so Monday=0
  const adjustedDow = (startDow + 6) % 7
  const weekNumber = Math.floor((dayOfYear + adjustedDow) / 7) + 1
  const week = String(weekNumber).padStart(2, '0')

  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]
  const monthName = MONTH_NAMES[month - 1]

  return template
    .replace(/\{\{year\}\}/g, String(year))
    .replace(/\{\{month\}\}/g, monthPadded)
    .replace(/\{\{month_name\}\}/g, monthName)
    .replace(/\{\{week\}\}/g, week)
    .replace(/\{\{date\}\}/g, date)
}

export function registerTemplateHandlers(): void {
  // ── TEMPLATES_GET_GROUPS ───────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES_GET_GROUPS,
    async (_e, boardId: string): Promise<IpcResult<TemplateGroup[]>> => {
      try {
        return { success: true, data: getTemplateGroups(boardId) }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── TEMPLATES_CREATE_GROUP ─────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES_CREATE_GROUP,
    async (_e, boardId: string, input: TemplateGroupInput): Promise<IpcResult<TemplateGroup>> => {
      try {
        if (!input.name?.trim()) {
          return { success: false, error: 'Group name is required.' }
        }
        return { success: true, data: createTemplateGroup(boardId, { name: input.name.trim() }) }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── TEMPLATES_UPDATE_GROUP ─────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES_UPDATE_GROUP,
    async (
      _e,
      boardId: string,
      id: number,
      input: TemplateGroupInput
    ): Promise<IpcResult<void>> => {
      try {
        if (!input.name?.trim()) {
          return { success: false, error: 'Group name is required.' }
        }
        const updated = updateTemplateGroup(boardId, id, { name: input.name.trim() })
        if (!updated) return { success: false, error: 'Group not found.' }
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── TEMPLATES_DELETE_GROUP ─────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES_DELETE_GROUP,
    async (_e, boardId: string, id: number): Promise<IpcResult<void>> => {
      try {
        const deleted = deleteTemplateGroup(boardId, id)
        if (!deleted) return { success: false, error: 'Group not found.' }
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── TEMPLATES_GET ──────────────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES_GET,
    async (_e, boardId: string, groupId: number): Promise<IpcResult<TicketTemplate[]>> => {
      try {
        return { success: true, data: getTemplatesByGroup(boardId, groupId) }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── TEMPLATES_CREATE ───────────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES_CREATE,
    async (_e, boardId: string, input: TicketTemplateInput): Promise<IpcResult<TicketTemplate>> => {
      try {
        if (!input.titleTemplate?.trim()) {
          return { success: false, error: 'Title template is required.' }
        }
        if (!input.listId) {
          return { success: false, error: 'Target list is required.' }
        }
        return { success: true, data: createTicketTemplate(boardId, input) }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── TEMPLATES_UPDATE ───────────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES_UPDATE,
    async (
      _e,
      boardId: string,
      id: number,
      input: TicketTemplateInput
    ): Promise<IpcResult<void>> => {
      try {
        if (!input.titleTemplate?.trim()) {
          return { success: false, error: 'Title template is required.' }
        }
        if (!input.listId) {
          return { success: false, error: 'Target list is required.' }
        }
        const updated = updateTicketTemplate(boardId, id, input)
        if (!updated) return { success: false, error: 'Template not found.' }
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── TEMPLATES_DELETE ───────────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES_DELETE,
    async (_e, boardId: string, id: number): Promise<IpcResult<void>> => {
      try {
        const deleted = deleteTicketTemplate(boardId, id)
        if (!deleted) return { success: false, error: 'Template not found.' }
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── TEMPLATES_GENERATE_CARDS ───────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES_GENERATE_CARDS,
    async (_e, boardId: string, groupId: number): Promise<IpcResult<GenerateCardsResult>> => {
      try {
        const board = getBoardById(boardId)
        if (!board) return { success: false, error: `Board not found: ${boardId}` }

        const templates = getTemplatesByGroup(boardId, groupId)
        if (templates.length === 0) {
          return { success: false, error: 'No templates in this group.' }
        }

        const client = new TrelloClient(board.apiKey, board.apiToken)
        const now = new Date()
        let created = 0
        let failed = 0
        const errors: string[] = []

        for (const tmpl of templates) {
          try {
            const title = resolvePlaceholders(tmpl.titleTemplate, now)
            const desc = tmpl.descTemplate ? resolvePlaceholders(tmpl.descTemplate, now) : undefined

            const card = await client.createCard(tmpl.listId, title, desc)

            // Persist to local cache so the kanban board reflects the new card
            // immediately (without needing a full sync).
            upsertCards(boardId, [card])

            created++
          } catch (err) {
            failed++
            errors.push(`"${tmpl.name}": ${String(err)}`)
          }
        }

        return { success: true, data: { created, failed, errors } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
