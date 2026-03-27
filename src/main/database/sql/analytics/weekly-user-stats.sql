-- Returns the number of cards whose most recent list-change action moved
-- them to a "done" list in the last 7 days, per assignee.
-- Cards that have since been moved out of a done list are excluded.
-- Uses %Y-W%W (supported by all SQLite builds).
WITH
-- For each card, find the date of its most recent list-change action.
latest_list_action AS (
  SELECT
    card_id,
    MAX(action_date) AS latest_date
  FROM trello_actions
  WHERE board_id = ?
    AND list_after_name IS NOT NULL
    AND list_after_name != ''
  GROUP BY card_id
),
-- Keep only cards whose most-recent move was TO a done list within 7 days.
done_cards AS (
  SELECT DISTINCT
    a.card_id,
    strftime('%Y-W%W', a.action_date) AS week
  FROM trello_actions a
  JOIN latest_list_action lla
    ON lla.card_id = a.card_id AND lla.latest_date = a.action_date
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
