-- Upsert a card from Trello.
-- ON CONFLICT updates list_id so that moving a card between columns is
-- automatically reflected on the next column-counts read.
INSERT INTO trello_cards
  (id, board_id, list_id, name, desc, closed, date_last_activity, pos, short_url, labels_json, members_json)
VALUES
  (@id, @boardId, @listId, @name, @desc, @closed, @dateLastActivity, @pos, @shortUrl, @labelsJson, @membersJson)
ON CONFLICT(id) DO UPDATE SET
  list_id            = excluded.list_id,
  name               = excluded.name,
  desc               = excluded.desc,
  closed             = excluded.closed,
  date_last_activity = excluded.date_last_activity,
  pos                = excluded.pos,
  short_url          = excluded.short_url,
  labels_json        = excluded.labels_json,
  members_json       = excluded.members_json,
  synced_at          = datetime('now')
