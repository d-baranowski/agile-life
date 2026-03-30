export const IPC_CHANNELS = {
  // Board management
  BOARDS_GET_ALL: 'boards:getAll',
  BOARDS_ADD: 'boards:add',
  BOARDS_UPDATE: 'boards:update',
  BOARDS_DELETE: 'boards:delete',
  BOARDS_FETCH_FROM_TRELLO: 'boards:fetchFromTrello',
  BOARDS_GET_SAVED_CREDENTIALS: 'boards:getSavedCredentials',

  // Trello data
  TRELLO_GET_LISTS: 'trello:getLists',
  TRELLO_GET_CARDS: 'trello:getCards',
  TRELLO_GET_MEMBERS: 'trello:getMembers',
  TRELLO_GET_ACTIONS: 'trello:getActions',
  TRELLO_SYNC: 'trello:sync',
  TRELLO_ARCHIVE_DONE_CARDS: 'trello:archiveDoneCards',
  TRELLO_PREVIEW_ARCHIVE_DONE_CARDS: 'trello:previewArchiveDoneCards',
  TRELLO_GET_DONE_COLUMN_DEBUG: 'trello:getDoneColumnDebug',

  // Analytics
  ANALYTICS_COLUMN_COUNTS: 'analytics:columnCounts',
  ANALYTICS_WEEKLY_USER_STATS: 'analytics:weeklyUserStats',
  ANALYTICS_LABEL_USER_STATS: 'analytics:labelUserStats',
  ANALYTICS_CARD_AGE: 'analytics:cardAge',
  ANALYTICS_WEEKLY_HISTORY: 'analytics:weeklyHistory',
  ANALYTICS_STORY_POINTS_7D: 'analytics:storyPointsWeekly',
  ANALYTICS_EPIC_WEEKLY_HISTORY: 'analytics:epicWeeklyHistory',

  // Ticket numbering
  TICKETS_GET_CONFIG: 'tickets:getConfig',
  TICKETS_PREVIEW_UNNUMBERED: 'tickets:previewUnnumbered',
  TICKETS_APPLY_NUMBERING: 'tickets:applyNumbering',
  TICKETS_APPLY_SINGLE_CARD: 'tickets:applySingleCard',
  TICKETS_UPDATE_CONFIG: 'tickets:updateConfig',

  // Ticket templates
  TEMPLATES_GET_GROUPS: 'templates:getGroups',
  TEMPLATES_CREATE_GROUP: 'templates:createGroup',
  TEMPLATES_UPDATE_GROUP: 'templates:updateGroup',
  TEMPLATES_DELETE_GROUP: 'templates:deleteGroup',
  TEMPLATES_GET: 'templates:get',
  TEMPLATES_CREATE: 'templates:create',
  TEMPLATES_UPDATE: 'templates:update',
  TEMPLATES_DELETE: 'templates:delete',
  TEMPLATES_GENERATE_CARDS: 'templates:generateCards',
  TEMPLATES_GET_BOARD_LABELS: 'templates:getBoardLabels',

  // App-level settings
  SETTINGS_GET_DB_PATH: 'settings:getDbPath',
  SETTINGS_SET_DB_PATH: 'settings:setDbPath',

  // Logging
  LOGS_GET_PATH: 'logs:getPath',
  LOGS_OPEN_FOLDER: 'logs:openFolder',
  LOGS_SET_PATH: 'logs:setPath',

  // Kanban board view
  TRELLO_GET_BOARD_DATA: 'trello:getBoardData',
  TRELLO_MOVE_CARD: 'trello:moveCard',
  TRELLO_UPDATE_CARD_POS: 'trello:updateCardPos',
  TRELLO_ARCHIVE_CARD: 'trello:archiveCard',
  TRELLO_ARCHIVE_CARDS: 'trello:archiveCards',
  TRELLO_GET_BOARD_MEMBERS: 'trello:getBoardMembers',
  TRELLO_ASSIGN_CARD_MEMBER: 'trello:assignCardMember',
  TRELLO_BULK_ASSIGN_MEMBER: 'trello:bulkAssignMember',
  TRELLO_CREATE_CARD: 'trello:createCard',
  TRELLO_GET_BOARD_LABELS: 'trello:getBoardLabels',
  TRELLO_ASSIGN_CARD_LABEL: 'trello:assignCardLabel',

  // Epic / Story board linking
  BOARDS_SET_EPIC_BOARD: 'boards:setEpicBoard',
  BOARDS_GET_LAST_SELECTED: 'boards:getLastSelected',
  BOARDS_SET_LAST_SELECTED: 'boards:setLastSelected',
  EPICS_GET_CARDS: 'epics:getCards',
  EPICS_SET_CARD_EPIC: 'epics:setCardEpic',
  EPICS_SET_BULK_CARD_EPIC: 'epics:setBulkCardEpic',
  EPICS_GET_STORIES: 'epics:getStories',

  // Gamification
  BOARDS_SET_MY_MEMBER: 'boards:setMyMember',
  ANALYTICS_GAMIFICATION_STATS: 'analytics:gamificationStats'
} as const

export interface IpcResult<T> {
  success: boolean
  data?: T
  error?: string
}
