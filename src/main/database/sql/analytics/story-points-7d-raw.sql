-- Returns one row per (card, member) for cards moved to a "done" list
-- in the past 7 days, including labels_json so the caller can compute
-- story points per card.  Cards with no assigned members appear as a single
-- "Unassigned" row.
WITH done_cards AS (
  SELECT DISTINCT
    a.card_id
  FROM trello_actions a
  JOIN board_configs bc ON bc.board_id = a.board_id
  WHERE a.board_id = ?
    AND a.action_date >= datetime('now', '-7 days')
    AND EXISTS (
      SELECT 1
      FROM json_each(bc.done_list_names)
      WHERE lower(json_each.value) = lower(a.list_after_name)
    )
)
-- Assigned: one row per (card, member)
SELECT
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
  NULL                                   AS userId,
  'Unassigned'                           AS userName,
  dc.card_id                             AS cardId,
  COALESCE(c.labels_json, '[]')          AS labelsJson
FROM done_cards dc
LEFT JOIN trello_cards c ON c.id = dc.card_id
WHERE COALESCE(json_array_length(c.members_json), 0) = 0
