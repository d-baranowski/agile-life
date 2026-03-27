UPDATE board_configs
SET card_list_entries_initialized = 1
WHERE board_id = @boardId
