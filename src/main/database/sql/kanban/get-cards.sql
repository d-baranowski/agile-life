-- Cards are ordered by Trello's position value so the local board matches
-- Trello's column order.  A secondary sort on id gives a stable tie-breaker
-- when pos values are equal (e.g. after a migration that defaulted them to 0).
--
-- entered_at is the most recent Trello audit-log date on which the card moved
-- INTO its current list (updateCard:idList or createCard action stored in
-- trello_actions).  card_list_entries is kept as a fallback for very old cards
-- whose full action history predates Trello's retention window.
SELECT c.id, c.name, c.desc, c.list_id, c.pos, c.short_url,
       c.labels_json, c.members_json, c.date_last_activity,
       c.epic_card_id,
       e.name AS epic_card_name,
       COALESCE(latest_move.entered_at, cle.entered_at) AS entered_at
FROM trello_cards c
LEFT JOIN trello_cards e ON e.id = c.epic_card_id
-- Primary source: the most recent Trello action that moved this card into
-- its current list, derived directly from the trello_actions audit log.
LEFT JOIN (
  SELECT card_id, list_after_id, MAX(action_date) AS entered_at
  FROM trello_actions
  WHERE list_after_id IS NOT NULL
  GROUP BY card_id, list_after_id
) latest_move ON latest_move.card_id = c.id
           AND latest_move.list_after_id = c.list_id
-- Fallback: card_list_entries covers cards whose history predates
-- Trello's action retention window (date_last_activity is used there).
LEFT JOIN card_list_entries cle ON cle.card_id = c.id AND cle.list_id = c.list_id
WHERE c.board_id = ? AND c.closed = 0
ORDER BY c.pos ASC, c.id ASC
