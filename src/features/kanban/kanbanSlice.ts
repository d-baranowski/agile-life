import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { KanbanColumn, TrelloMember, TrelloLabel } from '../../trello/trello.types'
import type { EpicCardOption, EpicStory } from '../../lib/board.types'
import type { GamificationStats } from '../analytics/analytics.types'
import type {
  ContextMenuState,
  AddCardModal,
  BulkLabelModal,
  BulkArchiveModal,
  BulkMemberModal
} from './kanban.types'
import type {
  TemplateGroup,
  TicketTemplate,
  GenerateCardsResult
} from '../templates/template.types'
import type { CardTimerEntry } from '../timers/timer.types'
import { api } from '../api/useApi'

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchBoardData = createAsyncThunk('kanban/fetchBoardData', async (boardId: string) => {
  const [dataResult, membersResult, labelsResult, activeTimersResult, totalsResult] =
    await Promise.all([
      api.trello.getBoardData(boardId),
      api.trello.getBoardMembers(boardId),
      api.trello.getBoardLabels(boardId),
      api.timers.listActive(boardId),
      api.timers.getTotals(boardId)
    ])
  return {
    columns: dataResult.success && dataResult.data ? dataResult.data : ([] as KanbanColumn[]),
    error: !dataResult.success ? (dataResult.error ?? 'Failed to load board data.') : null,
    members:
      membersResult.success && membersResult.data ? membersResult.data : ([] as TrelloMember[]),
    labels: labelsResult.success && labelsResult.data ? labelsResult.data : ([] as TrelloLabel[]),
    activeTimers:
      activeTimersResult.success && activeTimersResult.data
        ? activeTimersResult.data
        : ([] as CardTimerEntry[]),
    cardTimerTotals:
      totalsResult.success && totalsResult.data ? totalsResult.data : ({} as Record<string, number>)
  }
})

export const fetchEpicCards = createAsyncThunk(
  'kanban/fetchEpicCards',
  async (storyBoardId: string) => {
    const result = await api.epics.getCards(storyBoardId)
    return result.success && result.data ? result.data : ([] as EpicCardOption[])
  }
)

export const fetchEpicStories = createAsyncThunk(
  'kanban/fetchEpicStories',
  async (epicCardId: string) => {
    const result = await api.epics.getStories(epicCardId)
    return result.success && result.data ? result.data : ([] as EpicStory[])
  }
)

export const fetchGamificationStats = createAsyncThunk(
  'kanban/fetchGamificationStats',
  async (args: {
    boardId: string
    myMemberId: string
    storyPointsConfig: { labelName: string; points: number }[]
  }) => {
    const result = await api.analytics.gamificationStats(
      args.boardId,
      args.myMemberId,
      args.storyPointsConfig
    )
    return result.success && result.data ? result.data : null
  }
)

export const fetchGenerateTemplateGroups = createAsyncThunk(
  'kanban/fetchGenerateTemplateGroups',
  async (boardId: string) => {
    const result = await api.templates.getGroups(boardId)
    if (!result.success) throw new Error(result.error ?? 'Failed to load template groups.')
    return result.data ?? ([] as TemplateGroup[])
  }
)

export const fetchGenerateTemplates = createAsyncThunk(
  'kanban/fetchGenerateTemplates',
  async (args: { boardId: string; groupId: number }) => {
    const result = await api.templates.getTemplates(args.boardId, args.groupId)
    if (!result.success) throw new Error(result.error ?? 'Failed to load templates.')
    return { groupId: args.groupId, templates: result.data ?? ([] as TicketTemplate[]) }
  }
)

