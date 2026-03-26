-- Marks any card that was NOT in the latest Trello response as closed.
-- The second parameter must be a JSON array of card IDs still open on Trello,
-- e.g. '["abc123","def456"]'.
UPDATE trello_cards
SET closed    = 1,
    synced_at = datetime('now')
WHERE board_id = ? AND closed = 0
  AND id NOT IN (SELECT value FROM json_each(?))
