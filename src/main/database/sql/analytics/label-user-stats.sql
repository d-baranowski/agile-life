-- Returns closed card counts grouped by label and assignee in the last 7 days.
-- Uses card assignees (members_json on trello_cards) instead of the action creator.
-- Cards with no labels are excluded (json_each returns no rows for empty arrays).
-- Cards with no assigned members appear under "Unassigned" per label.
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
-- Assigned: one row per (label, member) combination
SELECT
  json_extract(jl.value, '$.name')       AS labelName,
  json_extract(jl.value, '$.color')      AS labelColor,
  json_extract(jm.value, '$.id')         AS userId,
  json_extract(jm.value, '$.fullName')   AS userName,
  COUNT(DISTINCT dc.card_id)             AS closedCount
FROM done_cards dc
JOIN trello_cards c ON c.id = dc.card_id
JOIN json_each(c.labels_json) jl
JOIN json_each(c.members_json) jm
GROUP BY
  json_extract(jl.value, '$.name'),
  json_extract(jl.value, '$.color'),
  json_extract(jm.value, '$.id')

UNION ALL

-- Unassigned: labelled cards with an empty (or null) members_json array
SELECT
  json_extract(jl.value, '$.name')       AS labelName,
  json_extract(jl.value, '$.color')      AS labelColor,
  NULL                                   AS userId,
  'Unassigned'                           AS userName,
  COUNT(DISTINCT dc.card_id)             AS closedCount
FROM done_cards dc
JOIN trello_cards c ON c.id = dc.card_id
JOIN json_each(c.labels_json) jl
WHERE COALESCE(json_array_length(c.members_json), 0) = 0
GROUP BY
  json_extract(jl.value, '$.name'),
  json_extract(jl.value, '$.color')

ORDER BY closedCount DESC, labelName, userName
