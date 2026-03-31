import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import type { BoardConfig, BoardConfigInput, StoryPointRule } from '../lib/board.types'
import { getDbPath } from '../settings/appSettings'
import type {
  TrelloList,
  TrelloCard,
  TrelloAction,
  TrelloMember,
  TrelloLabel
} from '../trello/trello.types'
import type {
  TemplateGroup,
  TicketTemplate,
  TemplateGroupInput,
  TicketTemplateInput
} from '../features/templates/template.types'
import { encryptCredential, decryptCredential } from './crypto'

// ─── SQL imports ───────────────────────────────────────────────────────────────
import schemaSql from './sql/schema.sql?raw'
import sqlBoardsGetAll from './sql/boards/get-all.sql?raw'
import sqlBoardsGetById from './sql/boards/get-by-id.sql?raw'
import sqlBoardsGetByRowId from './sql/boards/get-by-row-id.sql?raw'
import sqlBoardsInsert from './sql/boards/insert.sql?raw'
import sqlBoardsUpdate from './sql/boards/update.sql?raw'
import sqlBoardsDelete from './sql/boards/delete.sql?raw'
import sqlBoardsUpdateSyncTime from './sql/boards/update-sync-time.sql?raw'
import sqlListsUpsert from './sql/lists/upsert.sql?raw'
import sqlListsMarkRemoved from './sql/lists/mark-removed.sql?raw'
import sqlListsMarkAllRemoved from './sql/lists/mark-all-removed.sql?raw'
import sqlCardsUpsert from './sql/cards/upsert.sql?raw'
import sqlCardsMarkRemoved from './sql/cards/mark-removed.sql?raw'
import sqlCardsMarkAllRemoved from './sql/cards/mark-all-removed.sql?raw'
import sqlKanbanGetLists from './sql/kanban/get-lists.sql?raw'
import sqlKanbanGetCards from './sql/kanban/get-cards.sql?raw'
import sqlKanbanMoveCard from './sql/kanban/move-card.sql?raw'
import sqlKanbanGetEpicCards from './sql/kanban/get-epic-cards.sql?raw'
import sqlKanbanGetStoriesForEpic from './sql/kanban/get-stories-for-epic.sql?raw'
import sqlCardsUpdatePos from './sql/cards/update-pos.sql?raw'
import sqlCardsGetDoneOlderThan from './sql/cards/get-done-cards-older-than.sql?raw'
import sqlCardsGetDoneColumnDebug from './sql/cards/get-done-column-debug.sql?raw'
import sqlCardsSetEpic from './sql/cards/set-epic.sql?raw'
import sqlCardsArchive from './sql/cards/archive.sql?raw'
import sqlCardsUpdateMembers from './sql/cards/update-members.sql?raw'
import sqlBoardsMemberUpsert from './sql/boards/upsert-member.sql?raw'
import sqlBoardsGetMembers from './sql/boards/get-members.sql?raw'
import sqlCardListEntriesUpsert from './sql/card-list-entries/upsert.sql?raw'
import sqlCardListEntriesSetFallback from './sql/card-list-entries/set-fallback.sql?raw'
import sqlCardListEntriesClearForBoard from './sql/card-list-entries/clear-for-board.sql?raw'
import sqlBoardsSetCardListEntriesInitialized from './sql/boards/set-card-list-entries-initialized.sql?raw'
import sqlBoardsSetEpicBoard from './sql/boards/set-epic-board.sql?raw'
import sqlTemplatesGetGroups from './sql/templates/get-groups.sql?raw'
import sqlTemplatesInsertGroup from './sql/templates/insert-group.sql?raw'
import sqlTemplatesUpdateGroup from './sql/templates/update-group.sql?raw'
import sqlTemplatesDeleteGroup from './sql/templates/delete-group.sql?raw'
import sqlTemplatesGetByGroup from './sql/templates/get-by-group.sql?raw'
import sqlTemplatesInsert from './sql/templates/insert-template.sql?raw'
import sqlTemplatesUpdate from './sql/templates/update-template.sql?raw'
import sqlTemplatesDelete from './sql/templates/delete-template.sql?raw'
import sqlBoardsSetMyMember from './sql/boards/set-my-member.sql?raw'

let _db: Database.Database | null = null

// ─── Connection ────────────────────────────────────────────────────────────────

