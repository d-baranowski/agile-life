-- Fallback: insert a card_list_entries row for every open card that still has
-- NO entry for its current list after processing all available Trello actions.
-- This handles cards created before Trello started recording actions (very old
-- cards) or boards where action history has been pruned.
--
-- Uses date_last_activity as a conservative lower-bound timestamp.
-- Only inserts when no row exists (NOT EXISTS guard), so cards that already
-- have a real action-based entry are left untouched.
INSERT INTO card_list_entries (card_id, list_id, entered_at)
SELECT c.id, c.list_id, c.date_last_activity
FROM trello_cards c
WHERE c.board_id = @boardId
  AND c.closed = 0
  AND NOT EXISTS (
    SELECT 1 FROM card_list_entries e
    WHERE e.card_id = c.id AND e.list_id = c.list_id
  )