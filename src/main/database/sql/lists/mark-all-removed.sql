-- Marks every open list for this board as closed.
-- Used when Trello returns zero lists (entire board archived / deactivated).
UPDATE trello_lists
SET closed    = 1,
    synced_at = datetime('now')
WHERE board_id = ? AND closed = 0
