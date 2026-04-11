SELECT
  id, board_id, card_id, started_at, stopped_at,
  duration_seconds, note, trello_comment_id, created_at, updated_at
FROM card_timer_entries
WHERE board_id = ? AND stopped_at IS NULL
ORDER BY started_at DESC;
