-- Fallback: insert a card_list_entries row for every open card that has no
-- entry for its current list yet (e.g. cards already in a column on first sync
-- whose movement actions predate our history window).
-- synced_at is used as a conservative lower-bound for how long the card has
-- been in that column.
INSERT INTO card_list_entries (card_id, list_id, entered_at)
SELECT c.id, c.list_id, c.synced_at
FROM trello_cards c
WHERE c.board_id = @boardId
  AND c.closed = 0
  AND NOT EXISTS (
    SELECT 1
    FROM card_list_entries e
    WHERE e.card_id = c.id
      AND e.list_id = c.list_id
  )