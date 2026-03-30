-- Upsert the timestamp when a card entered a list.
-- MAX() keeps the most recent value: if the incoming entry is older than what's
-- already stored, it is silently ignored; if it's newer, the row is updated.
INSERT INTO card_list_entries (card_id, list_id, entered_at)
VALUES (@cardId, @listId, @enteredAt)
ON CONFLICT(card_id, list_id) DO UPDATE SET
  entered_at = MAX(card_list_entries.entered_at, excluded.entered_at)