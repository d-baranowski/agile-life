-- Returns open cards that sit in one of the configured "done" lists and that
-- have been in that column longer than the given cutoff (ISO-8601 string).
-- entered_at comes from card_list_entries; falls back to synced_at if no entry
-- exists yet (edge case: query runs before fallback populates the table).
SELECT
  c.id,
  c.name,
  c.list_id                              AS listId,
  COALESCE(e.entered_at, c.synced_at)   AS enteredDoneAt
FROM trello_cards c
JOIN trello_lists l ON l.id = c.list_id
LEFT JOIN card_list_entries e ON e.card_id = c.id AND e.list_id = c.list_id
WHERE c.board_id = @boardId
  AND c.closed   = 0
  AND l.closed   = 0
  AND l.name IN (SELECT value FROM json_each(@doneListNames))
  AND COALESCE(e.entered_at, c.synced_at) < @cutoffDate
ORDER BY COALESCE(e.entered_at, c.synced_at) ASC