-- Returns closed card counts grouped by label and user in the last 7 days.
-- Expands labels_json from trello_cards using json_each.
-- Cards with no labels are excluded (json_each returns no rows for empty arrays).
SELECT
  json_extract(jl.value, '$.name')  AS labelName,
  json_extract(jl.value, '$.color') AS labelColor,
  a.member_id                        AS userId,
  a.member_name                      AS userName,
  COUNT(DISTINCT a.card_id)          AS closedCount
FROM trello_actions a
JOIN board_configs bc ON bc.board_id = a.board_id
JOIN trello_cards c ON c.id = a.card_id
JOIN json_each(c.labels_json) jl
WHERE a.board_id = ?
  AND a.member_id IS NOT NULL
  AND a.action_date >= datetime('now', '-7 days')
  AND EXISTS (
    SELECT 1
    FROM json_each(bc.done_list_names)
    WHERE lower(json_each.value) = lower(a.list_after_name)
  )
GROUP BY json_extract(jl.value, '$.name'), json_extract(jl.value, '$.color'), a.member_id
ORDER BY closedCount DESC, labelName, userName
