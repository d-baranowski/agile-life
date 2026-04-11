SELECT card_id, SUM(duration_seconds) AS total_seconds
FROM card_timer_entries
WHERE board_id = ?
GROUP BY card_id;
