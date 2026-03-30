SELECT id, board_id, name, created_at, updated_at
FROM template_groups
WHERE board_id = :boardId
ORDER BY name ASC
