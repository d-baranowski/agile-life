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
import type {
  WeeklyUserStats,
  LabelUserStats,
  CardAgeStats,
  WeeklyHistory,
  StoryPointsUserStats,
  EpicWeeklyHistory
} from '@shared/analytics.types'
import type { TrelloMember, TrelloLabel } from '@shared/trello.types'
import type { StoryPointRule } from '@shared/board.types'
import { getDb } from '../database/db'
import sqlWeeklyUserStats from '../database/sql/analytics/weekly-user-stats.sql?raw'
import sqlLabelUserStats from '../database/sql/analytics/label-user-stats.sql?raw'
import sqlCardAge from '../database/sql/analytics/card-age.sql?raw'
import sqlWeeklyHistoryRaw from '../database/sql/analytics/weekly-history-raw.sql?raw'
import sqlStoryPoints7dRaw from '../database/sql/analytics/story-points-7d-raw.sql?raw'
import sqlEpicPointsHistoryRaw from '../database/sql/analytics/epic-points-history-raw.sql?raw'
import log from '../logger'

type Row = Record<string, unknown>

interface RawHistoryRow {
  week: string
  userId: string | null
  userName: string
  cardId: string
  labelsJson: string
}

interface RawStoryPointRow {
  userId: string | null
  userName: string
  cardId: string
  labelsJson: string
}

interface RawEpicHistoryRow {
  week: string
  epicCardId: string
  epicCardName: string
  cardId: string
  labelsJson: string
}

/**
 * Returns the story-point value for a card based on its labels and the
 * configured rules.  Uses the first matching label (by name, case-insensitive).
 * Falls back to 1 when no label matches.
 */
function cardStoryPoints(labelsJson: string, config: StoryPointRule[]): number {
  if (!config || config.length === 0) return 1
  let labels: TrelloLabel[]
  try {
    labels = JSON.parse(labelsJson || '[]') as TrelloLabel[]
  } catch {
    return 1
  }
  for (const label of labels) {
    const rule = config.find(
      (r) => r.labelName.trim().toLowerCase() === (label.name || '').trim().toLowerCase()
    )
    if (rule) return rule.points
  }
  return 1
}

