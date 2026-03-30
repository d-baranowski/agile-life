-- Returns one row per (week, card) for cards whose most recent list-change
-- action moved them to a "done" list within the past 12 months.
-- Includes epic_card_id and epic name (via self-join) for grouping by epic.
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
-- Keep only cards whose most-recent move was TO a done list and happened
-- within the past 12 months.
done_cards AS (
  SELECT DISTINCT
    a.card_id,
    strftime('%Y-W%W', a.action_date) AS week
  FROM trello_actions a
  JOIN latest_list_action lla
    ON lla.card_id = a.card_id AND lla.latest_date = a.action_date
  JOIN board_configs bc ON bc.board_id = a.board_id
  WHERE a.board_id = ?
    AND a.action_date >= datetime('now', '-12 months')
    AND EXISTS (
      SELECT 1
      FROM json_each(bc.done_list_names)
      WHERE lower(json_each.value) = lower(a.list_after_name)
    )
)
SELECT
  dc.week                              AS week,
  COALESCE(c.epic_card_id, '')         AS epicCardId,
  COALESCE(e.name, '(No Epic)')        AS epicCardName,
  dc.card_id                           AS cardId,
  COALESCE(c.labels_json, '[]')        AS labelsJson
FROM done_cards dc
LEFT JOIN trello_cards c ON c.id = dc.card_id
LEFT JOIN trello_cards e ON e.id = c.epic_card_id
ORDER BY week ASC
