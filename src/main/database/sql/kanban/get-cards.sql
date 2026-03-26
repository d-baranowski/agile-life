-- Cards are ordered by date_last_activity as a proxy for recency since the
-- trello_cards table does not store a position (pos) column.
-- Re-sync the board via TRELLO_SYNC to refresh card data.
SELECT id, name, list_id, labels_json, members_json, date_last_activity
FROM trello_cards
WHERE board_id = ? AND closed = 0
ORDER BY date_last_activity DESC
