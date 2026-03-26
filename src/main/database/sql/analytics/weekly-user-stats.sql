-- Returns the number of cards moved to a "done" list per user in the last 7 days.
-- Joins board_configs to resolve done_list_names without hard-coding "Done".
SELECT
  strftime('%G-W%V', a.action_date) AS week,
  a.member_id                       AS userId,
  a.member_name                     AS userName,
  COUNT(*)                          AS closedCount
FROM trello_actions a
JOIN board_configs bc ON bc.board_id = a.board_id
WHERE a.board_id = ?
  AND a.member_id IS NOT NULL
  AND a.action_date >= datetime('now', '-7 days')
  AND EXISTS (
    SELECT 1
    FROM json_each(bc.done_list_names)
    WHERE lower(json_each.value) = lower(a.list_after_name)
  )
GROUP BY week, a.member_id
ORDER BY week DESC, closedCount DESC
