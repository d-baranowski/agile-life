-- Returns the card count for every open list (column) on the board.
-- Cards with closed = 1 (archived / deleted on Trello) are excluded.
-- Results are ordered by the list's position on the Trello board.
SELECT
  l.id          AS listId,
  l.name        AS listName,
  COUNT(c.id)   AS cardCount
FROM trello_lists l
LEFT JOIN trello_cards c
  ON c.list_id = l.id AND c.closed = 0
WHERE l.board_id = ? AND l.closed = 0
GROUP BY l.id, l.name
ORDER BY l.pos ASC
