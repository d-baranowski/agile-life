-- Returns all open cards from the epic board linked to the given story board.
-- Used to populate the epic assignment dropdown in the story kanban view.
SELECT c.id, c.name, c.list_id, l.name AS list_name
FROM trello_cards c
JOIN trello_lists l ON l.id = c.list_id
WHERE c.board_id = (
  SELECT epic_board_id FROM board_configs WHERE board_id = ?
)
AND c.closed = 0
ORDER BY l.pos ASC, c.pos ASC, c.id ASC
