# Analytics — Requirements & Implementation Guide

> **Status:** Not yet implemented.  
> **Pick up from:** `src/main/ipc/analytics.ts` (currently a stub).

---

## What is needed

| Feature | Description |
|---|---|
| Cards closed per week per user | How many cards each member moved to a "done" list in each calendar week |
| Cards closed by label per user | Breakdown of closed cards by Trello label and member |
| Card age | How many days since `date_last_activity` for every open card |

---

## Data model additions required

The current POC schema (`src/main/database/schema.ts`) stores only the live
board state.  Analytics need **historical event data** from Trello's actions
endpoint.  Add the following table in a schema migration:

```sql
CREATE TABLE IF NOT EXISTS trello_actions (
  id               TEXT PRIMARY KEY,        -- Trello action ID (dedup key)
  board_id         TEXT NOT NULL,
  card_id          TEXT,
  action_type      TEXT NOT NULL,           -- e.g. "updateCard"
  action_date      TEXT NOT NULL,           -- ISO-8601 UTC
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
```

> **Important:** Add this to `CREATE_TABLES_SQL` in `schema.ts` — it is
> idempotent (`CREATE TABLE IF NOT EXISTS`) so existing installs are safe.

---

## Populating the actions table

Call `TrelloClient.getActions(boardId)` during sync.  The method already
exists in `src/main/trello/client.ts` and paginates automatically.

Add `upsertActions` to `src/main/database/db.ts`:

```typescript
// Use INSERT OR IGNORE — actions are immutable once created on Trello.
export function upsertActions(boardId: string, actions: TrelloAction[]): void { ... }
```

Then add one line to the `TRELLO_SYNC` handler in `src/main/ipc/boards.ts`:

```typescript
const [freshLists, freshCards, freshActions] = await Promise.all([
  client.getLists(boardId),
  client.getCards(boardId),
  client.getActions(boardId)          // ← add this
])
// ... existing upserts ...
upsertActions(boardId, freshActions)  // ← add this
```

> **Rate limit note:** `getActions` pages through results.  For large boards
> with many actions this can take several seconds.  Consider a `since`
> parameter (store the date of the last-fetched action per board) to fetch
> only new actions on incremental syncs.

---

## IPC channels (already defined)

All channels are defined in `src/shared/ipc.types.ts`.  Register handlers in
`src/main/ipc/analytics.ts`:

| Channel constant | Description |
|---|---|
| `ANALYTICS_WEEKLY_USER_STATS` | Cards closed per ISO week per member |
| `ANALYTICS_LABEL_USER_STATS` | Closed cards grouped by label + member |
| `ANALYTICS_CARD_AGE` | Age in days for every open card |

The renderer API stubs are defined in `src/renderer/src/hooks/useApi.ts`
(add them back when implementing) and the types live in
`src/shared/analytics.types.ts`.

---

## Reference SQL

### Cards closed per week per user

```sql
SELECT
  strftime('%Y-W%W', action_date) AS week,
  member_id                       AS userId,
  member_name                     AS userName,
  COUNT(*)                        AS closedCount
FROM trello_actions
WHERE board_id = ?
  AND lower(list_after_name) IN (/* doneListNames from board_configs */)
  AND member_id IS NOT NULL
GROUP BY week, member_id
ORDER BY week DESC, closedCount DESC
```

### Cards closed by label per user

1. Query `trello_actions` filtered to done-list moves to get `(card_id, member_id, member_name)`.
2. Join with `trello_cards.labels_json` to expand labels.
3. Group by `(label_name, member_id)` and `COUNT(*)`.

### Card age

```sql
SELECT
  c.id   AS cardId,
  c.name AS cardName,
  l.name AS listName,
  CAST((julianday('now') - julianday(c.date_last_activity)) AS INTEGER) AS ageInDays,
  c.members_json
FROM trello_cards c
JOIN trello_lists l ON l.id = c.list_id
WHERE c.board_id = ? AND c.closed = 0
ORDER BY ageInDays DESC
```

---

## Do's

- ✅ Use `INSERT OR IGNORE` for actions (they are immutable).
- ✅ Filter actions by `lower(list_after_name)` matching `board_configs.done_list_names`.
- ✅ Return typed results using the interfaces in `src/shared/analytics.types.ts`.
- ✅ Read `done_list_names` from `board_configs` — never hard-code `"Done"`.
- ✅ Add the `AnalyticsPage` tab back in `App.tsx` once handlers are wired up.

## Don'ts

- ❌ Don't delete the `ANALYTICS_COLUMN_COUNTS` handler — it lives in
  `ipc/boards.ts` and is already in use by the Dashboard.
- ❌ Don't re-fetch the entire action history on every sync.  Store the most
  recent `action_date` per board and pass it as `since` to `getActions`.
- ❌ Don't do label/member aggregation in JavaScript.  Push it into SQL for
  performance on large boards.
- ❌ Don't surface raw `member_id` values to the UI — always resolve to
  `member_name`.
