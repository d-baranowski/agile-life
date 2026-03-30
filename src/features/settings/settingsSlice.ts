import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { TrelloMember } from '../../trello/trello.types'
import type { DbPathInfo, LogPathInfo } from './settings.types'
import type {
  DoneCardPreview,
  DoneCardDebugInfo,
  ArchiveResult,
  StoryPointRule
} from '../../lib/board.types'
import { api } from '../api/useApi'

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchSettingsData = createAsyncThunk(
  'settings/fetchSettingsData',
  async (boardId: string) => {
    const [dbResult, logResult, membersResult] = await Promise.all([
      api.settings.getDbPath(),
      api.logs.getPath(),
      api.trello.getBoardMembers(boardId)
    ])
    return {
      dbPathInfo: dbResult.success && dbResult.data ? dbResult.data : null,
      logPathInfo: logResult.success && logResult.data ? logResult.data : null,
      boardMembers: membersResult.success && membersResult.data ? membersResult.data : []
    }
  }
)

export const chooseDbPath = createAsyncThunk('settings/chooseDbPath', async (reset: boolean) => {
  const result = await api.settings.setDbPath(reset)
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to change database location.')
  }
  return result.data
})

export const chooseLogPath = createAsyncThunk('settings/chooseLogPath', async (reset: boolean) => {
  const result = await api.logs.setPath(reset)
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to change log location.')
  }
  return result.data
})

export const previewArchiveDoneCards = createAsyncThunk(
  'settings/previewArchiveDoneCards',
  async (args: { boardId: string; weeks: number }) => {
    const result = await api.trello.previewArchiveDoneCards(args.boardId, args.weeks)
    if (!result.success) throw new Error(result.error ?? 'Preview failed.')
    return result.data ?? []
  }
)

export const archiveDoneCards = createAsyncThunk(
  'settings/archiveDoneCards',
  async (args: { boardId: string; weeks: number }) => {
    const result = await api.trello.archiveDoneCards(args.boardId, args.weeks)
    if (!result.success || !result.data) throw new Error(result.error ?? 'Archive failed.')
    return result.data
  }
)

