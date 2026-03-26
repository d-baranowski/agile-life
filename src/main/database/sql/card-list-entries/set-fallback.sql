-- Fallback: ensure every open card has a card_list_entries row for its current
-- list, using Trello's date_last_activity as the best available lower-bound.
--
-- MIN semantics (DO UPDATE SET entered_at = MIN(...)) mean:
--   • New cards (no row yet)  → insert date_last_activity.
--   • Cards whose existing row was written by the old code as synced_at = now()
--     automatically get corrected: MIN(now, months-ago) = months-ago.
--   • Cards with an accurate action-based entry are NOT overwritten because
--     MIN(action-date, date_last_activity) ≤ action-date (activity is always ≥
--     the move date, so we keep whichever is earlier).
INSERT INTO card_list_entries (card_id, list_id, entered_at)
SELECT c.id, c.list_id, c.date_last_activity
FROM trello_cards c
WHERE c.board_id = @boardId
  AND c.closed = 0
ON CONFLICT(card_id, list_id) DO UPDATE SET
  entered_at = MIN(card_list_entries.entered_at, excluded.entered_at)