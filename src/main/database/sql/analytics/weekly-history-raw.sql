-- Returns one row per (week, card, member) for cards moved to a "done" list
-- in the past 12 months, including labels_json so the caller can compute
-- story points per card.  Cards with no assigned members appear as a single
-- "Unassigned" row.  Uses %Y-W%W (supported by all SQLite builds).
WITH done_cards AS (
  SELECT DISTINCT
    a.card_id,
    strftime('%Y-W%W', a.action_date) AS week
  FROM trello_actions a
  JOIN board_configs bc ON bc.board_id = a.board_id
  WHERE a.board_id = ?
    AND a.action_date >= datetime('now', '-12 months')
    AND EXISTS (
      SELECT 1
      FROM json_each(bc.done_list_names)
      WHERE lower(json_each.value) = lower(a.list_after_name)
    )
)
-- Assigned: one row per (week, card, member)
SELECT
  dc.week                                AS week,
  json_extract(jm.value, '$.id')         AS userId,
  json_extract(jm.value, '$.fullName')   AS userName,
  dc.card_id                             AS cardId,
  COALESCE(c.labels_json, '[]')          AS labelsJson
FROM done_cards dc
LEFT JOIN trello_cards c ON c.id = dc.card_id
JOIN json_each(c.members_json) jm

UNION ALL

-- Unassigned: cards with empty/null members_json OR card not found
SELECT
  dc.week                                AS week,
  NULL                                   AS userId,
  'Unassigned'                           AS userName,
  dc.card_id                             AS cardId,
  COALESCE(c.labels_json, '[]')          AS labelsJson
FROM done_cards dc
LEFT JOIN trello_cards c ON c.id = dc.card_id
WHERE COALESCE(json_array_length(c.members_json), 0) = 0

ORDER BY week ASC
