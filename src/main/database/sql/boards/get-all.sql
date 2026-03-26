SELECT id, board_id, board_name, api_key, api_token, project_code,
       next_ticket_number, done_list_names, last_synced_at, created_at, updated_at
FROM board_configs
ORDER BY created_at ASC
