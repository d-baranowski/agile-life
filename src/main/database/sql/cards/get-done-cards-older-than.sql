-- Returns open cards that sit in one of the configured "done" lists and that
-- have been in the done column for longer than the given cutoff (ISO-8601 string).
-- moved_to_done_at is the timestamp when the card last entered a done list.
SELECT
  c.id,
  c.name,
  c.list_id          AS listId,
  c.moved_to_done_at AS movedToDoneAt
FROM trello_cards c
JOIN trello_lists l ON l.id = c.list_id
WHERE c.board_id = @boardId
  AND c.closed   = 0
  AND l.closed   = 0
  AND l.name IN (SELECT value FROM json_each(@doneListNames))
  AND c.moved_to_done_at IS NOT NULL
  AND c.moved_to_done_at < @cutoffDate
ORDER BY c.moved_to_done_at ASC