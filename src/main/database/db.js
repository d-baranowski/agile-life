import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getDbPath } from '../settings/appSettings';
// ─── SQL imports ───────────────────────────────────────────────────────────────
import schemaSql from './sql/schema.sql?raw';
import sqlBoardsGetAll from './sql/boards/get-all.sql?raw';
import sqlBoardsGetById from './sql/boards/get-by-id.sql?raw';
import sqlBoardsGetByRowId from './sql/boards/get-by-row-id.sql?raw';
import sqlBoardsInsert from './sql/boards/insert.sql?raw';
import sqlBoardsUpdate from './sql/boards/update.sql?raw';
import sqlBoardsDelete from './sql/boards/delete.sql?raw';
import sqlBoardsUpdateSyncTime from './sql/boards/update-sync-time.sql?raw';
import sqlListsUpsert from './sql/lists/upsert.sql?raw';
import sqlListsMarkRemoved from './sql/lists/mark-removed.sql?raw';
import sqlListsMarkAllRemoved from './sql/lists/mark-all-removed.sql?raw';
import sqlCardsUpsert from './sql/cards/upsert.sql?raw';
import sqlCardsMarkRemoved from './sql/cards/mark-removed.sql?raw';
import sqlCardsMarkAllRemoved from './sql/cards/mark-all-removed.sql?raw';
import sqlKanbanGetLists from './sql/kanban/get-lists.sql?raw';
import sqlKanbanGetCards from './sql/kanban/get-cards.sql?raw';
import sqlKanbanMoveCard from './sql/kanban/move-card.sql?raw';
import sqlCardsUpdatePos from './sql/cards/update-pos.sql?raw';
import sqlCardsGetDoneOlderThan from './sql/cards/get-done-cards-older-than.sql?raw';
import sqlCardsGetDoneColumnDebug from './sql/cards/get-done-column-debug.sql?raw';
import sqlCardsArchive from './sql/cards/archive.sql?raw';
import sqlCardsUpdateMembers from './sql/cards/update-members.sql?raw';
import sqlBoardsMemberUpsert from './sql/boards/upsert-member.sql?raw';
import sqlBoardsGetMembers from './sql/boards/get-members.sql?raw';
import sqlCardListEntriesUpsert from './sql/card-list-entries/upsert.sql?raw';
import sqlCardListEntriesSetFallback from './sql/card-list-entries/set-fallback.sql?raw';
import sqlCardListEntriesClearForBoard from './sql/card-list-entries/clear-for-board.sql?raw';
import sqlBoardsSetCardListEntriesInitialized from './sql/boards/set-card-list-entries-initialized.sql?raw';
import sqlTemplatesGetGroups from './sql/templates/get-groups.sql?raw';
import sqlTemplatesInsertGroup from './sql/templates/insert-group.sql?raw';
import sqlTemplatesUpdateGroup from './sql/templates/update-group.sql?raw';
import sqlTemplatesDeleteGroup from './sql/templates/delete-group.sql?raw';
import sqlTemplatesGetByGroup from './sql/templates/get-by-group.sql?raw';
import sqlTemplatesInsert from './sql/templates/insert-template.sql?raw';
import sqlTemplatesUpdate from './sql/templates/update-template.sql?raw';
import sqlTemplatesDelete from './sql/templates/delete-template.sql?raw';
let _db = null;
// ─── Connection ────────────────────────────────────────────────────────────────
/**
 * Returns the singleton SQLite database, creating and migrating it on first
 * call.  The file lives in Electron's per-user data directory.
 */
