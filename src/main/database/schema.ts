/**
 * SQLite database schema for Agile Life.
 *
 * Tables:
 *  - board_configs   : registered Trello boards and their settings
 *  - trello_lists    : cached Trello lists (columns) per board
 *  - trello_cards    : cached Trello cards per board
 *  - trello_members  : cached Trello members per board
 *  - trello_actions  : historical card movement actions (for analytics)
 */

export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS board_configs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id          TEXT    NOT NULL UNIQUE,
    board_name        TEXT    NOT NULL,
    api_key           TEXT    NOT NULL,
    api_token         TEXT    NOT NULL,
    project_code      TEXT    NOT NULL DEFAULT '',
    next_ticket_number INTEGER NOT NULL DEFAULT 1,
    done_list_names   TEXT    NOT NULL DEFAULT '["Done"]',
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trello_lists (
    id         TEXT PRIMARY KEY,
    board_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    closed     INTEGER NOT NULL DEFAULT 0,
    pos        REAL NOT NULL DEFAULT 0,
    synced_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS trello_members (
    id         TEXT PRIMARY KEY,
    board_id   TEXT NOT NULL,
    full_name  TEXT NOT NULL,
    username   TEXT NOT NULL,
    avatar_url TEXT,
    synced_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS trello_cards (
    id                TEXT PRIMARY KEY,
    board_id          TEXT NOT NULL,
    list_id           TEXT NOT NULL,
    name              TEXT NOT NULL,
    desc              TEXT NOT NULL DEFAULT '',
    closed            INTEGER NOT NULL DEFAULT 0,
    due               TEXT,
    due_complete      INTEGER NOT NULL DEFAULT 0,
    date_last_activity TEXT NOT NULL,
    labels_json       TEXT NOT NULL DEFAULT '[]',
    members_json      TEXT NOT NULL DEFAULT '[]',
    short_url         TEXT NOT NULL DEFAULT '',
    url               TEXT NOT NULL DEFAULT '',
    synced_at         TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS trello_actions (
    id               TEXT PRIMARY KEY,
    board_id         TEXT NOT NULL,
    card_id          TEXT,
    action_type      TEXT NOT NULL,
    action_date      TEXT NOT NULL,
    member_id        TEXT,
    member_name      TEXT,
    list_before_id   TEXT,
    list_before_name TEXT,
    list_after_id    TEXT,
    list_after_name  TEXT,
    synced_at        TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_trello_cards_board    ON trello_cards(board_id);
  CREATE INDEX IF NOT EXISTS idx_trello_cards_list     ON trello_cards(list_id);
  CREATE INDEX IF NOT EXISTS idx_trello_actions_board  ON trello_actions(board_id);
  CREATE INDEX IF NOT EXISTS idx_trello_actions_date   ON trello_actions(action_date);
  CREATE INDEX IF NOT EXISTS idx_trello_actions_member ON trello_actions(member_id);
`
