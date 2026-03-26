-- Set moved_to_done_at for a card that has just entered a done list.
-- Only updates if the new timestamp is more recent than the stored one,
-- so incremental syncs never overwrite a more precise historical value.
UPDATE trello_cards
SET moved_to_done_at = @movedAt
WHERE id = @cardId
  AND (moved_to_done_at IS NULL OR moved_to_done_at < @movedAt)