/**
 * Returns the singleton SQLite database, creating and migrating it on first
 * call.  The file lives in Electron's per-user data directory.
 */
export function getDb(): Database.Database {
  if (_db) return _db

  const dbPath = getDbPath()
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  _db = new Database(dbPath)
  _db.exec(schemaSql)

  // ── Column migrations ──────────────────────────────────────────────────────
  // CREATE TABLE IF NOT EXISTS won't add new columns to an existing table, so
  // we inspect the live schema and apply ALTER TABLE as needed.
  const cardCols = (_db.prepare('PRAGMA table_info(trello_cards)').all() as { name: string }[]).map(
    (c) => c.name
  )
  if (!cardCols.includes('pos')) {
    _db.exec('ALTER TABLE trello_cards ADD COLUMN pos REAL NOT NULL DEFAULT 0')
  }
  if (!cardCols.includes('short_url')) {
    _db.exec("ALTER TABLE trello_cards ADD COLUMN short_url TEXT NOT NULL DEFAULT ''")
  }
  if (!cardCols.includes('desc')) {
    _db.exec("ALTER TABLE trello_cards ADD COLUMN desc TEXT NOT NULL DEFAULT ''")
  }
  // SQLite has no "ADD COLUMN IF NOT EXISTS", so we try and ignore the error
  // if the column already exists (e.g. new installs where schema.sql created it).
  try {
    _db.exec(
      'ALTER TABLE board_configs ADD COLUMN card_list_entries_initialized INTEGER NOT NULL DEFAULT 0'
    )
  } catch {
    // Column already exists — nothing to do.
  }
  try {
    _db.exec('ALTER TABLE board_configs ADD COLUMN epic_board_id TEXT DEFAULT NULL')
  } catch {
    // Column already exists — nothing to do.
  }
  try {
    _db.exec('ALTER TABLE trello_cards ADD COLUMN epic_card_id TEXT DEFAULT NULL')
  } catch {
    // Column already exists — nothing to do.
  }
  try {
    _db.exec(
      'ALTER TABLE board_configs ADD COLUMN story_points_config TEXT NOT NULL DEFAULT \'[{"labelName":"Large","points":5},{"labelName":"Medium","points":3},{"labelName":"Small","points":1}]\''
    )
  } catch {
    // Column already exists — nothing to do.
  }
  try {
    _db.exec("ALTER TABLE ticket_templates ADD COLUMN label_ids TEXT NOT NULL DEFAULT '[]'")
  } catch {
    // Column already exists — nothing to do.
  }
  try {
    _db.exec('ALTER TABLE ticket_templates ADD COLUMN epic_card_id TEXT DEFAULT NULL')
  } catch {
    // Column already exists — nothing to do.
  }
  try {
    _db.exec('ALTER TABLE board_configs ADD COLUMN last_selected INTEGER NOT NULL DEFAULT 0')
  } catch {
    // Column already exists — nothing to do.
  }
  try {
    _db.exec('ALTER TABLE board_configs ADD COLUMN my_member_id TEXT DEFAULT NULL')
  } catch {
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
  `)

  // ── Encrypt any pre-existing plaintext credentials ─────────────────────────
  // Boards added before this migration store api_key / api_token as plaintext.
  // Detect them by the absence of the "enc:" prefix and re-write them using
  // encryptCredential so that all stored values are consistently encrypted.
  const plainBoards = _db
    .prepare(
      "SELECT board_id, api_key, api_token FROM board_configs WHERE api_key NOT LIKE 'enc:%' OR api_token NOT LIKE 'enc:%'"
    )
    .all() as Array<{ board_id: string; api_key: string; api_token: string }>
  const encStmt = _db.prepare(
    'UPDATE board_configs SET api_key = ?, api_token = ? WHERE board_id = ?'
  )
  for (const board of plainBoards) {
    // decryptCredential is a no-op for plaintext values, so this is safe even
    // if one credential is already encrypted and the other is not.
    encStmt.run(
      encryptCredential(decryptCredential(board.api_key)),
      encryptCredential(decryptCredential(board.api_token)),
      board.board_id
    )
  }

  return _db
}

// ─── Board Config ──────────────────────────────────────────────────────────────

export function getAllBoards(): BoardConfig[] {
  return (getDb().prepare(sqlBoardsGetAll).all() as Row[]).map(rowToBoardConfig)
}

export function getBoardById(boardId: string): BoardConfig | undefined {
  const row = getDb().prepare(sqlBoardsGetById).get(boardId)
  return row ? rowToBoardConfig(row as Row) : undefined
}

export function addBoard(input: BoardConfigInput): BoardConfig {
  const db = getDb()
  const result = db.prepare(sqlBoardsInsert).run({
    boardId: input.boardId,
    boardName: input.boardName,
    apiKey: encryptCredential(input.apiKey),
    apiToken: encryptCredential(input.apiToken),
    projectCode: input.projectCode.toUpperCase(),
    nextTicketNumber: input.nextTicketNumber,
    doneListNames: JSON.stringify(input.doneListNames)
  })

  return rowToBoardConfig(db.prepare(sqlBoardsGetByRowId).get(result.lastInsertRowid) as Row)
}

export function updateBoard(boardId: string, updates: Partial<BoardConfigInput>): BoardConfig {
  const existing = getBoardById(boardId)
  if (!existing) throw new Error(`Board not found: ${boardId}`)

  getDb()
    .prepare(sqlBoardsUpdate)
    .run({
      boardId,
      boardName: updates.boardName ?? existing.boardName,
      apiKey: encryptCredential(updates.apiKey ?? existing.apiKey),
      apiToken: encryptCredential(updates.apiToken ?? existing.apiToken),
      projectCode: (updates.projectCode ?? existing.projectCode).toUpperCase(),
      nextTicketNumber: updates.nextTicketNumber ?? existing.nextTicketNumber,
      doneListNames: JSON.stringify(updates.doneListNames ?? existing.doneListNames),
      storyPointsConfig: JSON.stringify(updates.storyPointsConfig ?? existing.storyPointsConfig)
    })

  return getBoardById(boardId)!
}

export function deleteBoard(boardId: string): void {
  getDb().prepare(sqlBoardsDelete).run(boardId)
}

/**
 * Set (or clear) the epic board for a story board.
 * Pass null for epicBoardId to unlink the epic board.
 */
export function setEpicBoard(boardId: string, epicBoardId: string | null): BoardConfig {
  if (!getBoardById(boardId)) throw new Error(`Board not found: ${boardId}`)
  getDb().prepare(sqlBoardsSetEpicBoard).run({ boardId, epicBoardId })
  return getBoardById(boardId)!
}

/**
 * Returns the boardId of the board most recently selected by the user, or
 * undefined if no board has been explicitly selected yet.
 */
export function getLastSelectedBoardId(): string | undefined {
  const row = getDb()
    .prepare('SELECT board_id FROM board_configs WHERE last_selected = 1 LIMIT 1')
    .get() as { board_id: string } | undefined
  return row?.board_id
}

/**
 * Marks the given board as the last-selected one.  Clears the flag on all
 * other boards so that at most one row ever has last_selected = 1.
 */
export function setLastSelectedBoardId(boardId: string): void {
  const db = getDb()
  db.transaction(() => {
    db.prepare('UPDATE board_configs SET last_selected = 0').run()
    db.prepare('UPDATE board_configs SET last_selected = 1 WHERE board_id = ?').run(boardId)
  })()
}

/**
 * Set (or clear) the member identity for gamification on this board.
 * Pass null for myMemberId to unset the identity.
 */
export function setMyMember(boardId: string, myMemberId: string | null): BoardConfig {
  if (!getBoardById(boardId)) throw new Error(`Board not found: ${boardId}`)
  getDb().prepare(sqlBoardsSetMyMember).run({ boardId, myMemberId })
  return getBoardById(boardId)!
}

// ─── Lists ─────────────────────────────────────────────────────────────────────

/**
 * Upsert a batch of lists fetched from Trello.
 * ON CONFLICT updates name/pos so renames are reflected on re-sync.
 */
export function upsertLists(boardId: string, lists: TrelloList[]): void {
  const db = getDb()
  const stmt = db.prepare(sqlListsUpsert)

  db.transaction((rows: TrelloList[]) => {
    for (const l of rows) {
      stmt.run({ id: l.id, boardId, name: l.name, pos: l.pos, closed: l.closed ? 1 : 0 })
    }
  })(lists)
}

/**
 * After upserting the fresh list from Trello, mark any list that was NOT
 * returned as closed (it was archived or deleted on the Trello board).
 */
export function markRemovedLists(boardId: string, freshListIds: string[]): void {
  if (freshListIds.length === 0) {
    getDb().prepare(sqlListsMarkAllRemoved).run(boardId)
    return
  }
  getDb().prepare(sqlListsMarkRemoved).run(boardId, JSON.stringify(freshListIds))
}

// ─── Cards ─────────────────────────────────────────────────────────────────────

/**
 * Upsert a batch of cards fetched from Trello.
 *
 * The PRIMARY KEY is Trello's card `id` — guaranteed globally unique.
 * ON CONFLICT updates every mutable field, including `list_id`, which
 * is how a card moving between columns is reflected after re-sync.
 */
export function upsertCards(boardId: string, cards: TrelloCard[]): void {
  const db = getDb()
  const stmt = db.prepare(sqlCardsUpsert)

  db.transaction((rows: TrelloCard[]) => {
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
        labelsJson: JSON.stringify(c.labels ?? []),
        membersJson: JSON.stringify(c.members ?? [])
      })
    }
  })(cards)
}

/**
 * After upserting the fresh card list from Trello, mark any card that was NOT
 * returned as closed = 1 (it was archived or deleted on the Trello board).
 */
export function markRemovedCards(boardId: string, freshCardIds: string[]): void {
  if (freshCardIds.length === 0) {
    getDb().prepare(sqlCardsMarkAllRemoved).run(boardId)
    return
  }
  getDb().prepare(sqlCardsMarkRemoved).run(boardId, JSON.stringify(freshCardIds))
}

/** Stamp the board row with the current UTC time after a successful sync. */
export function updateBoardSyncTime(boardId: string): void {
  getDb().prepare(sqlBoardsUpdateSyncTime).run(boardId)
}

// ─── Kanban ────────────────────────────────────────────────────────────────────

interface ListRow {
  id: string
  name: string
  pos: number
}

interface CardRow {
  id: string
  name: string
  desc: string
  list_id: string
  pos: number
  short_url: string
  labels_json: string
  members_json: string
  date_last_activity: string
  epic_card_id: string | null
  epic_card_name: string | null
  entered_at: string | null
}

interface EpicCardRow {
  id: string
  name: string
  list_id: string
  list_name: string
}

interface EpicStoryRow {
  id: string
  name: string
  desc: string
  list_id: string
  list_name: string
  board_name: string
  pos: number
  short_url: string
  labels_json: string
  members_json: string
  date_last_activity: string
}

export function getListsForBoard(boardId: string): ListRow[] {
  return getDb().prepare(sqlKanbanGetLists).all(boardId) as ListRow[]
}

export function getCardsForBoard(boardId: string): CardRow[] {
  return getDb().prepare(sqlKanbanGetCards).all(boardId) as CardRow[]
}

export function moveCardToList(cardId: string, toListId: string, pos: number): void {
  getDb().prepare(sqlKanbanMoveCard).run({ cardId, toListId, pos })
}

/** Update only the position of a card (used when reordering within a column). */
export function updateCardPos(cardId: string, pos: number): void {
  getDb().prepare(sqlCardsUpdatePos).run({ cardId, pos })
}

/** Set the epic card reference on a story card (null clears it). */
export function setCardEpic(cardId: string, epicCardId: string | null): void {
  getDb().prepare(sqlCardsSetEpic).run({ cardId, epicCardId })
}

/** Set the epic card reference on multiple story cards in a single transaction. */
export function setBulkCardEpic(cardIds: string[], epicCardId: string | null): void {
  const db = getDb()
  const stmt = db.prepare(sqlCardsSetEpic)
  // db.transaction() returns a function; calling it with cardIds runs all
  // stmt.run() calls atomically inside a single SQLite transaction.
  db.transaction((ids: string[]) => {
    for (const cardId of ids) {
      stmt.run({ cardId, epicCardId })
    }
  })(cardIds)
}

/** Returns open cards from the epic board linked to the given story board. */
export function getEpicCardsForBoard(storyBoardId: string): EpicCardRow[] {
  return getDb().prepare(sqlKanbanGetEpicCards).all(storyBoardId) as EpicCardRow[]
}

/** Returns all open story cards assigned to the given epic card. */
export function getStoriesForEpic(epicCardId: string): EpicStoryRow[] {
  return getDb().prepare(sqlKanbanGetStoriesForEpic).all(epicCardId) as EpicStoryRow[]
}

/** Mark a single card as archived in the local cache. */
export function archiveCardLocally(cardId: string): void {
  getDb().prepare(sqlCardsArchive).run({ cardId })
}

/** Insert a single freshly-created card into the local cache. */
export function insertCard(boardId: string, card: TrelloCard): void {
  getDb()
    .prepare(sqlCardsUpsert)
    .run({
      id: card.id,
      boardId,
      listId: card.idList,
      name: card.name,
      desc: card.desc ?? '',
      closed: 0,
      dateLastActivity: card.dateLastActivity ?? new Date().toISOString(),
      pos: card.pos,
      shortUrl: card.shortUrl ?? '',
      labelsJson: JSON.stringify(card.labels ?? []),
      membersJson: JSON.stringify(card.members ?? [])
    })
}

/** Update the members_json for a card after a member assignment change. */
export function updateCardMembers(cardId: string, members: TrelloMember[]): void {
  getDb()
    .prepare(sqlCardsUpdateMembers)
    .run({ cardId, membersJson: JSON.stringify(members) })
}

/** Update the labels_json for a card after a label assignment change. */
export function updateCardLabels(cardId: string, labels: TrelloLabel[]): void {
  getDb()
    .prepare('UPDATE trello_cards SET labels_json = @labelsJson WHERE id = @cardId')
    .run({ cardId, labelsJson: JSON.stringify(labels) })
}

/** Returns the labels_json string for a card, or undefined if not found. */
export function getCardLabelsJson(cardId: string): string | undefined {
  const row = getDb().prepare('SELECT labels_json FROM trello_cards WHERE id = ?').get(cardId) as
    | { labels_json: string }
    | undefined
  return row?.labels_json
}

// ─── Board Members ─────────────────────────────────────────────────────────────

interface MemberRow {
  id: string
  full_name: string
  username: string
}

/** Upsert the full list of board members fetched from Trello. */
export function upsertBoardMembers(boardId: string, members: TrelloMember[]): void {
  const db = getDb()
  const stmt = db.prepare(sqlBoardsMemberUpsert)
  db.transaction((rows: TrelloMember[]) => {
    for (const m of rows) {
      stmt.run({ id: m.id, boardId, fullName: m.fullName, username: m.username })
    }
  })(members)
}

/** Returns the members_json string for a card, or undefined if not found. */
export function getCardMembersJson(cardId: string): string | undefined {
  const row = getDb().prepare('SELECT members_json FROM trello_cards WHERE id = ?').get(cardId) as
    | { members_json: string }
    | undefined
  return row?.members_json
}

/** Returns all cached board members, ordered alphabetically by full name. */
export function getBoardMembers(boardId: string): TrelloMember[] {
  return (getDb().prepare(sqlBoardsGetMembers).all(boardId) as MemberRow[]).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    username: r.username
  }))
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
`

/**
 * Persist a batch of Trello actions.
 * Uses INSERT OR IGNORE because actions are immutable once created on Trello.
 */
export function upsertActions(boardId: string, actions: TrelloAction[]): void {
  const db = getDb()
  const stmt = db.prepare(sqlActionsUpsert)

  db.transaction((rows: TrelloAction[]) => {
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
      })
    }
  })(actions)
}

