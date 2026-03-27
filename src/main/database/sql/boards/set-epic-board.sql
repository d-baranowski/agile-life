UPDATE board_configs
SET epic_board_id = @epicBoardId,
    updated_at    = datetime('now')
WHERE board_id = @boardId
