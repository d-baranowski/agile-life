INSERT INTO board_members (id, board_id, full_name, username)
VALUES (@id, @boardId, @fullName, @username)
ON CONFLICT (id, board_id) DO UPDATE SET
  full_name = excluded.full_name,
  username  = excluded.username
