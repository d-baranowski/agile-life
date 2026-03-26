import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import type { BoardConfig, BoardConfigInput } from '@shared/board.types'
import { getDbPath } from '../settings/appSettings'
import type { TrelloList, TrelloCard } from '@shared/trello.types'

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
import sqlCardsUpdatePos from './sql/cards/update-pos.sql?raw'

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

  // ── Migrations for existing databases ──────────────────────────────────────
  // CREATE TABLE IF NOT EXISTS won't add new columns to an existing table, so
  // we inspect the live schema and apply ALTER TABLE as needed.
  const cardCols = (
    _db.prepare('PRAGMA table_info(trello_cards)').all() as { name: string }[]
  ).map((c) => c.name)
  if (!cardCols.includes('pos')) {
    _db.exec('ALTER TABLE trello_cards ADD COLUMN pos REAL NOT NULL DEFAULT 0')
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
    apiKey: input.apiKey,
    apiToken: input.apiToken,
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
      apiKey: updates.apiKey ?? existing.apiKey,
      apiToken: updates.apiToken ?? existing.apiToken,
      projectCode: (updates.projectCode ?? existing.projectCode).toUpperCase(),
      nextTicketNumber: updates.nextTicketNumber ?? existing.nextTicketNumber,
      doneListNames: JSON.stringify(updates.doneListNames ?? existing.doneListNames)
    })

  return getBoardById(boardId)!
}

export function deleteBoard(boardId: string): void {
  getDb().prepare(sqlBoardsDelete).run(boardId)
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
        closed: c.closed ? 1 : 0,
        dateLastActivity: c.dateLastActivity,
        pos: c.pos,
        labelsJson: JSON.stringify(c.labels),
        membersJson: JSON.stringify(c.members)
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
  list_id: string
  pos: number
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

export function moveCardToList(cardId: string, toListId: string): void {
  getDb().prepare(sqlKanbanMoveCard).run({ cardId, toListId })
}

/** Update only the position of a card (used when reordering within a column). */
export function updateCardPos(cardId: string, pos: number): void {
  getDb().prepare(sqlCardsUpdatePos).run({ cardId, pos })
}

// ─── Row Mapper ────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>

function rowToBoardConfig(row: Row): BoardConfig {
  return {
    id: row.id as number,
    boardId: row.board_id as string,
    boardName: row.board_name as string,
    apiKey: row.api_key as string,
    apiToken: row.api_token as string,
    projectCode: row.project_code as string,
    nextTicketNumber: row.next_ticket_number as number,
    doneListNames: JSON.parse(row.done_list_names as string),
    lastSyncedAt: (row.last_synced_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}
