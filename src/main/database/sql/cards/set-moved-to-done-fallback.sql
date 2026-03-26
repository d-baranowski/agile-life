-- Fallback: for cards that are currently in a done list but have no
-- moved_to_done_at recorded (e.g. cards that were already there on first sync),
-- use synced_at as a conservative lower bound.
UPDATE trello_cards
SET moved_to_done_at = synced_at
WHERE board_id = @boardId
  AND closed = 0
  AND moved_to_done_at IS NULL
  AND list_id IN (
    SELECT l.id
    FROM trello_lists l
    WHERE l.board_id = @boardId
      AND l.name IN (SELECT value FROM json_each(@doneListNames))
  )