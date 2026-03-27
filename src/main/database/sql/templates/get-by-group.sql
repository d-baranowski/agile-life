SELECT id, board_id, group_id, name, title_template, desc_template,
       list_id, list_name, label_ids, epic_card_id, position, created_at, updated_at
FROM ticket_templates
WHERE board_id = :boardId AND group_id = :groupId
ORDER BY position ASC, id ASC
