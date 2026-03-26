/**
 * Analytics IPC handlers.
 *
 * Column counts are handled by registerBoardHandlers (ipc/boards.ts) because
 * they are a basic board-data query, not a derived analytic.
 *
 * Advanced analytics (closed per week, by label, card age) are implemented
 * here.  See docs/analytics/REQUIREMENTS.md for the full spec.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { WeeklyUserStats, LabelUserStats, CardAgeStats } from '@shared/analytics.types'
import type { TrelloMember } from '@shared/trello.types'
import { getDb } from '../database/db'
import sqlWeeklyUserStats from '../database/sql/analytics/weekly-user-stats.sql?raw'
import sqlLabelUserStats from '../database/sql/analytics/label-user-stats.sql?raw'
import sqlCardAge from '../database/sql/analytics/card-age.sql?raw'

type Row = Record<string, unknown>

export function registerAnalyticsHandlers(): void {
  // ── Weekly user stats ───────────────────────────────────────────────────────
  //
  // Returns cards moved to a "done" list per user in the last 7 days,
  // grouped by ISO week and user.

  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_WEEKLY_USER_STATS,
    async (_e, boardId: string): Promise<IpcResult<WeeklyUserStats[]>> => {
      try {
        const rows = getDb().prepare(sqlWeeklyUserStats).all(boardId) as WeeklyUserStats[]
        return { success: true, data: rows }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Label user stats ────────────────────────────────────────────────────────
  //
  // Returns closed card counts grouped by label + user in the last 7 days.
  // Cards with no labels are excluded from this breakdown.

  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_LABEL_USER_STATS,
    async (_e, boardId: string): Promise<IpcResult<LabelUserStats[]>> => {
      try {
        const rows = getDb().prepare(sqlLabelUserStats).all(boardId) as LabelUserStats[]
        return { success: true, data: rows }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Card age ────────────────────────────────────────────────────────────────
  //
  // Returns age in days for every open card, ordered oldest first.

  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_CARD_AGE,
    async (_e, boardId: string): Promise<IpcResult<CardAgeStats[]>> => {
      try {
        const rows = (getDb().prepare(sqlCardAge).all(boardId) as Row[]).map((row) => {
          const members: TrelloMember[] = JSON.parse((row.membersJson as string) || '[]')
          return {
            cardId: row.cardId as string,
            cardName: row.cardName as string,
            listName: row.listName as string,
            ageInDays: row.ageInDays as number,
            assignees: members.map((m) => m.fullName)
          } satisfies CardAgeStats
        })
        return { success: true, data: rows }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}