interface ActionInsertRow {
  id: string
  boardId: string
  cardId: string | null
  actionType: string
  actionDate: string
  memberId: string | null
  memberName: string | null
  listBeforeId: string | null
  listBeforeName: string | null
  listAfterId: string | null
  listAfterName: string | null
}

/** Insert a single action row (used for local optimistic move tracking). */
export function insertActionRow(row: ActionInsertRow): void {
  getDb().prepare(sqlActionsUpsert).run(row)
}

/**
 * Returns the ISO-8601 date of the most recently stored action for this board,
 * or null if no actions have been synced yet.  Used as the `since` parameter
 * on incremental syncs to avoid re-fetching the full action history.
 */
export function getLatestActionDate(boardId: string): string | null {
  const row = getDb()
    .prepare(
      "SELECT MAX(action_date) AS latest FROM trello_actions WHERE board_id = ? AND id NOT LIKE 'local-%'"
    )
    .get(boardId) as { latest: string | null }
  return row?.latest ?? null
}

// ─── Card List Entries ─────────────────────────────────────────────────────────

/**
 * Upsert the timestamp when a card entered a list.
 * MAX() keeps the most-recent value so that re-processing the same events is
 * safe — only a newer timestamp can overwrite an existing one.  This means the
 * table must be cleared (clearCardListEntriesForBoard) before re-running a
 * full-history fetch so stale "today" rows can't block historical dates.
 */
