UPDATE board_configs
SET last_synced_at = datetime('now'),
    updated_at     = datetime('now')
WHERE board_id = ?
