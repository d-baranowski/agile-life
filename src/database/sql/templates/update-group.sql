UPDATE template_groups
SET name       = :name,
    updated_at = datetime('now')
WHERE id = :id AND board_id = :boardId