export function getDb() {
    if (_db)
        return _db;
    const dbPath = getDbPath();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    _db = new Database(dbPath);
    _db.exec(schemaSql);
    // ── Column migrations ──────────────────────────────────────────────────────
    // CREATE TABLE IF NOT EXISTS won't add new columns to an existing table, so
    // we inspect the live schema and apply ALTER TABLE as needed.
    const cardCols = _db.prepare('PRAGMA table_info(trello_cards)').all().map((c) => c.name);
    if (!cardCols.includes('pos')) {
        _db.exec('ALTER TABLE trello_cards ADD COLUMN pos REAL NOT NULL DEFAULT 0');
    }
    if (!cardCols.includes('short_url')) {
        _db.exec("ALTER TABLE trello_cards ADD COLUMN short_url TEXT NOT NULL DEFAULT ''");
    }
    if (!cardCols.includes('desc')) {
        _db.exec("ALTER TABLE trello_cards ADD COLUMN desc TEXT NOT NULL DEFAULT ''");
    }
    // SQLite has no "ADD COLUMN IF NOT EXISTS", so we try and ignore the error
    // if the column already exists (e.g. new installs where schema.sql created it).
    try {
        _db.exec('ALTER TABLE board_configs ADD COLUMN card_list_entries_initialized INTEGER NOT NULL DEFAULT 0');
    }
    catch {
        // Column already exists — nothing to do.
    }
    try {
        _db.exec('ALTER TABLE board_configs ADD COLUMN story_points_config TEXT NOT NULL DEFAULT \'[{"labelName":"Large","points":5},{"labelName":"Medium","points":3},{"labelName":"Small","points":1}]\'');
    }
    catch {
        // Column already exists — nothing to do.
    }
    // Ensure board_members table exists for existing databases that pre-date the
    // schema addition.  CREATE TABLE IF NOT EXISTS is idempotent and safe.
    _db.exec(`
    CREATE TABLE IF NOT EXISTS board_members (
      id        TEXT NOT NULL,
      board_id  TEXT NOT NULL,
      full_name TEXT NOT NULL,
      username  TEXT NOT NULL,
      PRIMARY KEY (id, board_id),
      FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
    )
  `);
    return _db;
}
// ─── Board Config ──────────────────────────────────────────────────────────────
export function getAllBoards() {
    return getDb().prepare(sqlBoardsGetAll).all().map(rowToBoardConfig);
}
export function getBoardById(boardId) {
    const row = getDb().prepare(sqlBoardsGetById).get(boardId);
    return row ? rowToBoardConfig(row) : undefined;
}
export function addBoard(input) {
    const db = getDb();
    const result = db.prepare(sqlBoardsInsert).run({
        boardId: input.boardId,
        boardName: input.boardName,
        apiKey: input.apiKey,
        apiToken: input.apiToken,
        projectCode: input.projectCode.toUpperCase(),
        nextTicketNumber: input.nextTicketNumber,
        doneListNames: JSON.stringify(input.doneListNames)
    });
    return rowToBoardConfig(db.prepare(sqlBoardsGetByRowId).get(result.lastInsertRowid));
}
export function updateBoard(boardId, updates) {
    const existing = getBoardById(boardId);
    if (!existing)
        throw new Error(`Board not found: ${boardId}`);
    getDb()
        .prepare(sqlBoardsUpdate)
        .run({
        boardId,
        boardName: updates.boardName ?? existing.boardName,
        apiKey: updates.apiKey ?? existing.apiKey,
        apiToken: updates.apiToken ?? existing.apiToken,
        projectCode: (updates.projectCode ?? existing.projectCode).toUpperCase(),
        nextTicketNumber: updates.nextTicketNumber ?? existing.nextTicketNumber,
        doneListNames: JSON.stringify(updates.doneListNames ?? existing.doneListNames),
        storyPointsConfig: JSON.stringify(updates.storyPointsConfig ?? existing.storyPointsConfig)
    });
    return getBoardById(boardId);
}
export function deleteBoard(boardId) {
    getDb().prepare(sqlBoardsDelete).run(boardId);
}
// ─── Lists ─────────────────────────────────────────────────────────────────────
/**
 * Upsert a batch of lists fetched from Trello.
 * ON CONFLICT updates name/pos so renames are reflected on re-sync.
 */
export function upsertLists(boardId, lists) {
    const db = getDb();
    const stmt = db.prepare(sqlListsUpsert);
    db.transaction((rows) => {
        for (const l of rows) {
            stmt.run({ id: l.id, boardId, name: l.name, pos: l.pos, closed: l.closed ? 1 : 0 });
        }
    })(lists);
}
/**
 * After upserting the fresh list from Trello, mark any list that was NOT
 * returned as closed (it was archived or deleted on the Trello board).
 */
