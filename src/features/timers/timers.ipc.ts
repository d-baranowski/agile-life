import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { IPC_CHANNELS } from '../ipc/ipc.types'
import type { IpcResult } from '../ipc/ipc.types'
import {
  getBoardById,
  insertTimerEntry,
  updateTimerEntryRow,
  deleteTimerEntryRow,
  getTimerEntriesByCard,
  getActiveTimerEntriesByBoard,
  getTimerEntryById
} from '../../database/db'
import type { CardTimerEntry } from './timer.types'
import { TrelloClient } from '../../trello/client'
import log from '../../lib/logs/logger'

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rem = s % 60
  if (h > 0) return `${h}h ${m}m ${rem}s`
  if (m > 0) return `${m}m ${rem}s`
  return `${rem}s`
}

function buildCommentBody(entry: CardTimerEntry): string {
  const lines: string[] = []
  lines.push(`⏱ [timer:${entry.id}]`)
  lines.push(`Started:  ${entry.startedAt}`)
  if (entry.stoppedAt) {
    lines.push(`Stopped:  ${entry.stoppedAt}`)
    lines.push(`Duration: ${formatDuration(entry.durationSeconds)}`)
  } else {
    lines.push(`Status:   running`)
  }
  if (entry.note.trim()) lines.push(`Note:     ${entry.note.trim()}`)
  return lines.join('\n')
}

async function syncCommentForEntry(
  entry: CardTimerEntry,
  client: TrelloClient
): Promise<string | null> {
  const body = buildCommentBody(entry)
  try {
    if (entry.trelloCommentId) {
      await client.updateCardComment(entry.cardId, entry.trelloCommentId, body)
      return entry.trelloCommentId
    }
    const created = await client.createCardComment(entry.cardId, body)
    return created.id
  } catch (err) {
    log.warn(`[timers] failed to sync Trello comment for entry=${entry.id}:`, err)
    return entry.trelloCommentId
  }
}

