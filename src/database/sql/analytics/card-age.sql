-- Returns age in days (since date_last_activity) for every open card.
SELECT
  c.id                                                                             AS cardId,
  c.name                                                                           AS cardName,
  l.name                                                                           AS listName,
  CAST((julianday('now') - julianday(c.date_last_activity)) AS INTEGER)            AS ageInDays,
  c.members_json                                                                   AS membersJson
FROM trello_cards c
JOIN trello_lists l ON l.id = c.list_id
WHERE c.board_id = ? AND c.closed = 0
ORDER BY ageInDays DESC
