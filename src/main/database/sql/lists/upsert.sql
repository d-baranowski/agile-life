INSERT INTO trello_lists (id, board_id, name, pos, closed)
VALUES (@id, @boardId, @name, @pos, @closed)
ON CONFLICT(id) DO UPDATE SET
  name      = excluded.name,
  pos       = excluded.pos,
  closed    = excluded.closed,
  synced_at = datetime('now')