export const generateCardsFromTemplate = createAsyncThunk(
  'kanban/generateCardsFromTemplate',
  async (args: { boardId: string; groupId: number }) => {
    const result = await api.templates.generateCards(args.boardId, args.groupId)
    if (!result.success) throw new Error(result.error ?? 'Failed to generate cards.')
    return result.data!
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

/** Serialisable version of BulkLabelModal (Set → string[]) for Redux store. */
interface StoreBulkLabelModal {
  selectedLabelIds: string[]
  text: string
  queue: NonNullable<BulkLabelModal['queue']> | null
  uploading: boolean
  fromSelection?: boolean
}

interface KanbanState {
  // Board data
  columns: KanbanColumn[]
  boardMembers: TrelloMember[]
  boardLabels: TrelloLabel[]
  loading: boolean
  error: string | null
  toastMessage: string | null

  // Filters
  searchQuery: string
  epicFilter: string
  epicColumnFilter: string
  showDuplicates: boolean
  filterUnassigned: boolean
  filterNoEpic: boolean
  filterNoSize: boolean

  // Toolbar modals
  showTicketsModal: boolean
  showEmptyMeatball: boolean
  showMainMeatball: boolean

  // Selection
  selectedCardIds: string[]

  // Context menu
  contextMenu: ContextMenuState | null

  // Epic management
  epicCardOptions: EpicCardOption[]
  epicDropdownCardId: string | null
  epicStoriesCard: { id: string; name: string } | null
  epicStories: EpicStory[] | null
  epicStoriesLoading: boolean

  // Gamification
  gamificationStats: GamificationStats | null
  levelUpTriggered: boolean

  // Add card modal
  addCardModal: AddCardModal | null

  // Bulk label modal
  bulkLabelModal: StoreBulkLabelModal | null

  // Bulk archive modal
  bulkArchiveModal: BulkArchiveModal | null

  // Bulk member modal
  bulkMemberModal: BulkMemberModal | null

  // Bulk epic dropdown
  bulkEpicDropdownOpen: boolean
  bulkEpicSearch: string

  // Bulk member dropdown
  bulkMemberDropdownOpen: boolean

  // Card timers
  activeTimers: Record<string, CardTimerEntry>
  cardTimerTotals: Record<string, number>
  timerModalCardId: string | null
  timerModalEntries: CardTimerEntry[]
  timerModalLoading: boolean

  // Generate template modal
  showGenModal: boolean
  genGroups: TemplateGroup[]
  genGroupId: number | null
  genTemplates: TicketTemplate[]
  genLoading: boolean
  genGenerating: boolean
  genResult: GenerateCardsResult | null
  genError: string | null
}

const initialState: KanbanState = {
  columns: [],
  boardMembers: [],
  boardLabels: [],
  loading: true,
  error: null,
  toastMessage: null,

  searchQuery: '',
  epicFilter: '',
  epicColumnFilter: '',
  showDuplicates: false,
  filterUnassigned: false,
  filterNoEpic: false,
  filterNoSize: false,

  showTicketsModal: false,
  showEmptyMeatball: false,
  showMainMeatball: false,

  selectedCardIds: [],
  contextMenu: null,

  epicCardOptions: [],
  epicDropdownCardId: null,
  epicStoriesCard: null,
  epicStories: null,
  epicStoriesLoading: false,

  gamificationStats: null,
  levelUpTriggered: false,

  addCardModal: null,
  bulkLabelModal: null,
  bulkArchiveModal: null,
  bulkMemberModal: null,

  bulkEpicDropdownOpen: false,
  bulkEpicSearch: '',
  bulkMemberDropdownOpen: false,

  activeTimers: {},
  cardTimerTotals: {},
  timerModalCardId: null,
  timerModalEntries: [],
  timerModalLoading: false,

  showGenModal: false,
  genGroups: [],
  genGroupId: null,
  genTemplates: [],
  genLoading: false,
  genGenerating: false,
  genResult: null,
  genError: null
}

const kanbanSlice = createSlice({
  name: 'kanban',
  initialState,
  reducers: {
    // ── Column updates ──
    columnsUpdated(state, action: PayloadAction<KanbanColumn[]>) {
      state.columns = action.payload
    },
    columnAdded(state, action: PayloadAction<KanbanColumn>) {
      state.columns.push(action.payload)
    },
    columnRemoved(state, action: PayloadAction<string>) {
      const removedCol = state.columns.find((c) => c.id === action.payload)
      const removedCardIds = new Set(removedCol?.cards.map((card) => card.id) ?? [])
      state.columns = state.columns.filter((c) => c.id !== action.payload)
      state.selectedCardIds = state.selectedCardIds.filter((id) => !removedCardIds.has(id))
    },
    cardRemovedFromColumn(state, action: PayloadAction<string>) {
      const cardId = action.payload
      for (const col of state.columns) {
        col.cards = col.cards.filter((c) => c.id !== cardId)
      }
      state.selectedCardIds = state.selectedCardIds.filter((id) => id !== cardId)
    },
    cardsAddedToColumn(
      state,
      action: PayloadAction<{ listId: string; cards: KanbanColumn['cards'] }>
    ) {
      const col = state.columns.find((c) => c.id === action.payload.listId)
      if (col) col.cards.push(...action.payload.cards)
    },
    cardMembersUpdated(state, action: PayloadAction<{ cardId: string; members: TrelloMember[] }>) {
      for (const col of state.columns) {
        const card = col.cards.find((c) => c.id === action.payload.cardId)
        if (card) {
          card.members = action.payload.members
          break
        }
      }
    },
    cardLabelsUpdated(state, action: PayloadAction<{ cardId: string; labels: TrelloLabel[] }>) {
      for (const col of state.columns) {
        const card = col.cards.find((c) => c.id === action.payload.cardId)
        if (card) {
          card.labels = action.payload.labels
          break
        }
      }
    },
    cardNameUpdated(state, action: PayloadAction<{ cardId: string; name: string }>) {
      for (const col of state.columns) {
        const card = col.cards.find((c) => c.id === action.payload.cardId)
        if (card) {
          card.name = action.payload.name
          break
        }
      }
    },
    cardEpicUpdated(
      state,
      action: PayloadAction<{
        cardId: string
        epicCardId: string | null
        epicCardName: string | null
      }>
    ) {
      for (const col of state.columns) {
        const card = col.cards.find((c) => c.id === action.payload.cardId)
        if (card) {
          card.epicCardId = action.payload.epicCardId
          card.epicCardName = action.payload.epicCardName
          break
        }
      }
    },
    bulkCardEpicUpdated(
      state,
      action: PayloadAction<{
        cardIds: string[]
        epicCardId: string | null
        epicCardName: string | null
      }>
    ) {
      const idSet = new Set(action.payload.cardIds)
      for (const col of state.columns) {
        for (const card of col.cards) {
          if (idSet.has(card.id)) {
            card.epicCardId = action.payload.epicCardId
            card.epicCardName = action.payload.epicCardName
          }
        }
      }
    },

    // ── Toast ──
    kanbanToastShown(state, action: PayloadAction<string>) {
      state.toastMessage = action.payload
    },
    kanbanToastDismissed(state) {
      state.toastMessage = null
    },

    // ── Filters ──
    searchQueryChanged(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload
    },
    epicFilterChanged(state, action: PayloadAction<string>) {
      state.epicFilter = action.payload
      state.epicColumnFilter = ''
    },
    epicColumnFilterChanged(state, action: PayloadAction<string>) {
      state.epicColumnFilter = action.payload
      state.epicFilter = ''
    },
    filtersResetForBoard(state) {
      state.searchQuery = ''
      state.epicFilter = ''
      state.epicColumnFilter = ''
      state.showDuplicates = false
      state.filterUnassigned = false
      state.filterNoEpic = false
      state.filterNoSize = false
    },
    duplicatesToggled(state) {
      state.showDuplicates = !state.showDuplicates
      state.showMainMeatball = false
    },
    unassignedToggled(state) {
      state.filterUnassigned = !state.filterUnassigned
      state.showMainMeatball = false
    },
    noEpicToggled(state) {
      state.filterNoEpic = !state.filterNoEpic
      state.showMainMeatball = false
    },
    noSizeToggled(state) {
      state.filterNoSize = !state.filterNoSize
      state.showMainMeatball = false
    },

    // ── Toolbar modals ──
    ticketsModalToggled(state, action: PayloadAction<boolean>) {
      state.showTicketsModal = action.payload
    },
    emptyMeatballToggled(state) {
      state.showEmptyMeatball = !state.showEmptyMeatball
    },
    emptyMeatballClosed(state) {
      state.showEmptyMeatball = false
    },
    mainMeatballToggled(state) {
      state.showMainMeatball = !state.showMainMeatball
    },
    mainMeatballClosed(state) {
      state.showMainMeatball = false
    },

    // ── Selection ──
    cardToggleSelected(state, action: PayloadAction<string>) {
      const idx = state.selectedCardIds.indexOf(action.payload)
      if (idx === -1) state.selectedCardIds.push(action.payload)
      else state.selectedCardIds.splice(idx, 1)
    },
    allCardsInColumnSelected(state, action: PayloadAction<string[]>) {
      const idSet = new Set(state.selectedCardIds)
      for (const id of action.payload) idSet.add(id)
      state.selectedCardIds = [...idSet]
    },
    selectionCleared(state) {
      state.selectedCardIds = []
    },

    // ── Context menu ──
    contextMenuOpened(state, action: PayloadAction<ContextMenuState>) {
      state.contextMenu = action.payload
    },
    contextMenuClosed(state) {
      state.contextMenu = null
    },

    // ── Epic management ──
    epicDropdownToggled(state, action: PayloadAction<string>) {
      state.epicDropdownCardId = state.epicDropdownCardId === action.payload ? null : action.payload
    },
    epicDropdownClosed(state) {
      state.epicDropdownCardId = null
    },
    epicStoriesOpened(state, action: PayloadAction<{ id: string; name: string }>) {
      state.epicStoriesCard = action.payload
      state.epicStories = null
      state.epicStoriesLoading = true
    },
    epicStoriesClosed(state) {
      state.epicStoriesCard = null
      state.epicStories = null
    },

    // ── Add card modal ──
    addCardOpened(state, action: PayloadAction<{ listId: string; listName: string }>) {
      state.addCardModal = {
        listId: action.payload.listId,
        listName: action.payload.listName,
        text: '',
        queue: null,
        uploading: false
      }
    },
    addCardClosed(state) {
      if (state.addCardModal && !state.addCardModal.uploading) {
        state.addCardModal = null
      }
    },
    addCardModalUpdated(state, action: PayloadAction<AddCardModal>) {
      state.addCardModal = action.payload
    },

    // ── Bulk label modal ──
    bulkLabelModalOpened(state, action: PayloadAction<StoreBulkLabelModal>) {
      state.bulkLabelModal = action.payload
    },
    bulkLabelModalClosed(state) {
      if (state.bulkLabelModal && !state.bulkLabelModal.uploading) {
        state.bulkLabelModal = null
      }
    },
    bulkLabelModalUpdated(state, action: PayloadAction<StoreBulkLabelModal>) {
      state.bulkLabelModal = action.payload
    },

    // ── Bulk archive modal ──
    bulkArchiveModalOpened(state) {
      if (state.selectedCardIds.length > 0) {
        state.bulkArchiveModal = { queue: null, running: false }
      }
    },
    bulkArchiveModalClosed(state) {
      if (state.bulkArchiveModal && !state.bulkArchiveModal.running) {
        state.bulkArchiveModal = null
      }
    },
    bulkArchiveModalUpdated(state, action: PayloadAction<BulkArchiveModal>) {
      state.bulkArchiveModal = action.payload
    },

    // ── Bulk member modal ──
    bulkMemberModalOpened(
      state,
      action: PayloadAction<{ memberId: string; memberName: string; assign: boolean }>
    ) {
      if (state.selectedCardIds.length > 0) {
        state.bulkMemberDropdownOpen = false
        state.bulkMemberModal = {
          memberId: action.payload.memberId,
          memberName: action.payload.memberName,
          assign: action.payload.assign,
          queue: null,
          running: false
        }
      }
    },
    bulkMemberModalClosed(state) {
      if (state.bulkMemberModal && !state.bulkMemberModal.running) {
        state.bulkMemberModal = null
      }
    },
    bulkMemberModalUpdated(state, action: PayloadAction<BulkMemberModal>) {
      state.bulkMemberModal = action.payload
    },

    // ── Bulk epic dropdown ──
    bulkEpicDropdownToggled(state) {
      state.bulkEpicDropdownOpen = !state.bulkEpicDropdownOpen
    },
    bulkEpicDropdownClosed(state) {
      state.bulkEpicDropdownOpen = false
      state.bulkEpicSearch = ''
    },
    bulkEpicSearchChanged(state, action: PayloadAction<string>) {
      state.bulkEpicSearch = action.payload
    },

    // ── Bulk member dropdown ──
    bulkMemberDropdownToggled(state) {
      state.bulkMemberDropdownOpen = !state.bulkMemberDropdownOpen
    },
    bulkMemberDropdownClosed(state) {
      state.bulkMemberDropdownOpen = false
    },

    // ── Generate template modal ──
    genModalOpened(state) {
      state.showGenModal = true
      state.genGroupId = null
      state.genTemplates = []
      state.genResult = null
      state.genError = null
    },
    genModalClosed(state) {
      state.showGenModal = false
    },

    // ── Escape key handler ──
    escapePressed(state) {
      state.timerModalCardId = null
      state.timerModalEntries = []
      state.showTicketsModal = false
      state.epicStoriesCard = null
      state.epicStories = null
      state.epicDropdownCardId = null
      state.showGenModal = false
      state.bulkEpicDropdownOpen = false
      state.bulkEpicSearch = ''
      state.selectedCardIds = []
      state.showEmptyMeatball = false
      state.showMainMeatball = false
      if (state.addCardModal && !state.addCardModal.uploading) {
        state.addCardModal = null
      }
      if (state.bulkArchiveModal && !state.bulkArchiveModal.running) {
        state.bulkArchiveModal = null
      }
      if (state.bulkMemberModal && !state.bulkMemberModal.running) {
        state.bulkMemberModal = null
      }
    },

    // ── Card timers ──
    activeTimerSet(state, action: PayloadAction<CardTimerEntry>) {
      state.activeTimers[action.payload.cardId] = action.payload
    },
    activeTimerCleared(state, action: PayloadAction<string>) {
      delete state.activeTimers[action.payload]
    },
    cardTimerTotalsReplaced(state, action: PayloadAction<Record<string, number>>) {
      state.cardTimerTotals = action.payload
    },
    timerModalOpened(state, action: PayloadAction<string>) {
      state.timerModalCardId = action.payload
      state.timerModalEntries = []
      state.timerModalLoading = true
    },
    timerModalClosed(state) {
      state.timerModalCardId = null
      state.timerModalEntries = []
      state.timerModalLoading = false
    },
    timerModalEntriesLoaded(state, action: PayloadAction<CardTimerEntry[]>) {
      state.timerModalEntries = action.payload
      state.timerModalLoading = false
    },
    timerModalEntryUpserted(state, action: PayloadAction<CardTimerEntry>) {
      const idx = state.timerModalEntries.findIndex((e) => e.id === action.payload.id)
      if (idx >= 0) state.timerModalEntries[idx] = action.payload
      else state.timerModalEntries.unshift(action.payload)
    },
    timerModalEntryRemoved(state, action: PayloadAction<string>) {
      state.timerModalEntries = state.timerModalEntries.filter((e) => e.id !== action.payload)
    },

    // ── Gamification level-up ──
    levelUpAchieved(state) {
      state.levelUpTriggered = true
    },
    levelUpConsumed(state) {
      state.levelUpTriggered = false
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoardData.pending, (state) => {
        state.loading = true
        state.error = null
        state.selectedCardIds = []
        // Reset gamification so the middleware has no stale cross-board baseline
        state.gamificationStats = null
        state.levelUpTriggered = false
      })
      .addCase(fetchBoardData.fulfilled, (state, action) => {
        state.columns = action.payload.columns
        state.boardMembers = action.payload.members
        state.boardLabels = action.payload.labels
        state.error = action.payload.error
        state.loading = false
        state.activeTimers = {}
        for (const entry of action.payload.activeTimers ?? []) {
          state.activeTimers[entry.cardId] = entry
        }
        state.cardTimerTotals = action.payload.cardTimerTotals ?? {}
      })
      .addCase(fetchBoardData.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to load board data.'
        state.loading = false
      })

      .addCase(fetchEpicCards.fulfilled, (state, action) => {
        state.epicCardOptions = action.payload
      })

      .addCase(fetchEpicStories.pending, (state) => {
        state.epicStoriesLoading = true
      })
      .addCase(fetchEpicStories.fulfilled, (state, action) => {
        state.epicStories = action.payload
        state.epicStoriesLoading = false
      })
      .addCase(fetchEpicStories.rejected, (state) => {
        state.epicStoriesLoading = false
      })

      .addCase(fetchGamificationStats.fulfilled, (state, action) => {
        state.gamificationStats = action.payload
      })

      .addCase(fetchGenerateTemplateGroups.fulfilled, (state, action) => {
        state.genGroups = action.payload
      })
      .addCase(fetchGenerateTemplateGroups.rejected, (state, action) => {
        state.genError = action.error.message ?? 'Failed to load template groups.'
      })

      .addCase(fetchGenerateTemplates.pending, (state) => {
        state.genLoading = true
        state.genResult = null
        state.genError = null
      })
      .addCase(fetchGenerateTemplates.fulfilled, (state, action) => {
        state.genGroupId = action.payload.groupId
        state.genTemplates = action.payload.templates
        state.genLoading = false
      })
      .addCase(fetchGenerateTemplates.rejected, (state, action) => {
        state.genError = action.error.message ?? 'Failed to load templates.'
        state.genLoading = false
      })

      .addCase(generateCardsFromTemplate.pending, (state) => {
        state.genGenerating = true
        state.genResult = null
        state.genError = null
      })
      .addCase(generateCardsFromTemplate.fulfilled, (state, action) => {
        state.genResult = action.payload
        state.genGenerating = false
      })
      .addCase(generateCardsFromTemplate.rejected, (state, action) => {
        state.genError = action.error.message ?? 'Failed to generate cards.'
        state.genGenerating = false
      })
  }
})

export const {
  columnsUpdated,
  columnAdded,
  columnRemoved,
  cardRemovedFromColumn,
  cardsAddedToColumn,
  cardMembersUpdated,
  cardLabelsUpdated,
  cardNameUpdated,
  cardEpicUpdated,
  bulkCardEpicUpdated,
  kanbanToastShown,
  kanbanToastDismissed,
  searchQueryChanged,
  epicFilterChanged,
  epicColumnFilterChanged,
  filtersResetForBoard,
  duplicatesToggled,
  unassignedToggled,
  noEpicToggled,
  noSizeToggled,
  ticketsModalToggled,
  emptyMeatballToggled,
  emptyMeatballClosed,
  mainMeatballToggled,
  mainMeatballClosed,
  cardToggleSelected,
  allCardsInColumnSelected,
  selectionCleared,
  contextMenuOpened,
  contextMenuClosed,
  epicDropdownToggled,
  epicDropdownClosed,
  epicStoriesOpened,
  epicStoriesClosed,
  addCardOpened,
  addCardClosed,
  addCardModalUpdated,
  bulkLabelModalOpened,
  bulkLabelModalClosed,
  bulkLabelModalUpdated,
  bulkArchiveModalOpened,
  bulkArchiveModalClosed,
  bulkArchiveModalUpdated,
  bulkMemberModalOpened,
  bulkMemberModalClosed,
  bulkMemberModalUpdated,
  bulkEpicDropdownToggled,
  bulkEpicDropdownClosed,
  bulkEpicSearchChanged,
  bulkMemberDropdownToggled,
  bulkMemberDropdownClosed,
  genModalOpened,
  genModalClosed,
  activeTimerSet,
  activeTimerCleared,
  cardTimerTotalsReplaced,
  timerModalOpened,
  timerModalClosed,
  timerModalEntriesLoaded,
  timerModalEntryUpserted,
  timerModalEntryRemoved,
  escapePressed,
  levelUpAchieved,
  levelUpConsumed
} = kanbanSlice.actions

export default kanbanSlice.reducer

// ── Memoized selectors ────────────────────────────────────────────────────────

const selectKanban = (state: { kanban: KanbanState }) => state.kanban

const selectColumns = createSelector(selectKanban, (k) => k.columns)
const selectEpicCardOptions = createSelector(selectKanban, (k) => k.epicCardOptions)

/** Set of lowercase card names that appear more than once across all columns. */
export const selectDuplicateNames = createSelector(selectColumns, (columns) => {
  const counts = new Map<string, number>()
  for (const col of columns)
    for (const card of col.cards) {
      const key = card.name.trim().toLowerCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n))
})

/** Deduplicated epic columns from epicCardOptions. */
export const selectEpicColumns = createSelector(selectEpicCardOptions, (options) =>
  options.reduce<{ listId: string; listName: string }[]>((acc, opt) => {
    if (!acc.some((c) => c.listId === opt.listId))
      acc.push({ listId: opt.listId, listName: opt.listName })
    return acc
  }, [])
)
