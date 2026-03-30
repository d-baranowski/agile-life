INSERT INTO board_configs
  (board_id, board_name, api_key, api_token, project_code, next_ticket_number, done_list_names)
VALUES
  (@boardId, @boardName, @apiKey, @apiToken, @projectCode, @nextTicketNumber, @doneListNames)
