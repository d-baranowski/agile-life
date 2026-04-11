-- WAL mode gives much better read concurrency: readers never block writers
-- and writers never block readers.  Recommended for all desktop SQLite apps.
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- One row per registered Trello board.
-- Credentials, display settings, and sync bookkeeping all live here.
CREATE TABLE IF NOT EXISTS board_configs (
  id                              INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id                        TEXT    NOT NULL UNIQUE,
  board_name                      TEXT    NOT NULL,
  api_key                         TEXT    NOT NULL,
  api_token                       TEXT    NOT NULL,
  project_code                    TEXT    NOT NULL DEFAULT '',
  next_ticket_number              INTEGER NOT NULL DEFAULT 1,
  done_list_names                 TEXT    NOT NULL DEFAULT '["Done"]',
  story_points_config             TEXT    NOT NULL DEFAULT '[{"labelName":"Large","points":5},{"labelName":"Medium","points":3},{"labelName":"Small","points":1}]',
  last_synced_at                  TEXT,
  card_list_entries_initialized   INTEGER NOT NULL DEFAULT 0,
  created_at                      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at                      TEXT    NOT NULL DEFAULT (datetime('now'))
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
  desc               TEXT NOT NULL DEFAULT '',
  closed             INTEGER NOT NULL DEFAULT 0,
  date_last_activity TEXT NOT NULL,
  pos                REAL NOT NULL DEFAULT 0,
  short_url          TEXT NOT NULL DEFAULT '',
  labels_json        TEXT NOT NULL DEFAULT '[]',
  members_json       TEXT NOT NULL DEFAULT '[]',
  synced_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_board ON trello_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_list  ON trello_cards(list_id);
CREATE INDEX IF NOT EXISTS idx_lists_board ON trello_lists(board_id);

-- One row per Trello action (card movement event).
-- Immutable — once recorded on Trello an action never changes.
-- INSERT OR IGNORE is safe to use on every sync.
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

CREATE INDEX IF NOT EXISTS idx_actions_board  ON trello_actions(board_id);
CREATE INDEX IF NOT EXISTS idx_actions_date   ON trello_actions(action_date);
CREATE INDEX IF NOT EXISTS idx_actions_member ON trello_actions(member_id);

-- Records the most recent time each card entered each list (column).
-- Updated on every sync by processing Trello card-movement actions.
-- Used to measure how long a card has been in its current column and
-- to determine eligibility for archiving.
CREATE TABLE IF NOT EXISTS card_list_entries (
  card_id    TEXT NOT NULL,
  list_id    TEXT NOT NULL,
  entered_at TEXT NOT NULL,
  PRIMARY KEY (card_id, list_id),
  FOREIGN KEY (card_id) REFERENCES trello_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (list_id) REFERENCES trello_lists(id) ON DELETE CASCADE
);

-- Extra index so queries filtering by list_id alone stay fast.
CREATE INDEX IF NOT EXISTS idx_card_list_entries_list ON card_list_entries(list_id);

-- Board members cached from Trello.
-- Upserted on every sync so the context menu can show all assignable members.
CREATE TABLE IF NOT EXISTS board_members (
  id        TEXT NOT NULL,
  board_id  TEXT NOT NULL,
  full_name TEXT NOT NULL,
  username  TEXT NOT NULL,
  PRIMARY KEY (id, board_id),
  FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
);

-- Named collections of ticket templates.
-- A group is the unit of "generate all" — one button press creates one card
-- per template inside the group.
CREATE TABLE IF NOT EXISTS template_groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id   TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES board_configs(board_id) ON DELETE CASCADE
);

-- Individual card templates belonging to a template group.
-- title_template and desc_template may contain mustache-style placeholders:
--   {{week}}, {{year}}, {{month}}, {{month_name}}, {{date}}
CREATE TABLE IF NOT EXISTS ticket_templates (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id       TEXT    NOT NULL,
  group_id       INTEGER NOT NULL,
  name           TEXT    NOT NULL,
  title_template TEXT    NOT NULL,
  desc_template  TEXT    NOT NULL DEFAULT '',
  list_id        TEXT    NOT NULL,
  list_name      TEXT    NOT NULL DEFAULT '',
  position       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id)  REFERENCES board_configs(board_id) ON DELETE CASCADE,
  FOREIGN KEY (group_id)  REFERENCES template_groups(id)     ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_groups_board    ON template_groups(board_id);
CREATE INDEX IF NOT EXISTS idx_ticket_templates_board   ON ticket_templates(board_id);
CREATE INDEX IF NOT EXISTS idx_ticket_templates_group   ON ticket_templates(group_id);

-- One row per card-timer entry.  Each entry is the user's record of
-- "I worked on card X from start to stop for N seconds".
-- trello_comment_id links the entry to a specific commentCard action on
-- Trello so edits here can be mirrored back to the same comment.
CREATE TABLE IF NOT EXISTS card_timer_entries (
  id                TEXT PRIMARY KEY,
  board_id          TEXT NOT NULL,
  card_id           TEXT NOT NULL,
  started_at        TEXT NOT NULL,
  stopped_at        TEXT,
  duration_seconds  INTEGER NOT NULL DEFAULT 0,
  note              TEXT NOT NULL DEFAULT '',
  trello_comment_id TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES trello_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timer_entries_card  ON card_timer_entries(card_id);
CREATE INDEX IF NOT EXISTS idx_timer_entries_board ON card_timer_entries(board_id);
