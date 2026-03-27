import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc.types';
import { getBoardById, updateBoard, getDb } from '../database/db';
import { TrelloClient } from '../trello/client';
const TICKET_REGEX = /^[A-Z]{3}-\d{6} /;
/** Small delay between sequential Trello API calls to avoid rate-limiting. */
const TRELLO_DELAY_MS = 200;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function registerTicketHandlers() {
    // ── TICKETS_GET_CONFIG ──────────────────────────────────────────────────────
    //
    // Returns the board's project_code, next_ticket_number and a count of
    // open cards that do not yet carry a JIRA-style prefix.
    ipcMain.handle(IPC_CHANNELS.TICKETS_GET_CONFIG, async (_e, boardId) => {
        try {
            const board = getBoardById(boardId);
            if (!board)
                return { success: false, error: `Board not found: ${boardId}` };
            const rows = getDb()
                .prepare('SELECT name FROM trello_cards WHERE board_id = ? AND closed = 0')
                .all(boardId);
            const unnumberedCount = rows.filter((c) => !TICKET_REGEX.test(c.name)).length;
            return {
                success: true,
                data: {
                    projectCode: board.projectCode,
                    nextTicketNumber: board.nextTicketNumber,
                    unnumberedCount
                }
            };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
    // ── TICKETS_PREVIEW_UNNUMBERED ──────────────────────────────────────────────
    //
    // Read-only preview of proposed renames — no Trello API call is made.
    ipcMain.handle(IPC_CHANNELS.TICKETS_PREVIEW_UNNUMBERED, async (_e, boardId) => {
        try {
            const board = getBoardById(boardId);
            if (!board)
                return { success: false, error: `Board not found: ${boardId}` };
            if (!board.projectCode || !/^[A-Z]{3}$/.test(board.projectCode)) {
                return {
                    success: false,
                    error: 'Project code must be exactly 3 uppercase letters (e.g. AGI)'
                };
            }
            const rows = getDb()
                .prepare(`SELECT tc.id, tc.name, tl.name AS list_name
             FROM trello_cards tc
             JOIN trello_lists tl ON tl.id = tc.list_id
             WHERE tc.board_id = ? AND tc.closed = 0
             ORDER BY tc.date_last_activity ASC`)
                .all(boardId);
            const unnumbered = rows.filter((c) => !TICKET_REGEX.test(c.name));
            let nextNum = board.nextTicketNumber;
            const preview = unnumbered.map((c) => ({
                cardId: c.id,
                cardName: c.name,
                listName: c.list_name,
                proposedName: `${board.projectCode}-${String(nextNum++).padStart(6, '0')} ${c.name}`
            }));
            return { success: true, data: preview };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
    // ── TICKETS_APPLY_NUMBERING ─────────────────────────────────────────────────
    //
    // Renames every unnumbered open card on Trello then updates local DB.
    // Cards are processed sequentially (Trello rate limit ~100 req/10 s).
    ipcMain.handle(IPC_CHANNELS.TICKETS_APPLY_NUMBERING, async (_e, boardId) => {
        try {
            const board = getBoardById(boardId);
            if (!board)
                return { success: false, error: `Board not found: ${boardId}` };
            if (!board.projectCode || !/^[A-Z]{3}$/.test(board.projectCode)) {
                return {
                    success: false,
                    error: 'Project code must be exactly 3 uppercase letters (e.g. AGI)'
                };
            }
            const rows = getDb()
                .prepare(`SELECT id, name FROM trello_cards
             WHERE board_id = ? AND closed = 0
             ORDER BY date_last_activity ASC`)
                .all(boardId);
            const unnumbered = rows.filter((c) => !TICKET_REGEX.test(c.name));
            const client = new TrelloClient(board.apiKey, board.apiToken);
            const updateStmt = getDb().prepare('UPDATE trello_cards SET name = ? WHERE id = ?');
            let nextNum = board.nextTicketNumber;
            let updated = 0;
            let failed = 0;
            const errors = [];
            for (let i = 0; i < unnumbered.length; i++) {
                const card = unnumbered[i];
                const newName = `${board.projectCode}-${String(nextNum).padStart(6, '0')} ${card.name}`;
                try {
                    await client.updateCardName(card.id, newName);
                    updateStmt.run(newName, card.id);
                    nextNum++;
                    updated++;
                }
                catch (err) {
                    failed++;
                    errors.push(`Card "${card.name}": ${String(err)}`);
                }
                if (i < unnumbered.length - 1) {
                    await sleep(TRELLO_DELAY_MS);
                }
            }
            // Persist the updated counter only after the batch completes.
            updateBoard(boardId, { nextTicketNumber: nextNum });
            return { success: true, data: { updated, failed, errors } };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
    // ── TICKETS_APPLY_SINGLE_CARD ───────────────────────────────────────────────
    //
    // Renames a single card on Trello + updates local DB + increments the counter.
    // The renderer calls this once per card to drive per-card UX feedback.
    // The counter is incremented atomically in SQL to avoid stale-read issues.
    ipcMain.handle(IPC_CHANNELS.TICKETS_APPLY_SINGLE_CARD, async (_e, boardId, cardId, newName) => {
        try {
            const board = getBoardById(boardId);
            if (!board)
                return { success: false, error: `Board not found: ${boardId}` };
            const client = new TrelloClient(board.apiKey, board.apiToken);
            await client.updateCardName(cardId, newName);
            const db = getDb();
            db.prepare('UPDATE trello_cards SET name = ? WHERE id = ?').run(newName, cardId);
            // Atomic increment avoids any stale-read if multiple calls land concurrently.
            db.prepare('UPDATE board_configs SET next_ticket_number = next_ticket_number + 1 WHERE board_id = ?').run(boardId);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
    // ── TICKETS_UPDATE_CONFIG ───────────────────────────────────────────────────
    //
    // Saves project_code and/or next_ticket_number for the board.
    ipcMain.handle(IPC_CHANNELS.TICKETS_UPDATE_CONFIG, async (_e, boardId, updates) => {
        try {
            const board = getBoardById(boardId);
            if (!board)
                return { success: false, error: `Board not found: ${boardId}` };
            if (updates.projectCode !== undefined && !/^[A-Z]{3}$/.test(updates.projectCode)) {
                return {
                    success: false,
                    error: 'Project code must be exactly 3 uppercase letters (e.g. AGI)'
                };
            }
            if (updates.nextTicketNumber !== undefined &&
                updates.nextTicketNumber < board.nextTicketNumber) {
                return {
                    success: false,
                    error: `Cannot reset next ticket number to a lower value (current: ${board.nextTicketNumber})`
                };
            }
            updateBoard(boardId, updates);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    });
}
