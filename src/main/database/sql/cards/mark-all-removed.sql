-- Marks every open card for this board as closed.
-- Used when Trello returns zero cards (empty board or all cards archived).
UPDATE trello_cards
SET closed    = 1,
    synced_at = datetime('now')
WHERE board_id = ? AND closed = 0
