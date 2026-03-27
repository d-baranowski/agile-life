-- Cards are ordered by Trello's position value so the local board matches
-- Trello's column order.  A secondary sort on id gives a stable tie-breaker
-- when pos values are equal (e.g. after a migration that defaulted them to 0).
SELECT c.id, c.name, c.desc, c.list_id, c.pos, c.short_url,
       c.labels_json, c.members_json, c.date_last_activity,
       c.epic_card_id,
       e.name AS epic_card_name,
       cle.entered_at
FROM trello_cards c
LEFT JOIN trello_cards e ON e.id = c.epic_card_id
LEFT JOIN card_list_entries cle ON cle.card_id = c.id AND cle.list_id = c.list_id
WHERE c.board_id = ? AND c.closed = 0
ORDER BY c.pos ASC, c.id ASC
