-- Clear moved_to_done_at for open cards that are no longer in any done list.
-- Called after upserting cards so that cards moved out of done are reset.
UPDATE trello_cards
SET moved_to_done_at = NULL
WHERE board_id = @boardId
  AND closed = 0
  AND moved_to_done_at IS NOT NULL
  AND list_id NOT IN (
    SELECT l.id
    FROM trello_lists l
    WHERE l.board_id = @boardId
      AND l.name IN (SELECT value FROM json_each(@doneListNames))
  )