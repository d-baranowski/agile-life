UPDATE trello_cards
SET list_id = $toListId, pos = $pos, synced_at = datetime('now')
WHERE id = $cardId