export const fetchDoneColumnDebug = createAsyncThunk(
  'settings/fetchDoneColumnDebug',
  async (boardId: string) => {
    const result = await api.trello.getDoneColumnDebug(boardId)
    if (!result.success) throw new Error(result.error ?? 'Failed to load debug data.')
    return result.data ?? []
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

interface SettingsState {
  // Board form
  boardName: string
  doneListNames: string
  saving: boolean
  deleting: boolean
  confirmDelete: boolean
  error: string | null
  success: string | null

  // DB path
  dbPathInfo: DbPathInfo | null
  dbPathChanging: boolean
  dbPathError: string | null
  dbPathChanged: boolean

  // Log path
  logPathInfo: LogPathInfo | null
  logPathChanging: boolean
  logPathError: string | null

  // Epic board
  epicBoardSaving: boolean
  epicBoardError: string | null

  // My identity
  boardMembers: TrelloMember[]
  myMemberSaving: boolean
  myMemberError: string | null

  // Sound preferences (localStorage-backed, not persisted in Redux beyond session)
  soundEnabled: boolean
  soundVolume: number

  // Archive done cards
  archiveWeeks: number
  previewing: boolean
  previewCards: DoneCardPreview[] | null
  previewError: string | null
  archiving: boolean
  archiveResult: ArchiveResult | null
  archiveError: string | null

  // Debug done column
  debugOpen: boolean
  debugLoading: boolean
  debugCards: DoneCardDebugInfo[] | null
  debugError: string | null

  // Story points editor
  storyPointsRules: StoryPointRule[]
  storyPointsSaving: boolean
  storyPointsError: string | null
  storyPointsSuccess: string | null
}

const initialState: SettingsState = {
  boardName: '',
  doneListNames: '',
  saving: false,
  deleting: false,
  confirmDelete: false,
  error: null,
  success: null,

  dbPathInfo: null,
  dbPathChanging: false,
  dbPathError: null,
  dbPathChanged: false,

  logPathInfo: null,
  logPathChanging: false,
  logPathError: null,

  epicBoardSaving: false,
  epicBoardError: null,

  boardMembers: [],
  myMemberSaving: false,
  myMemberError: null,

  soundEnabled: true,
  soundVolume: 0.5,

  archiveWeeks: 4,
  previewing: false,
  previewCards: null,
  previewError: null,
  archiving: false,
  archiveResult: null,
  archiveError: null,

  debugOpen: false,
  debugLoading: false,
  debugCards: null,
  debugError: null,

  storyPointsRules: [],
  storyPointsSaving: false,
  storyPointsError: null,
  storyPointsSuccess: null
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // ── Board form ──
    settingsInitialised(
      state,
      action: PayloadAction<{
        boardName: string
        doneListNames: string
        soundEnabled: boolean
        soundVolume: number
        storyPointsRules: StoryPointRule[]
      }>
    ) {
      state.boardName = action.payload.boardName
      state.doneListNames = action.payload.doneListNames
      state.soundEnabled = action.payload.soundEnabled
      state.soundVolume = action.payload.soundVolume
      state.storyPointsRules = action.payload.storyPointsRules
      state.error = null
      state.success = null
      state.confirmDelete = false
    },
    boardNameChanged(state, action: PayloadAction<string>) {
      state.boardName = action.payload
    },
    doneListNamesChanged(state, action: PayloadAction<string>) {
      state.doneListNames = action.payload
    },
    savingStarted(state) {
      state.saving = true
      state.error = null
      state.success = null
    },
    savingFinished(state, action: PayloadAction<{ error?: string; success?: string }>) {
      state.saving = false
      state.error = action.payload.error ?? null
      state.success = action.payload.success ?? null
    },
    deletingStarted(state) {
      state.deleting = true
    },
    deletingFinished(state) {
      state.deleting = false
    },
    confirmDeleteToggled(state, action: PayloadAction<boolean>) {
      state.confirmDelete = action.payload
    },
    settingsErrorSet(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
    settingsSuccessDismissed(state) {
      state.success = null
    },

    // ── Epic board ──
    epicBoardSavingStarted(state) {
      state.epicBoardSaving = true
      state.epicBoardError = null
    },
    epicBoardSavingFinished(state, action: PayloadAction<string | null>) {
      state.epicBoardSaving = false
      state.epicBoardError = action.payload
    },

    // ── My identity ──
    myMemberSavingStarted(state) {
      state.myMemberSaving = true
      state.myMemberError = null
    },
    myMemberSavingFinished(state, action: PayloadAction<string | null>) {
      state.myMemberSaving = false
      state.myMemberError = action.payload
    },

    // ── Sound ──
    soundEnabledChanged(state, action: PayloadAction<boolean>) {
      state.soundEnabled = action.payload
    },
    soundVolumeChanged(state, action: PayloadAction<number>) {
      state.soundVolume = action.payload
    },

    // ── Archive ──
    archiveWeeksChanged(state, action: PayloadAction<number>) {
      state.archiveWeeks = action.payload
    },
    previewCardsDismissed(state) {
      state.previewCards = null
    },
    archiveReset(state) {
      state.previewCards = null
      state.previewError = null
      state.archiveResult = null
      state.archiveError = null
    },

    // ── Debug ──
    debugToggled(state) {
      state.debugOpen = !state.debugOpen
    },

    // ── Story points ──
    storyPointsRulesChanged(state, action: PayloadAction<StoryPointRule[]>) {
      state.storyPointsRules = action.payload
    },
    storyPointsSavingStarted(state) {
      state.storyPointsSaving = true
      state.storyPointsError = null
      state.storyPointsSuccess = null
    },
    storyPointsSavingFinished(state, action: PayloadAction<{ error?: string; success?: string }>) {
      state.storyPointsSaving = false
      state.storyPointsError = action.payload.error ?? null
      state.storyPointsSuccess = action.payload.success ?? null
    },
    storyPointsSuccessDismissed(state) {
      state.storyPointsSuccess = null
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchSettingsData ──
      .addCase(fetchSettingsData.fulfilled, (state, action) => {
        state.dbPathInfo = action.payload.dbPathInfo
        state.logPathInfo = action.payload.logPathInfo
        state.boardMembers = action.payload.boardMembers
      })

      // ── chooseDbPath ──
      .addCase(chooseDbPath.pending, (state) => {
        state.dbPathChanging = true
        state.dbPathError = null
      })
      .addCase(chooseDbPath.fulfilled, (state, action) => {
        state.dbPathChanging = false
        state.dbPathInfo = action.payload
        if (action.payload.isCustom) state.dbPathChanged = true
      })
      .addCase(chooseDbPath.rejected, (state, action) => {
        state.dbPathChanging = false
        state.dbPathError = action.error.message ?? 'Failed to change database location.'
      })

      // ── chooseLogPath ──
      .addCase(chooseLogPath.pending, (state) => {
        state.logPathChanging = true
        state.logPathError = null
      })
      .addCase(chooseLogPath.fulfilled, (state, action) => {
        state.logPathChanging = false
        state.logPathInfo = action.payload
      })
      .addCase(chooseLogPath.rejected, (state, action) => {
        state.logPathChanging = false
        state.logPathError = action.error.message ?? 'Failed to change log location.'
      })

      // ── previewArchiveDoneCards ──
      .addCase(previewArchiveDoneCards.pending, (state) => {
        state.previewing = true
        state.previewError = null
        state.previewCards = null
        state.archiveResult = null
        state.archiveError = null
      })
      .addCase(previewArchiveDoneCards.fulfilled, (state, action) => {
        state.previewing = false
        state.previewCards = action.payload
      })
      .addCase(previewArchiveDoneCards.rejected, (state, action) => {
        state.previewing = false
        state.previewError = action.error.message ?? 'Preview failed.'
      })

      // ── archiveDoneCards ──
      .addCase(archiveDoneCards.pending, (state) => {
        state.archiving = true
        state.archiveError = null
        state.archiveResult = null
      })
      .addCase(archiveDoneCards.fulfilled, (state, action) => {
        state.archiving = false
        state.archiveResult = action.payload
        state.previewCards = null
        state.debugCards = null
      })
      .addCase(archiveDoneCards.rejected, (state, action) => {
        state.archiving = false
        state.archiveError = action.error.message ?? 'Archive failed.'
      })

      // ── fetchDoneColumnDebug ──
      .addCase(fetchDoneColumnDebug.pending, (state) => {
        state.debugLoading = true
        state.debugError = null
      })
      .addCase(fetchDoneColumnDebug.fulfilled, (state, action) => {
        state.debugLoading = false
        state.debugCards = action.payload
      })
      .addCase(fetchDoneColumnDebug.rejected, (state, action) => {
        state.debugLoading = false
        state.debugError = action.error.message ?? 'Failed to load debug data.'
      })
  }
})

export const {
  settingsInitialised,
  boardNameChanged,
  doneListNamesChanged,
  savingStarted,
  savingFinished,
  deletingStarted,
  deletingFinished,
  confirmDeleteToggled,

  epicBoardSavingStarted,
  epicBoardSavingFinished,
  myMemberSavingStarted,
  myMemberSavingFinished,
  soundEnabledChanged,
  soundVolumeChanged,
  archiveWeeksChanged,
  previewCardsDismissed,

  debugToggled,
  storyPointsRulesChanged,
  storyPointsSavingStarted,
  storyPointsSavingFinished,
  storyPointsSuccessDismissed
} = settingsSlice.actions
export default settingsSlice.reducer
