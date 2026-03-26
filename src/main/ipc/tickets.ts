import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { UnnumberedCard, TicketNumberingConfig, ApplyNumberingResult } from '@shared/ticket.types'
import { getDb, getBoardById, updateBoard } from '../database/db'
import { TrelloClient } from '../trello/client'

/** Regex for a valid JIRA-style ticket prefix: 3 capital letters + hyphen + 6-digit padded number */
const TICKET_REGEX = /^[A-Z]{3}-\d{6}\s/

export interface UnnumberedCard {
  cardId: string
  cardName: string
  listName: string
  proposedName: string
}

export interface TicketNumberingConfig {
  projectCode: string
  nextTicketNumber: number
  unnumberedCount: number
}

export function registerTicketHandlers(): void {
  /**
   * Returns the current ticket numbering configuration and a count of
   * cards that do not yet follow the naming convention.
   */
  ipcMain.handle(
    IPC_CHANNELS.TICKETS_GET_CONFIG,
    async (_event, boardId: string): Promise<IpcResult<TicketNumberingConfig>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: 'Board not found' }

        const db = getDb()
        const { count } = db
          .prepare(
            `SELECT COUNT(*) as count FROM trello_cards
             WHERE board_id = ? AND closed = 0 AND name NOT REGEXP '^[A-Z]{3}-[0-9]{6} '`
          )
          .get(boardId) as { count: number }

        // SQLite doesn't support REGEXP by default — use manual filtering
        const allCards = db
          .prepare(`SELECT name FROM trello_cards WHERE board_id = ? AND closed = 0`)
          .all(boardId) as { name: string }[]

        const unnumberedCount = allCards.filter((c) => !TICKET_REGEX.test(c.name)).length

        void count // suppress unused warning

        return {
          success: true,
          data: {
            projectCode: config.projectCode,
            nextTicketNumber: config.nextTicketNumber,
            unnumberedCount
          }
        }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  /**
   * Returns a preview list of cards that do not follow the naming convention,
   * with their proposed new names.
   */
  ipcMain.handle(
    IPC_CHANNELS.TICKETS_PREVIEW_UNNUMBERED,
    async (_event, boardId: string): Promise<IpcResult<UnnumberedCard[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: 'Board not found' }
        if (!config.projectCode) {
          return { success: false, error: 'Project code not configured for this board' }
        }

        const db = getDb()
        const rows = db
          .prepare(
            `SELECT c.id as cardId, c.name as cardName, l.name as listName
             FROM trello_cards c
             LEFT JOIN trello_lists l ON l.id = c.list_id
             WHERE c.board_id = ? AND c.closed = 0
             ORDER BY c.date_last_activity ASC`
          )
          .all(boardId) as { cardId: string; cardName: string; listName: string }[]

        const unnumbered = rows.filter((r) => !TICKET_REGEX.test(r.cardName))

        let nextNum = config.nextTicketNumber
        const preview: UnnumberedCard[] = unnumbered.map((card) => ({
          ...card,
          proposedName: `${config.projectCode}-${String(nextNum++).padStart(6, '0')} ${card.cardName}`
        }))

        return { success: true, data: preview }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  /**
   * Applies ticket numbering to all unnumbered cards:
   * 1. Calls the Trello API to rename each card
   * 2. Updates the local DB card names
   * 3. Increments nextTicketNumber in board_configs
   */
  ipcMain.handle(
    IPC_CHANNELS.TICKETS_APPLY_NUMBERING,
    async (
      _event,
      boardId: string
    ): Promise<IpcResult<{ updated: number; failed: number; errors: string[] }>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: 'Board not found' }
        if (!config.projectCode) {
          return { success: false, error: 'Project code not configured for this board' }
        }

        const db = getDb()
        const rows = db
          .prepare(
            `SELECT id as cardId, name as cardName
             FROM trello_cards
             WHERE board_id = ? AND closed = 0
             ORDER BY date_last_activity ASC`
          )
          .all(boardId) as { cardId: string; cardName: string }[]

        const unnumbered = rows.filter((r) => !TICKET_REGEX.test(r.cardName))
        if (unnumbered.length === 0) {
          return { success: true, data: { updated: 0, failed: 0, errors: [] } }
        }

        const client = new TrelloClient(config.apiKey, config.apiToken)
        let nextNum = config.nextTicketNumber
        let updated = 0
        let failed = 0
        const errors: string[] = []

        const updateStmt = db.prepare(`UPDATE trello_cards SET name = ? WHERE id = ?`)

        for (const card of unnumbered) {
          const newName = `${config.projectCode}-${String(nextNum).padStart(6, '0')} ${card.cardName}`
          try {
            await client.updateCardName(card.cardId, newName)
            updateStmt.run(newName, card.cardId)
            nextNum++
            updated++
          } catch (e) {
            failed++
            errors.push(`Failed to rename "${card.cardName}": ${String(e)}`)
          }
        }

        // Persist the updated nextTicketNumber
        updateBoard(boardId, { nextTicketNumber: nextNum })

        return { success: true, data: { updated, failed, errors } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  /**
   * Updates the project code and/or nextTicketNumber for a board.
   */
  ipcMain.handle(
    IPC_CHANNELS.TICKETS_UPDATE_CONFIG,
    async (
      _event,
      boardId: string,
      updates: { projectCode?: string; nextTicketNumber?: number }
    ): Promise<IpcResult<void>> => {
      try {
        updateBoard(boardId, updates)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
