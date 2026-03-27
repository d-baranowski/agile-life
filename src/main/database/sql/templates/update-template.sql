UPDATE ticket_templates
SET name           = :name,
    title_template = :titleTemplate,
    desc_template  = :descTemplate,
    list_id        = :listId,
    list_name      = :listName,
    label_ids      = :labelIds,
    epic_card_id   = :epicCardId,
    position       = :position,
    updated_at     = datetime('now')
WHERE id = :id AND board_id = :boardId
