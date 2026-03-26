-- Returns open cards that sit in one of the configured "done" lists and whose
-- last activity predates the given cutoff (ISO-8601 string).
SELECT
  c.id,
  c.name,
  c.list_id            AS listId,
  c.date_last_activity AS dateLastActivity
FROM trello_cards c
JOIN trello_lists l ON l.id = c.list_id
WHERE c.board_id = @boardId
  AND c.closed   = 0
  AND l.closed   = 0
  AND l.name IN (SELECT value FROM json_each(@doneListNames))
  AND c.date_last_activity < @cutoffDate
ORDER BY c.date_last_activity ASC