export function markRemovedLists(boardId, freshListIds) {
    if (freshListIds.length === 0) {
        getDb().prepare(sqlListsMarkAllRemoved).run(boardId);
        return;
    }
    getDb().prepare(sqlListsMarkRemoved).run(boardId, JSON.stringify(freshListIds));
}
// ─── Cards ─────────────────────────────────────────────────────────────────────
/**
 * Upsert a batch of cards fetched from Trello.
 *
 * The PRIMARY KEY is Trello's card `id` — guaranteed globally unique.
 * ON CONFLICT updates every mutable field, including `list_id`, which
 * is how a card moving between columns is reflected after re-sync.
 */
export function upsertCards(boardId, cards) {
    const db = getDb();
    const stmt = db.prepare(sqlCardsUpsert);
    db.transaction((rows) => {
        for (const c of rows) {
            stmt.run({
                id: c.id,
                boardId,
                listId: c.idList,
                name: c.name,
                desc: c.desc,
                closed: c.closed ? 1 : 0,
                dateLastActivity: c.dateLastActivity,
                pos: c.pos,
                shortUrl: c.shortUrl,
                labelsJson: JSON.stringify(c.labels),
                membersJson: JSON.stringify(c.members)
            });
        }
    })(cards);
}
/**
 * After upserting the fresh card list from Trello, mark any card that was NOT
 * returned as closed = 1 (it was archived or deleted on the Trello board).
 */
export function markRemovedCards(boardId, freshCardIds) {
    if (freshCardIds.length === 0) {
        getDb().prepare(sqlCardsMarkAllRemoved).run(boardId);
        return;
    }
    getDb().prepare(sqlCardsMarkRemoved).run(boardId, JSON.stringify(freshCardIds));
}
/** Stamp the board row with the current UTC time after a successful sync. */
export function updateBoardSyncTime(boardId) {
    getDb().prepare(sqlBoardsUpdateSyncTime).run(boardId);
}
export function getListsForBoard(boardId) {
    return getDb().prepare(sqlKanbanGetLists).all(boardId);
}
export function getCardsForBoard(boardId) {
    return getDb().prepare(sqlKanbanGetCards).all(boardId);
}
export function moveCardToList(cardId, toListId, pos) {
    getDb().prepare(sqlKanbanMoveCard).run({ cardId, toListId, pos });
}
/** Update only the position of a card (used when reordering within a column). */
export function updateCardPos(cardId, pos) {
    getDb().prepare(sqlCardsUpdatePos).run({ cardId, pos });
}
/** Mark a single card as archived in the local cache. */
export function archiveCardLocally(cardId) {
    getDb().prepare(sqlCardsArchive).run({ cardId });
}
/** Update the members_json for a card after a member assignment change. */
export function updateCardMembers(cardId, members) {
    getDb()
        .prepare(sqlCardsUpdateMembers)
        .run({ cardId, membersJson: JSON.stringify(members) });
}
/** Upsert the full list of board members fetched from Trello. */
export function upsertBoardMembers(boardId, members) {
    const db = getDb();
    const stmt = db.prepare(sqlBoardsMemberUpsert);
    db.transaction((rows) => {
        for (const m of rows) {
            stmt.run({ id: m.id, boardId, fullName: m.fullName, username: m.username });
        }
    })(members);
}
/** Returns the members_json string for a card, or undefined if not found. */
export function getCardMembersJson(cardId) {
    const row = getDb().prepare('SELECT members_json FROM trello_cards WHERE id = ?').get(cardId);
    return row?.members_json;
}
/** Returns all cached board members, ordered alphabetically by full name. */
export function getBoardMembers(boardId) {
    return getDb().prepare(sqlBoardsGetMembers).all(boardId).map((r) => ({
        id: r.id,
        fullName: r.full_name,
        username: r.username
    }));
}
// ─── Actions ───────────────────────────────────────────────────────────────────
const sqlActionsUpsert = `
  INSERT OR IGNORE INTO trello_actions
    (id, board_id, card_id, action_type, action_date,
     member_id, member_name,
     list_before_id, list_before_name, list_after_id, list_after_name)
  VALUES
    (@id, @boardId, @cardId, @actionType, @actionDate,
     @memberId, @memberName,
     @listBeforeId, @listBeforeName, @listAfterId, @listAfterName)
`;
/**
 * Persist a batch of Trello actions.
 * Uses INSERT OR IGNORE because actions are immutable once created on Trello.
 */