export function registerAnalyticsHandlers(): void {
  // ── Weekly user stats ───────────────────────────────────────────────────────
  //
  // Returns cards moved to a "done" list per user in the last 7 days,
  // grouped by ISO week and user.

  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_WEEKLY_USER_STATS,
    async (_e, boardId: string): Promise<IpcResult<WeeklyUserStats[]>> => {
      try {
        const rows = getDb().prepare(sqlWeeklyUserStats).all(boardId, boardId) as WeeklyUserStats[]
        log.debug(`[analytics] weeklyUserStats boardId=${boardId} → ${rows.length} row(s)`)
        return { success: true, data: rows }
      } catch (err) {
        log.error(`[analytics] weeklyUserStats failed boardId=${boardId}:`, err)
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
        const rows = getDb().prepare(sqlLabelUserStats).all(boardId, boardId) as LabelUserStats[]
        log.debug(`[analytics] labelUserStats boardId=${boardId} → ${rows.length} row(s)`)
        return { success: true, data: rows }
      } catch (err) {
        log.error(`[analytics] labelUserStats failed boardId=${boardId}:`, err)
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
        log.debug(`[analytics] cardAge boardId=${boardId} → ${rows.length} card(s)`)
        return { success: true, data: rows }
      } catch (err) {
        log.error(`[analytics] cardAge failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Weekly history (12 months) — story-point weighted ──────────────────────
  //
  // Returns story points completed per user per ISO week for the past 12
  // months.  Each card's point value is determined by matching its first
  // label against the caller-supplied storyPointsConfig rules.  Cards with
  // no matching label count as 1 point.

  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_WEEKLY_HISTORY,
    async (
      _e,
      boardId: string,
      storyPointsConfig: StoryPointRule[]
    ): Promise<IpcResult<WeeklyHistory[]>> => {
      try {
        const rawRows = getDb()
          .prepare(sqlWeeklyHistoryRaw)
          .all(boardId, boardId) as RawHistoryRow[]

        // Aggregate story points per (week, userId)
        const aggregated = new Map<
          string,
          { week: string; userId: string | null; userName: string; closedCount: number }
        >()

        for (const row of rawRows) {
          const pts = cardStoryPoints(row.labelsJson, storyPointsConfig)
          const key = `${row.week}|${row.userId ?? '__unassigned__'}`
          if (!aggregated.has(key)) {
            aggregated.set(key, {
              week: row.week,
              userId: row.userId,
              userName: row.userName,
              closedCount: 0
            })
          }
          aggregated.get(key)!.closedCount += pts
        }

        const data = [...aggregated.values()].sort((a, b) => a.week.localeCompare(b.week))
        log.debug(`[analytics] weeklyHistory boardId=${boardId} → ${data.length} row(s)`)
        return { success: true, data }
      } catch (err) {
        log.error(`[analytics] weeklyHistory failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Story points per user (last 7 days) ────────────────────────────────────
  //
  // Returns story points completed per user in the last 7 days.  Each card's
  // point value is determined by matching its labels against the caller-supplied
  // storyPointsConfig rules.  Cards with no matching label count as 1 point.

  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_STORY_POINTS_7D,
    async (
      _e,
      boardId: string,
      storyPointsConfig: StoryPointRule[]
    ): Promise<IpcResult<StoryPointsUserStats[]>> => {
      try {
        const rawRows = getDb()
          .prepare(sqlStoryPoints7dRaw)
          .all(boardId, boardId) as RawStoryPointRow[]

        const aggregated = new Map<
          string,
          { userId: string | null; userName: string; storyPoints: number }
        >()

        for (const row of rawRows) {
          const pts = cardStoryPoints(row.labelsJson, storyPointsConfig)
          const key = row.userId ?? '__unassigned__'
          if (!aggregated.has(key)) {
            aggregated.set(key, {
              userId: row.userId,
              userName: row.userName,
              storyPoints: 0
            })
          }
          aggregated.get(key)!.storyPoints += pts
        }

        const data = [...aggregated.values()].sort((a, b) => b.storyPoints - a.storyPoints)
        log.debug(`[analytics] storyPoints7d boardId=${boardId} → ${data.length} user(s)`)
        return { success: true, data }
      } catch (err) {
        log.error(`[analytics] storyPoints7d failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Epic story points per week (12 months) ─────────────────────────────────
  //
  // Returns story points completed per epic per ISO week for the past 12
  // months.  Each card's point value is determined by matching its labels
  // against the caller-supplied storyPointsConfig rules.

  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_EPIC_WEEKLY_HISTORY,
    async (
      _e,
      boardId: string,
      storyPointsConfig: StoryPointRule[]
    ): Promise<IpcResult<EpicWeeklyHistory[]>> => {
      try {
        const rawRows = getDb()
          .prepare(sqlEpicPointsHistoryRaw)
          .all(boardId, boardId) as RawEpicHistoryRow[]

        const aggregated = new Map<
          string,
          { week: string; epicCardId: string; epicCardName: string; storyPoints: number }
        >()

        for (const row of rawRows) {
          const pts = cardStoryPoints(row.labelsJson, storyPointsConfig)
          const key = `${row.week}|${row.epicCardId}`
          if (!aggregated.has(key)) {
            aggregated.set(key, {
              week: row.week,
              epicCardId: row.epicCardId,
              epicCardName: row.epicCardName,
              storyPoints: 0
            })
          }
          aggregated.get(key)!.storyPoints += pts
        }

        const data = [...aggregated.values()].sort((a, b) => a.week.localeCompare(b.week))
        log.debug(`[analytics] epicWeeklyHistory boardId=${boardId} → ${data.length} row(s)`)
        return { success: true, data }
      } catch (err) {
        log.error(`[analytics] epicWeeklyHistory failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )
}
