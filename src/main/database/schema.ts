/**
 * SQLite schema for Agile Life — POC scope.
 *
 * Three tables cover everything needed for board registration and
 * per-column ticket counts with reliable deduplication:
 *
 *   board_configs  – one row per registered Trello board (credentials, settings)
 *   trello_lists   – one row per Trello list (column); dedup key = Trello list id
 *   trello_cards   – one row per Trello card; dedup key = Trello card id
 *
 * Deduplication strategy
 * ──────────────────────
 * Trello assigns globally unique string IDs to every board, list and card.
 * We use those IDs as SQLite PRIMARY KEYs and rely on
 * "ON CONFLICT(id) DO UPDATE SET …" (upsert) so that repeated syncs
 * overwrite stale data rather than inserting duplicates.
 *
 * Handling deletes / moves
 * ──────────────────────────
 * After each sync we run a second pass that marks any list or card that
 * was NOT returned by the Trello API as closed = 1.  This covers:
 *   • Cards archived on Trello
 *   • Lists archived on Trello
 * Moving a card between lists is handled automatically: the upsert updates
 * list_id to the new value, so column counts shift on the next read.
 *
 * Future tables (analytics, actions) are documented in
 * docs/analytics/REQUIREMENTS.md.
 */

export const CREATE_TABLES_SQL = `
  -- WAL mode gives much better read concurrency: readers never block writers
  -- and writers never block readers.  Recommended for all desktop SQLite apps.
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS board_configs (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id           TEXT    NOT NULL UNIQUE,
    board_name         TEXT    NOT NULL,
    api_key            TEXT    NOT NULL,
    api_token          TEXT    NOT NULL,
    project_code       TEXT    NOT NULL DEFAULT '',
    next_ticket_number INTEGER NOT NULL DEFAULT 1,
    done_list_names    TEXT    NOT NULL DEFAULT '["Done"]',
    last_synced_at     TEXT,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trello_lists (
    id        TEXT PRIMARY KEY,
    board_id  TEXT NOT NULL,
    name      TEXT NOT NULL,
    pos       REAL NOT NULL DEFAULT 0,
    closed    INTEGER NOT NULL DEFAULT 0,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS trello_cards (
    id                 TEXT PRIMARY KEY,
    board_id           TEXT NOT NULL,
    list_id            TEXT NOT NULL,
    name               TEXT NOT NULL,
    closed             INTEGER NOT NULL DEFAULT 0,
    date_last_activity TEXT NOT NULL,
    labels_json        TEXT NOT NULL DEFAULT '[]',
    members_json       TEXT NOT NULL DEFAULT '[]',
    synced_at          TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_cards_board ON trello_cards(board_id);
  CREATE INDEX IF NOT EXISTS idx_cards_list  ON trello_cards(list_id);
  CREATE INDEX IF NOT EXISTS idx_lists_board ON trello_lists(board_id);
`