export function upsertCardListEntry(cardId: string, listId: string, enteredAt: string): void {
  getDb().prepare(sqlCardListEntriesUpsert).run({ cardId, listId, enteredAt })
}

/**
 * Delete all card_list_entries rows for the given board.
 * Called before a full-history rebuild to ensure stale rows written by old
 * code (e.g. entered_at = now()) can't survive and block correct timestamps.
 */
export function clearCardListEntriesForBoard(boardId: string): void {
  getDb().prepare(sqlCardListEntriesClearForBoard).run({ boardId })
}

/**
 * Returns true when the card_list_entries table for this board has been
 * fully initialized from Trello's action history.
 * A board starts with card_list_entries_initialized = 0 (the default),
 * including boards upgraded from a version that lacked this column.
 * The sync flow sets it to 1 after a successful full-history fetch.
 */
export function isCardListEntriesInitialized(boardId: string): boolean {
  const row = getDb()
    .prepare(`SELECT card_list_entries_initialized FROM board_configs WHERE board_id = ?`)
    .get(boardId) as { card_list_entries_initialized: number } | undefined
  return (row?.card_list_entries_initialized ?? 0) === 1
}

/**
 * Mark the board's card_list_entries as fully initialized.
 * Called after a successful full-history action fetch so subsequent syncs
 * only need to fetch incremental actions.
 */
