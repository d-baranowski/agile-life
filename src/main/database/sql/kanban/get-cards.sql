-- Cards are ordered by Trello's position value so the local board matches
-- Trello's column order.  A secondary sort on id gives a stable tie-breaker
-- when pos values are equal (e.g. after a migration that defaulted them to 0).
SELECT id, name, list_id, pos, short_url, labels_json, members_json, date_last_activity
FROM trello_cards
WHERE board_id = ? AND closed = 0
ORDER BY pos ASC, id ASC
