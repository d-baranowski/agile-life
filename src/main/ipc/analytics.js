/**
 * Analytics IPC handlers.
 *
 * Column counts are handled by registerBoardHandlers (ipc/boards.ts) because
 * they are a basic board-data query, not a derived analytic.
 *
 * Advanced analytics (closed per week, by label, card age) are implemented
 * here.  See docs/analytics/REQUIREMENTS.md for the full spec.
 */
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc.types';
import { getDb } from '../database/db';
import sqlWeeklyUserStats from '../database/sql/analytics/weekly-user-stats.sql?raw';
import sqlLabelUserStats from '../database/sql/analytics/label-user-stats.sql?raw';
import sqlCardAge from '../database/sql/analytics/card-age.sql?raw';
import sqlWeeklyHistoryRaw from '../database/sql/analytics/weekly-history-raw.sql?raw';
import sqlStoryPoints7dRaw from '../database/sql/analytics/story-points-7d-raw.sql?raw';
/**
 * Returns the story-point value for a card based on its labels and the
 * configured rules.  Uses the first matching label (by name, case-insensitive).
 * Falls back to 1 when no label matches.
 */
function cardStoryPoints(labelsJson, config) {
    if (!config || config.length === 0)
        return 1;
    let labels;
    try {
        labels = JSON.parse(labelsJson || '[]');
    }
    catch {
        return 1;
    }
    for (const label of labels) {
        const rule = config.find((r) => r.labelName.trim().toLowerCase() === (label.name || '').trim().toLowerCase());
        if (rule)
            return rule.points;
    }
    return 1;
}
export function registerAnalyticsHandlers() {
    // ── Weekly user stats ───────────────────────────────────────────────────────
    //
    // Returns cards moved to a "done" list per user in the last 7 days,
    // grouped by ISO week and user.
    ipcMain.handle(IPC_CHANNELS.ANALYTICS_WEEKLY_USER_STATS, async (_e, boardId) => {
        try {
            const rows = getDb().prepare(sqlWeeklyUserStats).all(boardId, boardId);
            return { success: true, data: rows };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
    // ── Label user stats ────────────────────────────────────────────────────────
    //
    // Returns closed card counts grouped by label + user in the last 7 days.
    // Cards with no labels are excluded from this breakdown.
    ipcMain.handle(IPC_CHANNELS.ANALYTICS_LABEL_USER_STATS, async (_e, boardId) => {
        try {
            const rows = getDb().prepare(sqlLabelUserStats).all(boardId, boardId);
            return { success: true, data: rows };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
    // ── Card age ────────────────────────────────────────────────────────────────
    //
    // Returns age in days for every open card, ordered oldest first.
    ipcMain.handle(IPC_CHANNELS.ANALYTICS_CARD_AGE, async (_e, boardId) => {
        try {
            const rows = getDb().prepare(sqlCardAge).all(boardId).map((row) => {
                const members = JSON.parse(row.membersJson || '[]');
                return {
                    cardId: row.cardId,
                    cardName: row.cardName,
                    listName: row.listName,
                    ageInDays: row.ageInDays,
                    assignees: members.map((m) => m.fullName)
                };
            });
            return { success: true, data: rows };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
    // ── Weekly history (12 months) — story-point weighted ──────────────────────
    //
    // Returns story points completed per user per ISO week for the past 12
    // months.  Each card's point value is determined by matching its first
    // label against the caller-supplied storyPointsConfig rules.  Cards with
    // no matching label count as 1 point.
    ipcMain.handle(IPC_CHANNELS.ANALYTICS_WEEKLY_HISTORY, async (_e, boardId, storyPointsConfig) => {
        try {
            const rawRows = getDb()
                .prepare(sqlWeeklyHistoryRaw)
                .all(boardId, boardId);
            // Aggregate story points per (week, userId)
            const aggregated = new Map();
            for (const row of rawRows) {
                const pts = cardStoryPoints(row.labelsJson, storyPointsConfig);
                const key = `${row.week}|${row.userId ?? '__unassigned__'}`;
                if (!aggregated.has(key)) {
                    aggregated.set(key, {
                        week: row.week,
                        userId: row.userId,
                        userName: row.userName,
                        closedCount: 0
                    });
                }
                aggregated.get(key).closedCount += pts;
            }
            const data = [...aggregated.values()].sort((a, b) => a.week.localeCompare(b.week));
            return { success: true, data };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
    // ── Story points per user (last 7 days) ────────────────────────────────────
    //
    // Returns story points completed per user in the last 7 days.  Each card's
    // point value is determined by matching its labels against the caller-supplied
    // storyPointsConfig rules.  Cards with no matching label count as 1 point.
    ipcMain.handle(IPC_CHANNELS.ANALYTICS_STORY_POINTS_7D, async (_e, boardId, storyPointsConfig) => {
        try {
            const rawRows = getDb()
                .prepare(sqlStoryPoints7dRaw)
                .all(boardId, boardId);
            const aggregated = new Map();
            for (const row of rawRows) {
                const pts = cardStoryPoints(row.labelsJson, storyPointsConfig);
                const key = row.userId ?? '__unassigned__';
                if (!aggregated.has(key)) {
                    aggregated.set(key, {
                        userId: row.userId,
                        userName: row.userName,
                        storyPoints: 0
                    });
                }
                aggregated.get(key).storyPoints += pts;
            }
            const data = [...aggregated.values()].sort((a, b) => b.storyPoints - a.storyPoints);
            return { success: true, data };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
}