export function upsertActions(boardId, actions) {
    const db = getDb();
    const stmt = db.prepare(sqlActionsUpsert);
    db.transaction((rows) => {
        for (const a of rows) {
            stmt.run({
                id: a.id,
                boardId,
                cardId: a.data.card?.id ?? null,
                actionType: a.type,
                actionDate: a.date,
                memberId: a.memberCreator?.id ?? null,
                memberName: a.memberCreator?.fullName ?? null,
                listBeforeId: a.data.listBefore?.id ?? null,
                listBeforeName: a.data.listBefore?.name ?? null,
                listAfterId: a.data.listAfter?.id ?? null,
                listAfterName: a.data.listAfter?.name ?? null
            });
        }
    })(actions);
}
/**
 * Returns the ISO-8601 date of the most recently stored action for this board,
 * or null if no actions have been synced yet.  Used as the `since` parameter
 * on incremental syncs to avoid re-fetching the full action history.
 */
export function getLatestActionDate(boardId) {
    const row = getDb()
        .prepare('SELECT MAX(action_date) AS latest FROM trello_actions WHERE board_id = ?')
        .get(boardId);
    return row?.latest ?? null;
}
// ─── Card List Entries ─────────────────────────────────────────────────────────
/**
 * Upsert the timestamp when a card entered a list.
 * MAX() keeps the most-recent value so that re-processing the same events is
 * safe — only a newer timestamp can overwrite an existing one.  This means the
 * table must be cleared (clearCardListEntriesForBoard) before re-running a
 * full-history fetch so stale "today" rows can't block historical dates.
 */
export function upsertCardListEntry(cardId, listId, enteredAt) {
    getDb().prepare(sqlCardListEntriesUpsert).run({ cardId, listId, enteredAt });
}
/**
 * Delete all card_list_entries rows for the given board.
 * Called before a full-history rebuild to ensure stale rows written by old
 * code (e.g. entered_at = now()) can't survive and block correct timestamps.
 */
export function clearCardListEntriesForBoard(boardId) {
    getDb().prepare(sqlCardListEntriesClearForBoard).run({ boardId });
}
/**
 * Returns true when the card_list_entries table for this board has been
 * fully initialized from Trello's action history.
 * A board starts with card_list_entries_initialized = 0 (the default),
 * including boards upgraded from a version that lacked this column.
 * The sync flow sets it to 1 after a successful full-history fetch.
 */
export function isCardListEntriesInitialized(boardId) {
    const row = getDb()
        .prepare(`SELECT card_list_entries_initialized FROM board_configs WHERE board_id = ?`)
        .get(boardId);
    return (row?.card_list_entries_initialized ?? 0) === 1;
}
/**
 * Mark the board's card_list_entries as fully initialized.
 * Called after a successful full-history action fetch so subsequent syncs
 * only need to fetch incremental actions.
 */
export function setCardListEntriesInitialized(boardId) {
    getDb().prepare(sqlBoardsSetCardListEntriesInitialized).run({ boardId });
}
/**
 * For open cards that still have no card_list_entries row for their current
 * list after processing all available Trello actions (e.g. cards created
 * before Trello started recording actions), inserts a fallback row using
 * date_last_activity as a conservative lower-bound.
 *
 * Only inserts when no row already exists (NOT EXISTS guard) — cards with a
 * real action-based entry are left untouched.
 */
export function setCardListEntryFallback(boardId) {
    getDb().prepare(sqlCardListEntriesSetFallback).run({ boardId });
}
/**
 * Returns all open cards that live in one of the given done-list names and
 * that have been in the done column since before the supplied ISO-8601 cutoff.
 */
