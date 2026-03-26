-- Upsert a card from Trello.
-- ON CONFLICT updates list_id so that moving a card between columns is
-- automatically reflected on the next column-counts read.
INSERT INTO trello_cards
  (id, board_id, list_id, name, closed, date_last_activity, pos, labels_json, members_json)
VALUES
  (@id, @boardId, @listId, @name, @closed, @dateLastActivity, @pos, @labelsJson, @membersJson)
ON CONFLICT(id) DO UPDATE SET
  list_id            = excluded.list_id,
  name               = excluded.name,
  closed             = excluded.closed,
  date_last_activity = excluded.date_last_activity,
  pos                = excluded.pos,
  labels_json        = excluded.labels_json,
  members_json       = excluded.members_json,
  synced_at          = datetime('now')
