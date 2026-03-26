import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { ColumnCount, WeeklyUserStats, LabelUserStats, CardAgeStats } from '@shared/analytics.types'
import { getDb, getBoardById } from '../database/db'

export function registerAnalyticsHandlers(): void {
  /**
   * Returns card counts per column (list) for the selected board.
   * Uses local DB cache — call TRELLO_SYNC first for up-to-date data.
   */
  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_COLUMN_COUNTS,
    async (_event, boardId: string): Promise<IpcResult<ColumnCount[]>> => {
      try {
        const db = getDb()
        const rows = db
          .prepare(
            `SELECT l.id as listId, l.name as listName, COUNT(c.id) as cardCount
             FROM trello_lists l
             LEFT JOIN trello_cards c ON c.list_id = l.id AND c.closed = 0
             WHERE l.board_id = ? AND l.closed = 0
             GROUP BY l.id, l.name
             ORDER BY l.pos ASC`
          )
          .all(boardId) as ColumnCount[]
        return { success: true, data: rows }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  /**
   * Returns number of cards moved to a "done" list per week per member.
   * Looks at `updateCard:idList` actions where listAfter matches doneListNames config.
   */
  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_WEEKLY_USER_STATS,
    async (_event, boardId: string): Promise<IpcResult<WeeklyUserStats[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: 'Board not found' }

        const doneNames = config.doneListNames.map((n) => n.toLowerCase())
        const db = getDb()

        const rows = db
          .prepare(
            `SELECT
               strftime('%Y-W%W', action_date) as week,
               member_id as userId,
               member_name as userName,
               COUNT(*) as closedCount
             FROM trello_actions
             WHERE board_id = ?
               AND action_type IN ('updateCard', 'createCard')
               AND list_after_name IS NOT NULL
               AND member_id IS NOT NULL
             GROUP BY week, member_id
             ORDER BY week DESC, closedCount DESC`
          )
          .all(boardId) as (WeeklyUserStats & { listAfterName: string })[]

        // Filter to only "done" list moves
        const doneRows = db
          .prepare(
            `SELECT
               strftime('%Y-W%W', action_date) as week,
               member_id as userId,
               member_name as userName,
               COUNT(*) as closedCount
             FROM trello_actions
             WHERE board_id = ?
               AND lower(list_after_name) IN (${doneNames.map(() => '?').join(',')})
               AND member_id IS NOT NULL
             GROUP BY week, member_id
             ORDER BY week DESC, closedCount DESC`
          )
          .all(boardId, ...doneNames) as WeeklyUserStats[]

        void rows // suppress unused warning
        return { success: true, data: doneRows }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  /**
   * Returns label statistics: how many cards with each label were moved to done
   * per member.
   */
  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_LABEL_USER_STATS,
    async (_event, boardId: string): Promise<IpcResult<LabelUserStats[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: 'Board not found' }

        const doneNames = config.doneListNames.map((n) => n.toLowerCase())
        const db = getDb()

        // Get done actions (cards moved to done lists)
        const doneActions = db
          .prepare(
            `SELECT a.card_id, a.member_id, a.member_name
             FROM trello_actions a
             WHERE a.board_id = ?
               AND lower(a.list_after_name) IN (${doneNames.map(() => '?').join(',')})
               AND a.member_id IS NOT NULL`
          )
          .all(boardId, ...doneNames) as { card_id: string; member_id: string; member_name: string }[]

        if (doneActions.length === 0) {
          return { success: true, data: [] }
        }

        // For each done action, look up the card's labels
        const cardIds = [...new Set(doneActions.map((a) => a.card_id))].filter(Boolean)
        const placeholders = cardIds.map(() => '?').join(',')
        const cards = db
          .prepare(
            `SELECT id, labels_json FROM trello_cards WHERE id IN (${placeholders})`
          )
          .all(...cardIds) as { id: string; labels_json: string }[]

        const cardLabels = new Map<string, { name: string; color: string }[]>()
        for (const card of cards) {
          cardLabels.set(card.id, JSON.parse(card.labels_json))
        }

        // Aggregate
        const statsMap = new Map<string, LabelUserStats>()
        for (const action of doneActions) {
          const labels = cardLabels.get(action.card_id) ?? []
          for (const label of labels) {
            const key = `${label.name}:${action.member_id}`
            const existing = statsMap.get(key)
            if (existing) {
              existing.closedCount += 1
            } else {
              statsMap.set(key, {
                labelName: label.name || '(no label)',
                labelColor: label.color,
                userId: action.member_id,
                userName: action.member_name,
                closedCount: 1
              })
            }
          }
        }

        return {
          success: true,
          data: Array.from(statsMap.values()).sort((a, b) => b.closedCount - a.closedCount)
        }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  /**
   * Returns the age of each currently active card.
   */
  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_CARD_AGE,
    async (_event, boardId: string): Promise<IpcResult<CardAgeStats[]>> => {
      try {
        const db = getDb()
        const now = Date.now()

        const rows = db
          .prepare(
            `SELECT c.id as cardId, c.name as cardName, l.name as listName,
                    c.date_last_activity as dateLastActivity, c.members_json
             FROM trello_cards c
             JOIN trello_lists l ON l.id = c.list_id
             WHERE c.board_id = ? AND c.closed = 0
             ORDER BY c.date_last_activity ASC`
          )
          .all(boardId) as {
          cardId: string
          cardName: string
          listName: string
          dateLastActivity: string
          members_json: string
        }[]

        const data: CardAgeStats[] = rows.map((r) => ({
          cardId: r.cardId,
          cardName: r.cardName,
          listName: r.listName,
          ageInDays: Math.floor(
            (now - new Date(r.dateLastActivity).getTime()) / (1000 * 60 * 60 * 24)
          ),
          assignees: (
            JSON.parse(r.members_json) as { fullName: string }[]
          ).map((m) => m.fullName)
        }))

        return { success: true, data }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
