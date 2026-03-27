-- Diagnostic query: returns ALL open cards in the configured done column(s),
-- regardless of how long they have been there.  Includes raw timestamps so the
-- UI can display what data is actually stored and help users understand why a
-- card is (or is not) picked up by the archive threshold.
--
-- enteredDoneAt — the value the archive query actually uses:
--   · from card_list_entries when a Trello action was found for this card
--   · otherwise date_last_activity (conservative lower-bound)
-- hasActionEntry — 1 when the timestamp came from a real Trello action, 0 when
--   it is the date_last_activity fallback (so the user knows it is approximate)
SELECT
  c.id,
  c.name,
  c.list_id                                        AS listId,
  l.name                                           AS listName,
  COALESCE(e.entered_at, c.date_last_activity)     AS enteredDoneAt,
  c.date_last_activity                             AS dateLastActivity,
  c.synced_at                                      AS cardSyncedAt,
  CASE WHEN e.entered_at IS NOT NULL THEN 1 ELSE 0 END AS hasActionEntry
FROM trello_cards c
JOIN trello_lists l ON l.id = c.list_id
LEFT JOIN card_list_entries e ON e.card_id = c.id AND e.list_id = c.list_id
WHERE c.board_id = @boardId
  AND c.closed   = 0
  AND l.closed   = 0
  AND l.name IN (SELECT value FROM json_each(@doneListNames))
ORDER BY COALESCE(e.entered_at, c.date_last_activity) ASC
