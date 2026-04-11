UPDATE card_timer_entries
SET
  started_at        = @startedAt,
  stopped_at        = @stoppedAt,
  duration_seconds  = @durationSeconds,
  note              = @note,
  trello_comment_id = @trelloCommentId,
  updated_at        = datetime('now')
WHERE id = @id;
