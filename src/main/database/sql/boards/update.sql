UPDATE board_configs
SET board_name         = @boardName,
    api_key            = @apiKey,
    api_token          = @apiToken,
    project_code       = @projectCode,
    next_ticket_number = @nextTicketNumber,
    done_list_names    = @doneListNames,
    updated_at         = datetime('now')
WHERE board_id = @boardId
