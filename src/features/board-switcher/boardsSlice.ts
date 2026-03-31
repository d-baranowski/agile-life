import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { BoardConfig, BoardConfigInput } from '../../lib/board.types'
import { api } from '../api/useApi'

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchBoards = createAsyncThunk('boards/fetchBoards', async () => {
  const [boardsResult, lastSelectedResult] = await Promise.all([
    api.boards.getAll(),
    api.boards.getLastSelected()
  ])
  return {
    boards: boardsResult.success && boardsResult.data ? boardsResult.data : [],
    lastSelectedId: lastSelectedResult.success ? (lastSelectedResult.data ?? null) : null
  }
})

export const syncBoard = createAsyncThunk(
  'boards/syncBoard',
  async (boardId: string, { dispatch }) => {
    const result = await api.trello.sync(boardId)
    if (!result.success) {
      throw new Error(result.error ?? 'Sync failed. Please try again.')
    }
    // Refresh boards to update lastSyncedAt
    await dispatch(fetchBoards())
    return result.data!
  }
)

export const addBoard = createAsyncThunk('boards/addBoard', async (input: BoardConfigInput) => {
  const result = await api.boards.add(input)
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to add board.')
  }
  await api.boards.setLastSelected(result.data.boardId)
  return result.data
})

export const deleteBoard = createAsyncThunk('boards/deleteBoard', async (boardId: string) => {
  const result = await api.boards.delete(boardId)
  if (!result.success) {
    throw new Error(result.error ?? 'Failed to delete board.')
  }
  return boardId
})

export const updateBoard = createAsyncThunk(
  'boards/updateBoard',
  async (args: { boardId: string; updates: Partial<BoardConfigInput> }) => {
    const result = await api.boards.update(args.boardId, args.updates)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to save settings.')
    }
    return result.data
  }
)

export const setEpicBoard = createAsyncThunk(
  'boards/setEpicBoard',
  async (args: { storyBoardId: string; epicBoardId: string | null }) => {
    const result = await api.boards.setEpicBoard(args.storyBoardId, args.epicBoardId)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to update epic board.')
    }
    return result.data
  }
)

export const setMyMember = createAsyncThunk(
  'boards/setMyMember',
  async (args: { boardId: string; myMemberId: string | null }) => {
    const result = await api.boards.setMyMember(args.boardId, args.myMemberId)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to update identity.')
    }
    return result.data
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

interface BoardsState {
  items: BoardConfig[]
  selectedBoardId: string | null
  loading: boolean
  syncing: boolean
  /** Incremented after each successful sync so downstream slices can re-fetch. */
  syncVersion: number
  syncError: string | null
}

const initialState: BoardsState = {
  items: [],
  selectedBoardId: null,
  loading: true,
  syncing: false,
  syncVersion: 0,
  syncError: null
}

const boardsSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    boardSelected(state, action: PayloadAction<string>) {
      state.selectedBoardId = action.payload
      api.boards.setLastSelected(action.payload)
    },
    syncErrorDismissed(state) {
      state.syncError = null
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchBoards ──
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.items = action.payload.boards
        state.loading = false
        // Only set selectedBoardId if not already set
        if (!state.selectedBoardId && action.payload.boards.length > 0) {
          const lastId = action.payload.lastSelectedId
          const validLast =
            lastId && action.payload.boards.some((b) => b.boardId === lastId) ? lastId : null
          state.selectedBoardId = validLast ?? action.payload.boards[0].boardId
        }
      })
      .addCase(fetchBoards.rejected, (state) => {
        state.loading = false
      })

      // ── syncBoard ──
      .addCase(syncBoard.pending, (state) => {
        state.syncing = true
        state.syncError = null
      })
      .addCase(syncBoard.fulfilled, (state) => {
        state.syncing = false
        state.syncVersion += 1
      })
      .addCase(syncBoard.rejected, (state, action) => {
        state.syncing = false
        state.syncError = action.error.message ?? 'Sync failed.'
      })

      // ── addBoard ──
      .addCase(addBoard.fulfilled, (state, action) => {
        state.items.push(action.payload)
        state.selectedBoardId = action.payload.boardId
      })

      // ── deleteBoard ──
      .addCase(deleteBoard.fulfilled, (state, action) => {
        const deletedId = action.payload
        state.items = state.items.filter((b) => b.boardId !== deletedId)
        if (state.selectedBoardId === deletedId) {
          state.selectedBoardId = state.items[0]?.boardId ?? null
          if (state.selectedBoardId) api.boards.setLastSelected(state.selectedBoardId)
        }
      })

      // ── updateBoard ──
      .addCase(updateBoard.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.items.findIndex((b) => b.boardId === updated.boardId)
        if (idx !== -1) state.items[idx] = updated
      })

      // ── setEpicBoard ──
      .addCase(setEpicBoard.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.items.findIndex((b) => b.boardId === updated.boardId)
        if (idx !== -1) state.items[idx] = updated
      })

      // ── setMyMember ──
      .addCase(setMyMember.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.items.findIndex((b) => b.boardId === updated.boardId)
        if (idx !== -1) state.items[idx] = updated
      })
  }
})

export const { boardSelected, syncErrorDismissed } = boardsSlice.actions
export default boardsSlice.reducer

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectBoards = (state: { boards: BoardsState }): BoardConfig[] => state.boards.items
export const selectSelectedBoardId = (state: { boards: BoardsState }): string | null =>
  state.boards.selectedBoardId
export const selectSelectedBoard = (state: { boards: BoardsState }): BoardConfig | null =>
  state.boards.items.find((b) => b.boardId === state.boards.selectedBoardId) ?? null
export const selectBoardsLoading = (state: { boards: BoardsState }): boolean => state.boards.loading
export const selectSyncing = (state: { boards: BoardsState }): boolean => state.boards.syncing
export const selectSyncVersion = (state: { boards: BoardsState }): number =>
  state.boards.syncVersion
export const selectSyncError = (state: { boards: BoardsState }): string | null =>
  state.boards.syncError
