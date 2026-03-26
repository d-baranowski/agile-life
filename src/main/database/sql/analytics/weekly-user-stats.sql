-- Returns the number of cards moved to a "done" list per assignee in the last 7 days.
-- Uses card assignees (members_json on trello_cards) instead of the action creator.
-- Cards with no assigned members appear as a single "Unassigned" row.
-- Uses LEFT JOIN so that recently-archived cards not yet re-synced still count.
WITH done_cards AS (
  SELECT DISTINCT
    a.card_id,
    strftime('%G-W%V', a.action_date) AS week
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
-- Assigned: one row per (week, member) combination
SELECT
  dc.week                                AS week,
  json_extract(jm.value, '$.id')         AS userId,
  json_extract(jm.value, '$.fullName')   AS userName,
  COUNT(DISTINCT dc.card_id)             AS closedCount
FROM done_cards dc
LEFT JOIN trello_cards c ON c.id = dc.card_id
JOIN json_each(c.members_json) jm
GROUP BY dc.week, json_extract(jm.value, '$.id')

UNION ALL

-- Unassigned: cards with empty/null members_json OR card not found in trello_cards
SELECT
  dc.week                                AS week,
  NULL                                   AS userId,
  'Unassigned'                           AS userName,
  COUNT(DISTINCT dc.card_id)             AS closedCount
FROM done_cards dc
LEFT JOIN trello_cards c ON c.id = dc.card_id
WHERE COALESCE(json_array_length(c.members_json), 0) = 0
GROUP BY dc.week

ORDER BY week DESC, closedCount DESC
