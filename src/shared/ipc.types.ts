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

  // Analytics
  ANALYTICS_COLUMN_COUNTS: 'analytics:columnCounts',
  ANALYTICS_WEEKLY_USER_STATS: 'analytics:weeklyUserStats',
  ANALYTICS_LABEL_USER_STATS: 'analytics:labelUserStats',
  ANALYTICS_CARD_AGE: 'analytics:cardAge',

  // Ticket numbering
  TICKETS_GET_CONFIG: 'tickets:getConfig',
  TICKETS_PREVIEW_UNNUMBERED: 'tickets:previewUnnumbered',
  TICKETS_APPLY_NUMBERING: 'tickets:applyNumbering',
  TICKETS_UPDATE_CONFIG: 'tickets:updateConfig'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

export interface IpcResult<T> {
  success: boolean
  data?: T
  error?: string
}
