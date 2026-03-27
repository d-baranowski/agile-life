-- Delete all card_list_entries rows that belong to the given board.
-- Run this before a full-history rebuild so stale rows (e.g. rows written by
-- the old set-fallback.sql that used synced_at = now()) cannot survive and
-- block correct historical timestamps from being stored via MAX() semantics.
DELETE FROM card_list_entries
WHERE card_id IN (
  SELECT id FROM trello_cards WHERE board_id = @boardId
)
