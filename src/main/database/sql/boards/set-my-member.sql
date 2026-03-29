UPDATE board_configs
SET my_member_id = @myMemberId,
    updated_at   = datetime('now')
WHERE board_id = @boardId