export function getDoneCardsOlderThan(boardId, doneListNames, cutoffDate) {
    return getDb()
        .prepare(sqlCardsGetDoneOlderThan)
        .all({
        boardId,
        doneListNames: JSON.stringify(doneListNames),
        cutoffDate
    });
}
/**
 * Diagnostic query: returns ALL open cards in the done column(s) with raw
 * timestamp data so the UI can show what is actually stored.
 */
export function getDoneColumnDebug(boardId, doneListNames) {
    return getDb()
        .prepare(sqlCardsGetDoneColumnDebug)
        .all({
        boardId,
        doneListNames: JSON.stringify(doneListNames)
    });
}
function rowToBoardConfig(row) {
    const defaultStoryPoints = [
        { labelName: 'Large', points: 5 },
        { labelName: 'Medium', points: 3 },
        { labelName: 'Small', points: 1 }
    ];
    return {
        id: row.id,
        boardId: row.board_id,
        boardName: row.board_name,
        apiKey: row.api_key,
        apiToken: row.api_token,
        projectCode: row.project_code,
        nextTicketNumber: row.next_ticket_number,
        doneListNames: JSON.parse(row.done_list_names),
        storyPointsConfig: row.story_points_config
            ? JSON.parse(row.story_points_config)
            : defaultStoryPoints,
        lastSyncedAt: row.last_synced_at ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
// ─── Template Groups ───────────────────────────────────────────────────────────
export function getTemplateGroups(boardId) {
    return getDb().prepare(sqlTemplatesGetGroups).all({ boardId }).map(rowToTemplateGroup);
}
export function createTemplateGroup(boardId, input) {
    const db = getDb();
    const result = db.prepare(sqlTemplatesInsertGroup).run({ boardId, name: input.name });
    const row = db
        .prepare('SELECT id, board_id, name, created_at, updated_at FROM template_groups WHERE id = ?')
        .get(result.lastInsertRowid);
    return rowToTemplateGroup(row);
}
export function updateTemplateGroup(boardId, id, input) {
    const result = getDb()
        .prepare(sqlTemplatesUpdateGroup)
        .run({ id, boardId, name: input.name });
    return result.changes > 0;
}
export function deleteTemplateGroup(boardId, id) {
    const result = getDb().prepare(sqlTemplatesDeleteGroup).run({ id, boardId });
    return result.changes > 0;
}
// ─── Ticket Templates ──────────────────────────────────────────────────────────
export function getTemplatesByGroup(boardId, groupId) {
    return getDb().prepare(sqlTemplatesGetByGroup).all({ boardId, groupId }).map(rowToTicketTemplate);
}
export function createTicketTemplate(boardId, input) {
    const db = getDb();
    const result = db.prepare(sqlTemplatesInsert).run({
        boardId,
        groupId: input.groupId,
        name: input.name,
        titleTemplate: input.titleTemplate,
        descTemplate: input.descTemplate ?? '',
        listId: input.listId,
        listName: input.listName,
        position: input.position ?? 0
    });
    const row = db
        .prepare(`SELECT id, board_id, group_id, name, title_template, desc_template,
              list_id, list_name, position, created_at, updated_at
       FROM ticket_templates WHERE id = ?`)
        .get(result.lastInsertRowid);
    return rowToTicketTemplate(row);
}
export function updateTicketTemplate(boardId, id, input) {
    const result = getDb()
        .prepare(sqlTemplatesUpdate)
        .run({
        id,
        boardId,
        name: input.name,
        titleTemplate: input.titleTemplate,
        descTemplate: input.descTemplate ?? '',
        listId: input.listId,
        listName: input.listName,
        position: input.position ?? 0
    });
    return result.changes > 0;
}
export function deleteTicketTemplate(boardId, id) {
    const result = getDb().prepare(sqlTemplatesDelete).run({ id, boardId });
    return result.changes > 0;
}
// ─── Template Row Mappers ──────────────────────────────────────────────────────
function rowToTemplateGroup(row) {
    return {
        id: row.id,
        boardId: row.board_id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
function rowToTicketTemplate(row) {
    return {
        id: row.id,
        boardId: row.board_id,
        groupId: row.group_id,
        name: row.name,
        titleTemplate: row.title_template,
        descTemplate: row.desc_template ?? '',
        listId: row.list_id,
        listName: row.list_name,
        position: row.position,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
