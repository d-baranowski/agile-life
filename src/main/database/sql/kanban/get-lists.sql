SELECT id, name, pos
FROM trello_lists
WHERE board_id = ? AND closed = 0
ORDER BY pos