export function registerTimerHandlers(): void {
  // ── Start a new timer ──────────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.TIMERS_START,
    async (
      _e,
      boardId: string,
      cardId: string,
      note: string
    ): Promise<IpcResult<CardTimerEntry>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board not found: ${boardId}` }

        const entry: CardTimerEntry = {
          id: randomUUID(),
          boardId,
          cardId,
          startedAt: new Date().toISOString(),
          stoppedAt: null,
          durationSeconds: 0,
          note,
          trelloCommentId: null,
          createdAt: '',
          updatedAt: ''
        }
        insertTimerEntry(entry)

        const client = new TrelloClient(config.apiKey, config.apiToken)
        const commentId = await syncCommentForEntry(entry, client)
        if (commentId && commentId !== entry.trelloCommentId) {
          updateTimerEntryRow(entry.id, {
            startedAt: entry.startedAt,
            stoppedAt: entry.stoppedAt,
            durationSeconds: entry.durationSeconds,
            note: entry.note,
            trelloCommentId: commentId
          })
          entry.trelloCommentId = commentId
        }

        const stored = getTimerEntryById(entry.id)
        log.info(`[timers] started entry=${entry.id} card=${cardId}`)
        return { success: true, data: stored ?? entry }
      } catch (err) {
        log.error(`[timers] start failed card=${cardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Stop a running timer ───────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.TIMERS_STOP,
    async (_e, entryId: string): Promise<IpcResult<CardTimerEntry>> => {
      try {
        const existing = getTimerEntryById(entryId)
        if (!existing) return { success: false, error: `Timer entry not found: ${entryId}` }

        const config = getBoardById(existing.boardId)
        if (!config) return { success: false, error: `Board not found: ${existing.boardId}` }

        const stoppedAt = new Date().toISOString()
        const durationSeconds = Math.max(
          0,
          Math.round(
            (new Date(stoppedAt).getTime() - new Date(existing.startedAt).getTime()) / 1000
          )
        )

        updateTimerEntryRow(entryId, {
          startedAt: existing.startedAt,
          stoppedAt,
          durationSeconds,
          note: existing.note,
          trelloCommentId: existing.trelloCommentId
        })

        const stopped = { ...existing, stoppedAt, durationSeconds }
        const client = new TrelloClient(config.apiKey, config.apiToken)
        const commentId = await syncCommentForEntry(stopped, client)
        if (commentId !== existing.trelloCommentId) {
          updateTimerEntryRow(entryId, {
            startedAt: existing.startedAt,
            stoppedAt,
            durationSeconds,
            note: existing.note,
            trelloCommentId: commentId
          })
        }

        const updated = getTimerEntryById(entryId)!
        log.info(`[timers] stopped entry=${entryId} duration=${durationSeconds}s`)
        return { success: true, data: updated }
      } catch (err) {
        log.error(`[timers] stop failed entry=${entryId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── List entries for a card ────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.TIMERS_LIST_FOR_CARD,
    async (_e, cardId: string): Promise<IpcResult<CardTimerEntry[]>> => {
      try {
        return { success: true, data: getTimerEntriesByCard(cardId) }
      } catch (err) {
        log.error(`[timers] listForCard failed card=${cardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── List currently-running entries on a board ─────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.TIMERS_LIST_ACTIVE,
    async (_e, boardId: string): Promise<IpcResult<CardTimerEntry[]>> => {
      try {
        return { success: true, data: getActiveTimerEntriesByBoard(boardId) }
      } catch (err) {
        log.error(`[timers] listActive failed board=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Manual edit of an entry ────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.TIMERS_UPDATE,
    async (
      _e,
      entryId: string,
      fields: {
        startedAt: string
        stoppedAt: string | null
        durationSeconds: number
        note: string
      }
    ): Promise<IpcResult<CardTimerEntry>> => {
      try {
        const existing = getTimerEntryById(entryId)
        if (!existing) return { success: false, error: `Timer entry not found: ${entryId}` }

        const config = getBoardById(existing.boardId)
        if (!config) return { success: false, error: `Board not found: ${existing.boardId}` }

        updateTimerEntryRow(entryId, {
          startedAt: fields.startedAt,
          stoppedAt: fields.stoppedAt,
          durationSeconds: fields.durationSeconds,
          note: fields.note,
          trelloCommentId: existing.trelloCommentId
        })

        const merged: CardTimerEntry = {
          ...existing,
          startedAt: fields.startedAt,
          stoppedAt: fields.stoppedAt,
          durationSeconds: fields.durationSeconds,
          note: fields.note
        }

        const client = new TrelloClient(config.apiKey, config.apiToken)
        const commentId = await syncCommentForEntry(merged, client)
        if (commentId !== existing.trelloCommentId) {
          updateTimerEntryRow(entryId, {
            startedAt: fields.startedAt,
            stoppedAt: fields.stoppedAt,
            durationSeconds: fields.durationSeconds,
            note: fields.note,
            trelloCommentId: commentId
          })
        }

        const updated = getTimerEntryById(entryId)!
        log.info(`[timers] updated entry=${entryId}`)
        return { success: true, data: updated }
      } catch (err) {
        log.error(`[timers] update failed entry=${entryId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Delete an entry ────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.TIMERS_DELETE,
    async (_e, entryId: string): Promise<IpcResult<void>> => {
      try {
        const existing = getTimerEntryById(entryId)
        if (!existing) return { success: true }

        if (existing.trelloCommentId) {
          const config = getBoardById(existing.boardId)
          if (config) {
            try {
              const client = new TrelloClient(config.apiKey, config.apiToken)
              await client.deleteCardComment(existing.cardId, existing.trelloCommentId)
            } catch (err) {
              log.warn(`[timers] failed to delete Trello comment for entry=${entryId}:`, err)
            }
          }
        }

        deleteTimerEntryRow(entryId)
        log.info(`[timers] deleted entry=${entryId}`)
        return { success: true }
      } catch (err) {
        log.error(`[timers] delete failed entry=${entryId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Manual create (user forgot to start the timer) ─────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.TIMERS_CREATE_MANUAL,
    async (
      _e,
      boardId: string,
      cardId: string,
      fields: {
        startedAt: string
        stoppedAt: string
        durationSeconds: number
        note: string
      }
    ): Promise<IpcResult<CardTimerEntry>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board not found: ${boardId}` }

        const entry: CardTimerEntry = {
          id: randomUUID(),
          boardId,
          cardId,
          startedAt: fields.startedAt,
          stoppedAt: fields.stoppedAt,
          durationSeconds: fields.durationSeconds,
          note: fields.note,
          trelloCommentId: null,
          createdAt: '',
          updatedAt: ''
        }
        insertTimerEntry(entry)

        const client = new TrelloClient(config.apiKey, config.apiToken)
        const commentId = await syncCommentForEntry(entry, client)
        if (commentId) {
          updateTimerEntryRow(entry.id, {
            startedAt: entry.startedAt,
            stoppedAt: entry.stoppedAt,
            durationSeconds: entry.durationSeconds,
            note: entry.note,
            trelloCommentId: commentId
          })
        }

        const stored = getTimerEntryById(entry.id)!
        log.info(`[timers] createManual entry=${entry.id} card=${cardId}`)
        return { success: true, data: stored }
      } catch (err) {
        log.error(`[timers] createManual failed card=${cardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )
}
