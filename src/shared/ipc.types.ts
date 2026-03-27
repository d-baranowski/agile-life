export const IPC_CHANNELS = {
  // Board management
  BOARDS_GET_ALL: 'boards:getAll',
  BOARDS_ADD: 'boards:add',
  BOARDS_UPDATE: 'boards:update',
  BOARDS_DELETE: 'boards:delete',
  BOARDS_FETCH_FROM_TRELLO: 'boards:fetchFromTrello',

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

  // Ticket numbering
  TICKETS_GET_CONFIG: 'tickets:getConfig',
  TICKETS_PREVIEW_UNNUMBERED: 'tickets:previewUnnumbered',
  TICKETS_APPLY_NUMBERING: 'tickets:applyNumbering',
  TICKETS_APPLY_SINGLE_CARD: 'tickets:applySingleCard',
  TICKETS_UPDATE_CONFIG: 'tickets:updateConfig',

  // App-level settings
  SETTINGS_GET_DB_PATH: 'settings:getDbPath',
  SETTINGS_SET_DB_PATH: 'settings:setDbPath',

  // Kanban board view
  TRELLO_GET_BOARD_DATA: 'trello:getBoardData',
  TRELLO_MOVE_CARD: 'trello:moveCard',
  TRELLO_UPDATE_CARD_POS: 'trello:updateCardPos',
  TRELLO_ARCHIVE_CARD: 'trello:archiveCard',
  TRELLO_GET_BOARD_MEMBERS: 'trello:getBoardMembers',
  TRELLO_ASSIGN_CARD_MEMBER: 'trello:assignCardMember',

  // Epic / Story board linking
  BOARDS_SET_EPIC_BOARD: 'boards:setEpicBoard',
  EPICS_GET_CARDS: 'epics:getCards',
  EPICS_SET_CARD_EPIC: 'epics:setCardEpic',
  EPICS_SET_BULK_CARD_EPIC: 'epics:setBulkCardEpic',
  EPICS_GET_STORIES: 'epics:getStories'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

export interface IpcResult<T> {
  success: boolean
  data?: T
  error?: string
}
