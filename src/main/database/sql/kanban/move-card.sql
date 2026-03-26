UPDATE trello_cards
SET list_id = $toListId, synced_at = datetime('now')
WHERE id = $cardId
