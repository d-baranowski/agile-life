/**
 * Typed wrapper around window.api.invoke for the renderer process.
 * Only exposes IPC channels that have a registered handler in the main process.
 */
import { IPC_CHANNELS } from '@shared/ipc.types';
function invoke(channel, ...args) {
    return window.api.invoke(channel, ...args);
}
export const api = {
    boards: {
        getAll: () => invoke(IPC_CHANNELS.BOARDS_GET_ALL),
        add: (input) => invoke(IPC_CHANNELS.BOARDS_ADD, input),
        update: (boardId, updates) => invoke(IPC_CHANNELS.BOARDS_UPDATE, boardId, updates),
        delete: (boardId) => invoke(IPC_CHANNELS.BOARDS_DELETE, boardId),
        fetchFromTrello: (apiKey, apiToken) => invoke(IPC_CHANNELS.BOARDS_FETCH_FROM_TRELLO, apiKey, apiToken)
    },
    trello: {
        /** Syncs lists + cards for the board and returns a summary. */
        sync: (boardId) => invoke(IPC_CHANNELS.TRELLO_SYNC, boardId),
        /** Returns columns with their cards from the local SQLite cache. */
        getBoardData: (boardId) => invoke(IPC_CHANNELS.TRELLO_GET_BOARD_DATA, boardId),
        /** Moves a card to a different list on Trello and updates the local cache. */
        moveCard: (boardId, cardId, toListId, pos) => invoke(IPC_CHANNELS.TRELLO_MOVE_CARD, boardId, cardId, toListId, pos),
        /** Updates the position of a card on Trello and in the local cache. */
        updateCardPos: (boardId, cardId, pos) => invoke(IPC_CHANNELS.TRELLO_UPDATE_CARD_POS, boardId, cardId, pos),
        /** Dry-run: returns cards that would be archived without touching Trello. */
        previewArchiveDoneCards: (boardId, olderThanWeeks) => invoke(IPC_CHANNELS.TRELLO_PREVIEW_ARCHIVE_DONE_CARDS, boardId, olderThanWeeks),
        /** Debug: all done-column cards with raw timestamp data (no threshold). */
        getDoneColumnDebug: (boardId) => invoke(IPC_CHANNELS.TRELLO_GET_DONE_COLUMN_DEBUG, boardId),
        /** Archives a single card on Trello and removes it from the local cache. */
        archiveCard: (boardId, cardId) => invoke(IPC_CHANNELS.TRELLO_ARCHIVE_CARD, boardId, cardId),
        /** Returns the cached list of board members from the last sync. */
        getBoardMembers: (boardId) => invoke(IPC_CHANNELS.TRELLO_GET_BOARD_MEMBERS, boardId),
        /** Adds or removes a member assignment on a card and returns the updated member list. */
        assignCardMember: (boardId, cardId, memberId, assign) => invoke(IPC_CHANNELS.TRELLO_ASSIGN_CARD_MEMBER, boardId, cardId, memberId, assign),
        /** Archives open cards in the "done" lists that have been in done for olderThanWeeks weeks. */
        archiveDoneCards: (boardId, olderThanWeeks) => invoke(IPC_CHANNELS.TRELLO_ARCHIVE_DONE_CARDS, boardId, olderThanWeeks)
    },
    analytics: {
        /** Returns card counts per open column, read from local cache. */
        columnCounts: (boardId) => invoke(IPC_CHANNELS.ANALYTICS_COLUMN_COUNTS, boardId),
        /** Returns cards closed per user in the last 7 days, grouped by ISO week. */
        weeklyUserStats: (boardId) => invoke(IPC_CHANNELS.ANALYTICS_WEEKLY_USER_STATS, boardId),
        /** Returns closed cards grouped by label + user in the last 7 days. */
        labelUserStats: (boardId) => invoke(IPC_CHANNELS.ANALYTICS_LABEL_USER_STATS, boardId),
        /** Returns age in days for every open card. */
        cardAge: (boardId) => invoke(IPC_CHANNELS.ANALYTICS_CARD_AGE, boardId),
        /** Returns story points completed per user per week for the past 12 months. */
        weeklyHistory: (boardId, storyPointsConfig = []) => invoke(IPC_CHANNELS.ANALYTICS_WEEKLY_HISTORY, boardId, storyPointsConfig),
        /** Returns story points completed per user in the last 7 days. */
        storyPoints7d: (boardId, storyPointsConfig = []) => invoke(IPC_CHANNELS.ANALYTICS_STORY_POINTS_7D, boardId, storyPointsConfig)
    },
    tickets: {
        getConfig: (boardId) => invoke(IPC_CHANNELS.TICKETS_GET_CONFIG, boardId),
        previewUnnumbered: (boardId) => invoke(IPC_CHANNELS.TICKETS_PREVIEW_UNNUMBERED, boardId),
        applyNumbering: (boardId) => invoke(IPC_CHANNELS.TICKETS_APPLY_NUMBERING, boardId),
        applySingleCard: (boardId, cardId, newName) => invoke(IPC_CHANNELS.TICKETS_APPLY_SINGLE_CARD, boardId, cardId, newName),
        updateConfig: (boardId, updates) => invoke(IPC_CHANNELS.TICKETS_UPDATE_CONFIG, boardId, updates)
    },
    settings: {
        /** Returns the current database file path and whether it is a custom path. */
        getDbPath: () => invoke(IPC_CHANNELS.SETTINGS_GET_DB_PATH),
        /**
         * Opens a native save dialog so the user can choose a new database
         * location, copies the existing DB file there, and persists the choice.
         * Pass `resetToDefault = true` to restore the built-in userData path.
         * Changes take effect after restarting the app.
         */
        setDbPath: (resetToDefault = false) => invoke(IPC_CHANNELS.SETTINGS_SET_DB_PATH, resetToDefault)
    },
    templates: {
        /** Returns all template groups for the board. */
        getGroups: (boardId) => invoke(IPC_CHANNELS.TEMPLATES_GET_GROUPS, boardId),
        /** Creates a new template group. */
        createGroup: (boardId, input) => invoke(IPC_CHANNELS.TEMPLATES_CREATE_GROUP, boardId, input),
        /** Updates the name of a template group. */
        updateGroup: (boardId, id, input) => invoke(IPC_CHANNELS.TEMPLATES_UPDATE_GROUP, boardId, id, input),
        /** Deletes a template group and all its templates. */
        deleteGroup: (boardId, id) => invoke(IPC_CHANNELS.TEMPLATES_DELETE_GROUP, boardId, id),
        /** Returns all templates in a group. */
        getTemplates: (boardId, groupId) => invoke(IPC_CHANNELS.TEMPLATES_GET, boardId, groupId),
        /** Creates a new template in a group. */
        createTemplate: (boardId, input) => invoke(IPC_CHANNELS.TEMPLATES_CREATE, boardId, input),
        /** Updates an existing template. */
        updateTemplate: (boardId, id, input) => invoke(IPC_CHANNELS.TEMPLATES_UPDATE, boardId, id, input),
        /** Deletes a template. */
        deleteTemplate: (boardId, id) => invoke(IPC_CHANNELS.TEMPLATES_DELETE, boardId, id),
        /** Generates Trello cards from all templates in a group. */
        generateCards: (boardId, groupId) => invoke(IPC_CHANNELS.TEMPLATES_GENERATE_CARDS, boardId, groupId)
    }
};
