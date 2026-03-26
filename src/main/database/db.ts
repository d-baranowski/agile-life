import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { CREATE_TABLES_SQL } from './schema'
import type { BoardConfig, BoardConfigInput } from '@shared/board.types'
import type { TrelloList, TrelloCard } from '@shared/trello.types'

let _db: Database.Database | null = null

// ─── Connection ────────────────────────────────────────────────────────────────

/**
 * Returns the singleton SQLite database, creating and migrating it on first
 * call.  The file lives in Electron's per-user data directory.
 */
export function getDb(): Database.Database {
  if (_db) return _db

  const dir = app.getPath('userData')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  _db = new Database(path.join(dir, 'agile-life.db'))
  _db.exec(CREATE_TABLES_SQL)
  return _db
}

// ─── Board Config ──────────────────────────────────────────────────────────────

export function getAllBoards(): BoardConfig[] {
  return getDb()
    .prepare(
      `SELECT id, board_id, board_name, api_key, api_token, project_code,
              next_ticket_number, done_list_names, last_synced_at, created_at, updated_at
       FROM board_configs ORDER BY created_at ASC`
    )
    .all()
    .map(rowToBoardConfig)
}

export function getBoardById(boardId: string): BoardConfig | undefined {
  const row = getDb().prepare(`SELECT * FROM board_configs WHERE board_id = ?`).get(boardId)
  return row ? rowToBoardConfig(row as Row) : undefined
}

export function addBoard(input: BoardConfigInput): BoardConfig {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO board_configs
         (board_id, board_name, api_key, api_token, project_code, next_ticket_number, done_list_names)
       VALUES
         (@boardId, @boardName, @apiKey, @apiToken, @projectCode, @nextTicketNumber, @doneListNames)`
    )
    .run({
      boardId: input.boardId,
      boardName: input.boardName,
      apiKey: input.apiKey,
      apiToken: input.apiToken,
      projectCode: input.projectCode.toUpperCase(),
      nextTicketNumber: input.nextTicketNumber,
      doneListNames: JSON.stringify(input.doneListNames)
    })

  return rowToBoardConfig(
    db.prepare(`SELECT * FROM board_configs WHERE id = ?`).get(result.lastInsertRowid) as Row
  )
}

export function updateBoard(boardId: string, updates: Partial<BoardConfigInput>): BoardConfig {
  const existing = getBoardById(boardId)
  if (!existing) throw new Error(`Board not found: ${boardId}`)

  const next = {
    boardName: updates.boardName ?? existing.boardName,
    apiKey: updates.apiKey ?? existing.apiKey,
    apiToken: updates.apiToken ?? existing.apiToken,
    projectCode: (updates.projectCode ?? existing.projectCode).toUpperCase(),
    nextTicketNumber: updates.nextTicketNumber ?? existing.nextTicketNumber,
    doneListNames: JSON.stringify(updates.doneListNames ?? existing.doneListNames)
  }

  getDb()
    .prepare(
      `UPDATE board_configs
       SET board_name = @boardName, api_key = @apiKey, api_token = @apiToken,
           project_code = @projectCode, next_ticket_number = @nextTicketNumber,
           done_list_names = @doneListNames, updated_at = datetime('now')
       WHERE board_id = @boardId`
    )
    .run({ ...next, boardId })

  return getBoardById(boardId)!
}

export function deleteBoard(boardId: string): void {
  getDb().prepare(`DELETE FROM board_configs WHERE board_id = ?`).run(boardId)
}

// ─── Lists ─────────────────────────────────────────────────────────────────────

/**
 * Upsert a batch of lists fetched from Trello.
 * ON CONFLICT updates name/pos so renames are reflected on re-sync.
 */
export function upsertLists(boardId: string, lists: TrelloList[]): void {
  const db = getDb()
  const stmt = db.prepare(
    `INSERT INTO trello_lists (id, board_id, name, pos, closed)
     VALUES (@id, @boardId, @name, @pos, @closed)
     ON CONFLICT(id) DO UPDATE SET
       name      = excluded.name,
       pos       = excluded.pos,
       closed    = excluded.closed,
       synced_at = datetime('now')`
  )

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
  const db = getDb()
  if (freshListIds.length === 0) {
    db.prepare(
      `UPDATE trello_lists SET closed = 1, synced_at = datetime('now')
       WHERE board_id = ? AND closed = 0`
    ).run(boardId)
    return
  }
  db.prepare(
    `UPDATE trello_lists SET closed = 1, synced_at = datetime('now')
     WHERE board_id = ? AND closed = 0
       AND id NOT IN (SELECT value FROM json_each(?))`
  ).run(boardId, JSON.stringify(freshListIds))
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
  const stmt = db.prepare(
    `INSERT INTO trello_cards
       (id, board_id, list_id, name, closed, date_last_activity, labels_json, members_json)
     VALUES
       (@id, @boardId, @listId, @name, @closed, @dateLastActivity, @labelsJson, @membersJson)
     ON CONFLICT(id) DO UPDATE SET
       list_id            = excluded.list_id,
       name               = excluded.name,
       closed             = excluded.closed,
       date_last_activity = excluded.date_last_activity,
       labels_json        = excluded.labels_json,
       members_json       = excluded.members_json,
       synced_at          = datetime('now')`
  )

  db.transaction((rows: TrelloCard[]) => {
    for (const c of rows) {
      stmt.run({
        id: c.id,
        boardId,
        listId: c.idList,
        name: c.name,
        closed: c.closed ? 1 : 0,
        dateLastActivity: c.dateLastActivity,
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
  const db = getDb()
  if (freshCardIds.length === 0) {
    db.prepare(
      `UPDATE trello_cards SET closed = 1, synced_at = datetime('now')
       WHERE board_id = ? AND closed = 0`
    ).run(boardId)
    return
  }
  db.prepare(
    `UPDATE trello_cards SET closed = 1, synced_at = datetime('now')
     WHERE board_id = ? AND closed = 0
       AND id NOT IN (SELECT value FROM json_each(?))`
  ).run(boardId, JSON.stringify(freshCardIds))
}

/** Stamp the board row with the current UTC time after a successful sync. */
export function updateBoardSyncTime(boardId: string): void {
  getDb()
    .prepare(
      `UPDATE board_configs
       SET last_synced_at = datetime('now'), updated_at = datetime('now')
       WHERE board_id = ?`
    )
    .run(boardId)
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