export function setCardListEntriesInitialized(boardId: string): void {
  getDb().prepare(sqlBoardsSetCardListEntriesInitialized).run({ boardId })
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
export function setCardListEntryFallback(boardId: string): void {
  getDb().prepare(sqlCardListEntriesSetFallback).run({ boardId })
}

/**
 * Returns all open cards that live in one of the given done-list names and
 * that have been in the done column since before the supplied ISO-8601 cutoff.
 */
export function getDoneCardsOlderThan(
  boardId: string,
  doneListNames: string[],
  cutoffDate: string
): { id: string; name: string; listId: string; listName: string; enteredDoneAt: string }[] {
  return getDb()
    .prepare(sqlCardsGetDoneOlderThan)
    .all({
      boardId,
      doneListNames: JSON.stringify(doneListNames),
      cutoffDate
    }) as { id: string; name: string; listId: string; listName: string; enteredDoneAt: string }[]
}

/**
 * Diagnostic query: returns ALL open cards in the done column(s) with raw
 * timestamp data so the UI can show what is actually stored.
 */
export function getDoneColumnDebug(
  boardId: string,
  doneListNames: string[]
): {
  id: string
  name: string
  listId: string
  listName: string
  enteredDoneAt: string
  dateLastActivity: string
  cardSyncedAt: string
  hasActionEntry: 0 | 1
}[] {
  return getDb()
    .prepare(sqlCardsGetDoneColumnDebug)
    .all({
      boardId,
      doneListNames: JSON.stringify(doneListNames)
    }) as {
    id: string
    name: string
    listId: string
    listName: string
    enteredDoneAt: string
    dateLastActivity: string
    cardSyncedAt: string
    hasActionEntry: 0 | 1
  }[]
}

// ─── Row Mapper ────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>

function rowToBoardConfig(row: Row): BoardConfig {
  const defaultStoryPoints: StoryPointRule[] = [
    { labelName: 'Large', points: 5 },
    { labelName: 'Medium', points: 3 },
    { labelName: 'Small', points: 1 }
  ]
  return {
    id: row.id as number,
    boardId: row.board_id as string,
    boardName: row.board_name as string,
    apiKey: decryptCredential(row.api_key as string),
    apiToken: decryptCredential(row.api_token as string),
    projectCode: row.project_code as string,
    nextTicketNumber: row.next_ticket_number as number,
    doneListNames: JSON.parse(row.done_list_names as string),
    storyPointsConfig: row.story_points_config
      ? (JSON.parse(row.story_points_config as string) as StoryPointRule[])
      : defaultStoryPoints,
    lastSyncedAt: (row.last_synced_at as string | null) ?? null,
    epicBoardId: (row.epic_board_id as string | null) ?? null,
    myMemberId: (row.my_member_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

// ─── Template Groups ───────────────────────────────────────────────────────────

export function getTemplateGroups(boardId: string): TemplateGroup[] {
  return (getDb().prepare(sqlTemplatesGetGroups).all({ boardId }) as Row[]).map(rowToTemplateGroup)
}

export function createTemplateGroup(boardId: string, input: TemplateGroupInput): TemplateGroup {
  const db = getDb()
  const result = db.prepare(sqlTemplatesInsertGroup).run({ boardId, name: input.name })
  const row = db
    .prepare('SELECT id, board_id, name, created_at, updated_at FROM template_groups WHERE id = ?')
    .get(result.lastInsertRowid) as Row
  return rowToTemplateGroup(row)
}

export function updateTemplateGroup(
  boardId: string,
  id: number,
  input: TemplateGroupInput
): boolean {
  const result = getDb().prepare(sqlTemplatesUpdateGroup).run({ id, boardId, name: input.name })
  return result.changes > 0
}

export function deleteTemplateGroup(boardId: string, id: number): boolean {
  const result = getDb().prepare(sqlTemplatesDeleteGroup).run({ id, boardId })
  return result.changes > 0
}

// ─── Ticket Templates ──────────────────────────────────────────────────────────

export function getTemplatesByGroup(boardId: string, groupId: number): TicketTemplate[] {
  return (getDb().prepare(sqlTemplatesGetByGroup).all({ boardId, groupId }) as Row[]).map(
    rowToTicketTemplate
  )
}

export function createTicketTemplate(boardId: string, input: TicketTemplateInput): TicketTemplate {
  const db = getDb()
  const result = db.prepare(sqlTemplatesInsert).run({
    boardId,
    groupId: input.groupId,
    name: input.name,
    titleTemplate: input.titleTemplate,
    descTemplate: input.descTemplate ?? '',
    listId: input.listId,
    listName: input.listName,
    labelIds: JSON.stringify(input.labelIds ?? []),
    epicCardId: input.epicCardId ?? null,
    position: input.position ?? 0
  })
  const row = db
    .prepare(
      `SELECT id, board_id, group_id, name, title_template, desc_template,
              list_id, list_name, label_ids, epic_card_id, position, created_at, updated_at
       FROM ticket_templates WHERE id = ?`
    )
    .get(result.lastInsertRowid) as Row
  return rowToTicketTemplate(row)
}

export function updateTicketTemplate(
  boardId: string,
  id: number,
  input: TicketTemplateInput
): boolean {
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
      labelIds: JSON.stringify(input.labelIds ?? []),
      epicCardId: input.epicCardId ?? null,
      position: input.position ?? 0
    })
  return result.changes > 0
}

export function deleteTicketTemplate(boardId: string, id: number): boolean {
  const result = getDb().prepare(sqlTemplatesDelete).run({ id, boardId })
  return result.changes > 0
}

// ─── Template Row Mappers ──────────────────────────────────────────────────────

function rowToTemplateGroup(row: Row): TemplateGroup {
  return {
    id: row.id as number,
    boardId: row.board_id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

function rowToTicketTemplate(row: Row): TicketTemplate {
  return {
    id: row.id as number,
    boardId: row.board_id as string,
    groupId: row.group_id as number,
    name: row.name as string,
    titleTemplate: row.title_template as string,
    descTemplate: (row.desc_template as string) ?? '',
    listId: row.list_id as string,
    listName: row.list_name as string,
    labelIds: row.label_ids ? (JSON.parse(row.label_ids as string) as string[]) : [],
    epicCardId: (row.epic_card_id as string | null) ?? null,
    position: row.position as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

/**
 * Returns distinct Trello labels seen on cards for the given board.
 * Aggregated from the labels_json column of cached cards — requires at
 * least one sync to have run.
 */
export function getBoardLabels(boardId: string): TrelloLabel[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT labels_json FROM trello_cards
       WHERE board_id = ? AND labels_json IS NOT NULL AND labels_json != '[]'`
    )
    .all(boardId) as { labels_json: string }[]
  const labelsMap = new Map<string, TrelloLabel>()
  for (const r of rows) {
    try {
      const labels: TrelloLabel[] = JSON.parse(r.labels_json)
      for (const l of labels) {
        labelsMap.set(l.id, l)
      }
    } catch {
      // Skip unparseable rows.
    }
  }
  return [...labelsMap.values()]
}
