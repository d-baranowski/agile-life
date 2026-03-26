-- WAL mode gives much better read concurrency: readers never block writers
-- and writers never block readers.  Recommended for all desktop SQLite apps.
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- One row per registered Trello board.
-- Credentials, display settings, and sync bookkeeping all live here.
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

-- One row per Trello list (column).
-- Dedup key: Trello list id (globally unique string).
-- closed = 1 when the list is no longer returned by the Trello API.
CREATE TABLE IF NOT EXISTS trello_lists (
  id        TEXT PRIMARY KEY,
  board_id  TEXT NOT NULL,
  name      TEXT NOT NULL,
  pos       REAL NOT NULL DEFAULT 0,
  closed    INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
);

-- One row per Trello card.
-- Dedup key: Trello card id (globally unique string).
-- list_id is updated on every sync, so moving a card between columns
-- is automatically reflected in subsequent column-count queries.
-- closed = 1 when the card is no longer returned by the Trello API.
-- pos mirrors Trello's own position value and is used to sort cards within
-- each column.
CREATE TABLE IF NOT EXISTS trello_cards (
  id                 TEXT PRIMARY KEY,
  board_id           TEXT NOT NULL,
  list_id            TEXT NOT NULL,
  name               TEXT NOT NULL,
  closed             INTEGER NOT NULL DEFAULT 0,
  date_last_activity TEXT NOT NULL,
  pos                REAL NOT NULL DEFAULT 0,
  labels_json        TEXT NOT NULL DEFAULT '[]',
  members_json       TEXT NOT NULL DEFAULT '[]',
  synced_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_board ON trello_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_list  ON trello_cards(list_id);
CREATE INDEX IF NOT EXISTS idx_lists_board ON trello_lists(board_id);
