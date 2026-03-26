# Ticket Numbering — Requirements & Implementation Guide

> **Status:** Not yet implemented.  
> **Pick up from:** `src/main/ipc/tickets.ts` (currently a stub).

---

## What is needed

Every card on a registered Trello board should carry a unique, ever-increasing
**JIRA-style prefix** in its title:

```
AGI-000001 Fix login bug
AGI-000002 Add dark mode
AGI-000003 Update README
```

The format is: `<PROJECT_CODE>-<6-DIGIT-PADDED-NUMBER> <original title>`.

### Rules

| Rule | Detail |
|---|---|
| Project code | Exactly **3 uppercase letters**, configured per board in `board_configs.project_code` |
| Number | **6-digit, zero-padded**, starting at `board_configs.next_ticket_number` (default `1`) |
| Separator | A **single space** between the prefix and the original card title |
| Already-numbered cards | Must **not** be renamed — detect using the regex `^[A-Z]{3}-\d{6} ` |
| Number sequence | **Never reuse** a number; increment `next_ticket_number` after each batch |

---

## Schema — no changes needed

`board_configs` already has:

```sql
project_code       TEXT NOT NULL DEFAULT '',
next_ticket_number INTEGER NOT NULL DEFAULT 1,
```

---

## IPC channels (already defined)

All channels are defined in `src/shared/ipc.types.ts`.
Register handlers in `src/main/ipc/tickets.ts`:

| Channel constant | Payload | Returns |
|---|---|---|
| `TICKETS_GET_CONFIG` | `boardId` | `TicketNumberingConfig` |
| `TICKETS_PREVIEW_UNNUMBERED` | `boardId` | `UnnumberedCard[]` |
| `TICKETS_APPLY_NUMBERING` | `boardId` | `ApplyNumberingResult` |
| `TICKETS_UPDATE_CONFIG` | `boardId, { projectCode?, nextTicketNumber? }` | `void` |

Types for all of these already exist in `src/shared/ticket.types.ts`.

---

## Algorithm — TICKETS_APPLY_NUMBERING

```
1. Fetch all open cards from local DB for the board (ordered by date_last_activity ASC).
2. Filter to cards whose name does NOT match /^[A-Z]{3}-\d{6} /.
3. For each unnumbered card:
   a. Build newName = `${projectCode}-${String(nextNum).padStart(6,'0')} ${card.name}`
   b. Call TrelloClient.updateCardName(card.id, newName)       ← Trello API
   c. On success: UPDATE trello_cards SET name = newName WHERE id = card.id
   d. Increment nextNum
   e. On failure: record error, continue to next card (partial success is OK)
4. Persist nextNum back to board_configs.next_ticket_number via updateBoard().
5. Return { updated, failed, errors }.
```

> **Ordering matters.**  Sort cards by `date_last_activity ASC` so older cards
> get lower numbers — this gives a consistent, reproducible assignment.

---

## TICKETS_PREVIEW_UNNUMBERED

Same filter as above but **read-only** — just return the list of proposed
renames without calling the Trello API.  Use this to show the user what will
happen before they commit.

---

## TICKETS_GET_CONFIG

Read `project_code` and `next_ticket_number` from `board_configs`.  Also
count unnumbered open cards so the UI can show a badge.

```typescript
const allCards = db.prepare(
  `SELECT name FROM trello_cards WHERE board_id = ? AND closed = 0`
).all(boardId) as { name: string }[]

const unnumberedCount = allCards.filter(
  (c) => !/^[A-Z]{3}-\d{6} /.test(c.name)
).length
```

> SQLite does not support `REGEXP` by default — always do the regex filtering
> in JavaScript after fetching the names.

---

## UI

Add the `TicketNumberingPage` tab back in `App.tsx` and wire it to the above
IPC calls via `useApi.ts`.  The page (`src/renderer/src/pages/TicketNumberingPage.tsx`)
is already scaffolded as a stub — restore the full implementation from git
history or rewrite from the spec above.

The page should show:
1. Current project code + next number (editable form).
2. "Preview" button → table of proposed renames.
3. "Apply" button → calls `TICKETS_APPLY_NUMBERING` and reports results.

---

## Do's

- ✅ Validate project code as exactly `^[A-Z]{3}$` before saving.
- ✅ Run `TICKETS_PREVIEW_UNNUMBERED` and show it to the user before applying.
- ✅ Handle Trello API failures gracefully — log errors and continue; a
  partial run is better than an all-or-nothing failure.
- ✅ After applying, refresh the column-count view (counts don't change, but
  card names do and users may want to verify).
- ✅ Store `next_ticket_number` **after** a successful batch so a crash
  mid-way doesn't skip numbers.

## Don'ts

- ❌ Don't apply numbering to **archived** (`closed = 1`) cards.
- ❌ Don't reuse numbers — never reset `next_ticket_number` to a lower value.
- ❌ Don't rename a card that already matches `^[A-Z]{3}-\d{6} ` even if the
  prefix doesn't match the current project code (it may have been intentional).
- ❌ Don't call `updateCardName` in parallel — Trello rate-limits to
  ~100 req/10 s per token; process cards sequentially with a small delay if
  the board has many unnumbered cards.
- ❌ Don't hard-code a project code — always read from `board_configs`.
