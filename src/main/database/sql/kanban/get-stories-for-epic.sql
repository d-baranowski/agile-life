-- Returns all open story cards assigned to a given epic card.
-- Used by the epic board's stories modal (double-click an epic card).
SELECT c.id, c.name, c.desc, c.list_id, c.pos, c.short_url,
       c.labels_json, c.members_json, c.date_last_activity,
       l.name AS list_name,
       b.board_name
FROM trello_cards c
JOIN trello_lists l ON l.id = c.list_id
JOIN board_configs b ON b.board_id = c.board_id
WHERE c.epic_card_id = ? AND c.closed = 0
ORDER BY l.pos ASC, c.pos ASC, c.id ASC
