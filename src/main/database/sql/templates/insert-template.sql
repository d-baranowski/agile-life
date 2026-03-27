INSERT INTO ticket_templates
  (board_id, group_id, name, title_template, desc_template, list_id, list_name, position)
VALUES
  (:boardId, :groupId, :name, :titleTemplate, :descTemplate, :listId, :listName, :position)
