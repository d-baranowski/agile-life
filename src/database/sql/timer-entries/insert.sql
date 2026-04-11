INSERT INTO card_timer_entries (
  id, board_id, card_id, started_at, stopped_at,
  duration_seconds, note, trello_comment_id, created_at, updated_at
) VALUES (
  @id, @boardId, @cardId, @startedAt, @stoppedAt,
  @durationSeconds, @note, @trelloCommentId, datetime('now'), datetime('now')
);
