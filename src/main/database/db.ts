import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { CREATE_TABLES_SQL } from './schema'
import type {
  BoardConfig,
  BoardConfigInput,
  TrelloCard,
  TrelloList,
  TrelloMember,
  TrelloAction
} from '@shared/types'

let _db: Database.Database | null = null

/**
 * Returns the singleton SQLite database instance.
 * The database file is stored in Electron's userData directory.
 */
export function getDb(): Database.Database {
  if (_db) return _db

  const userDataPath = app.getPath('userData')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  const dbPath = path.join(userDataPath, 'agile-life.db')
  _db = new Database(dbPath)

  // Apply schema (idempotent CREATE TABLE IF NOT EXISTS statements)
  _db.exec(CREATE_TABLES_SQL)

  return _db
}

// ─── Board Config Queries ──────────────────────────────────────────────────────

export function getAllBoards(): BoardConfig[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, board_id, board_name, api_key, api_token, project_code,
              next_ticket_number, done_list_names, created_at, updated_at
       FROM board_configs
       ORDER BY created_at ASC`
    )
    .all() as Record<string, unknown>[]

  return rows.map(rowToBoardConfig)
}

export function getBoardById(boardId: string): BoardConfig | undefined {
  const db = getDb()
  const row = db
    .prepare(`SELECT * FROM board_configs WHERE board_id = ?`)
    .get(boardId) as Record<string, unknown> | undefined

  return row ? rowToBoardConfig(row) : undefined
}

export function addBoard(input: BoardConfigInput): BoardConfig {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO board_configs
      (board_id, board_name, api_key, api_token, project_code, next_ticket_number, done_list_names)
    VALUES
      (@boardId, @boardName, @apiKey, @apiToken, @projectCode, @nextTicketNumber, @doneListNames)
  `)

  const result = stmt.run({
    boardId: input.boardId,
    boardName: input.boardName,
    apiKey: input.apiKey,
    apiToken: input.apiToken,
    projectCode: input.projectCode.toUpperCase(),
    nextTicketNumber: input.nextTicketNumber,
    doneListNames: JSON.stringify(input.doneListNames)
  })

  const row = db
    .prepare(`SELECT * FROM board_configs WHERE id = ?`)
    .get(result.lastInsertRowid) as Record<string, unknown>

  return rowToBoardConfig(row)
}

export function updateBoard(boardId: string, updates: Partial<BoardConfigInput>): BoardConfig {
  const db = getDb()
  const existing = getBoardById(boardId)
  if (!existing) throw new Error(`Board ${boardId} not found`)

  const merged = {
    boardName: updates.boardName ?? existing.boardName,
    apiKey: updates.apiKey ?? existing.apiKey,
    apiToken: updates.apiToken ?? existing.apiToken,
    projectCode: (updates.projectCode ?? existing.projectCode).toUpperCase(),
    nextTicketNumber: updates.nextTicketNumber ?? existing.nextTicketNumber,
    doneListNames: updates.doneListNames ?? existing.doneListNames,
    boardId
  }

  db.prepare(`
    UPDATE board_configs
    SET board_name = @boardName,
        api_key = @apiKey,
        api_token = @apiToken,
        project_code = @projectCode,
        next_ticket_number = @nextTicketNumber,
        done_list_names = @doneListNames,
        updated_at = datetime('now')
    WHERE board_id = @boardId
  `).run({ ...merged, doneListNames: JSON.stringify(merged.doneListNames) })

  return getBoardById(boardId)!
}

export function deleteBoard(boardId: string): void {
  const db = getDb()
  db.prepare(`DELETE FROM board_configs WHERE board_id = ?`).run(boardId)
}

// ─── Trello Data Upsert Queries ────────────────────────────────────────────────

export function upsertLists(boardId: string, lists: TrelloList[]): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO trello_lists (id, board_id, name, closed, pos)
    VALUES (@id, @boardId, @name, @closed, @pos)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      closed = excluded.closed,
      pos = excluded.pos,
      synced_at = datetime('now')
  `)

  const upsertMany = db.transaction((items: TrelloList[]) => {
    for (const l of items) {
      stmt.run({ id: l.id, boardId, name: l.name, closed: l.closed ? 1 : 0, pos: l.pos })
    }
  })

  upsertMany(lists)
}

export function getLists(boardId: string): TrelloList[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, board_id as idBoard, name, closed, pos FROM trello_lists
       WHERE board_id = ? ORDER BY pos ASC`
    )
    .all(boardId) as TrelloList[]
}

