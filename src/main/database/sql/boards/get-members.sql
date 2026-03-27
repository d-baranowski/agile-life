SELECT id, full_name, username
FROM board_members
WHERE board_id = ?
ORDER BY full_name ASC