export function upsertMembers(boardId: string, members: TrelloMember[]): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO trello_members (id, board_id, full_name, username, avatar_url)
    VALUES (@id, @boardId, @fullName, @username, @avatarUrl)
    ON CONFLICT(id) DO UPDATE SET
      full_name = excluded.full_name,
      username = excluded.username,
      avatar_url = excluded.avatar_url,
      synced_at = datetime('now')
  `)

  const upsertMany = db.transaction((items: TrelloMember[]) => {
    for (const m of items) {
      stmt.run({ id: m.id, boardId, fullName: m.fullName, username: m.username, avatarUrl: m.avatarUrl ?? null })
    }
  })

  upsertMany(members)
}

export function getMembers(boardId: string): TrelloMember[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, board_id as idBoard, full_name as fullName, username, avatar_url as avatarUrl
       FROM trello_members WHERE board_id = ?`
    )
    .all(boardId) as TrelloMember[]
}

export function upsertCards(boardId: string, cards: TrelloCard[]): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO trello_cards
      (id, board_id, list_id, name, desc, closed, due, due_complete,
       date_last_activity, labels_json, members_json, short_url, url)
    VALUES
      (@id, @boardId, @listId, @name, @desc, @closed, @due, @dueComplete,
       @dateLastActivity, @labelsJson, @membersJson, @shortUrl, @url)
    ON CONFLICT(id) DO UPDATE SET
      list_id = excluded.list_id,
      name = excluded.name,
      desc = excluded.desc,
      closed = excluded.closed,
      due = excluded.due,
      due_complete = excluded.due_complete,
      date_last_activity = excluded.date_last_activity,
      labels_json = excluded.labels_json,
      members_json = excluded.members_json,
      short_url = excluded.short_url,
      url = excluded.url,
      synced_at = datetime('now')
  `)

  const upsertMany = db.transaction((items: TrelloCard[]) => {
    for (const c of items) {
      stmt.run({
        id: c.id,
        boardId,
        listId: c.idList,
        name: c.name,
        desc: c.desc,
        closed: c.closed ? 1 : 0,
        due: c.due ?? null,
        dueComplete: c.dueComplete ? 1 : 0,
        dateLastActivity: c.dateLastActivity,
        labelsJson: JSON.stringify(c.labels),
        membersJson: JSON.stringify(c.members),
        shortUrl: c.shortUrl,
        url: c.url
      })
    }
  })

  upsertMany(cards)
}

export function getCards(boardId: string, includeArchived = false): TrelloCard[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, board_id as idBoard, list_id as idList, name, desc, closed, due, due_complete as dueComplete,
              date_last_activity as dateLastActivity, labels_json, members_json, short_url as shortUrl, url
       FROM trello_cards
       WHERE board_id = ? ${includeArchived ? '' : 'AND closed = 0'}
       ORDER BY name ASC`
    )
    .all(boardId) as Record<string, unknown>[]

  return rows.map((r) => ({
    ...(r as unknown as TrelloCard),
    labels: JSON.parse(r.labels_json as string),
    members: JSON.parse(r.members_json as string),
    idLabels: (JSON.parse(r.labels_json as string) as { id: string }[]).map((l) => l.id),
    idMembers: (JSON.parse(r.members_json as string) as { id: string }[]).map((m) => m.id),
    closed: r.closed === 1
  }))
}

export function upsertActions(boardId: string, actions: TrelloAction[]): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO trello_actions
      (id, board_id, card_id, action_type, action_date, member_id, member_name,
       list_before_id, list_before_name, list_after_id, list_after_name)
    VALUES
      (@id, @boardId, @cardId, @actionType, @actionDate, @memberId, @memberName,
       @listBeforeId, @listBeforeName, @listAfterId, @listAfterName)
  `)

  const insertMany = db.transaction((items: TrelloAction[]) => {
    for (const a of items) {
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
  })

  insertMany(actions)
}

// ─── Row Mappers ───────────────────────────────────────────────────────────────

function rowToBoardConfig(row: Record<string, unknown>): BoardConfig {
  return {
    id: row.id as number,
    boardId: row.board_id as string,
    boardName: row.board_name as string,
    apiKey: row.api_key as string,
    apiToken: row.api_token as string,
    projectCode: row.project_code as string,
    nextTicketNumber: row.next_ticket_number as number,
    doneListNames: JSON.parse(row.done_list_names as string),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}
