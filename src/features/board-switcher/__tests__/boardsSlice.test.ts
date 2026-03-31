/**
 * boardsSlice tests.
 *
 * The `boardSelected` reducer and `deleteBoard.fulfilled` extraReducer call
 * `api.boards.setLastSelected()` as a fire-and-forget side effect. We mock
 * the module to avoid IPC calls and to assert they are invoked correctly.
 */
jest.mock('../../api/useApi', () => ({
  api: {
    boards: {
      setLastSelected: jest.fn(),
      getAll: jest.fn(),
      getLastSelected: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      setEpicBoard: jest.fn(),
      setMyMember: jest.fn()
    },
    trello: {
      sync: jest.fn()
    }
  }
}))

import { configureStore } from '@reduxjs/toolkit'
import reducer, {
  fetchBoards,
  syncBoard,
  addBoard,
  deleteBoard,
  updateBoard,
  setEpicBoard,
  setMyMember,
  boardSelected,
  syncErrorDismissed,
  selectBoards,
  selectSelectedBoardId,
  selectSelectedBoard,
  selectBoardsLoading,
  selectSyncing,
  selectSyncVersion,
  selectSyncError
} from '../boardsSlice'
import { api } from '../../api/useApi'
import type { BoardConfig } from '../../../lib/board.types'

const mockSetLastSelected = api.boards.setLastSelected as jest.Mock

const initialState = () => reducer(undefined, { type: '@@INIT' })

const makeBoardConfig = (overrides: Partial<BoardConfig> = {}): BoardConfig => ({
  id: 1,
  boardId: 'board-1',
  boardName: 'Test Board',
  apiKey: 'key',
  apiToken: 'token',
  projectCode: 'TB',
  nextTicketNumber: 1,
  doneListNames: ['Done'],
  storyPointsConfig: [],
  lastSyncedAt: null,
  epicBoardId: null,
  myMemberId: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
})

beforeEach(() => {
  mockSetLastSelected.mockClear()
})

describe('boardsSlice', () => {
  describe('initial state', () => {
    it('has expected defaults', () => {
      const state = initialState()
      expect(state.items).toEqual([])
      expect(state.selectedBoardId).toBeNull()
      expect(state.loading).toBe(true)
      expect(state.syncing).toBe(false)
      expect(state.syncVersion).toBe(0)
      expect(state.syncError).toBeNull()
    })
  })

  describe('reducers', () => {
    it('boardSelected sets selectedBoardId and calls api.boards.setLastSelected', () => {
      const state = reducer(initialState(), boardSelected('board-1'))
      expect(state.selectedBoardId).toBe('board-1')
      expect(mockSetLastSelected).toHaveBeenCalledWith('board-1')
    })

    it('syncErrorDismissed clears syncError', () => {
      let state = initialState()
      state = { ...state, syncError: 'Sync failed.' }
      state = reducer(state, syncErrorDismissed())
      expect(state.syncError).toBeNull()
    })
  })

  describe('extraReducers', () => {
    describe('fetchBoards', () => {
      it('fulfilled sets items and auto-selects first board', () => {
        const boards = [makeBoardConfig({ boardId: 'b1' }), makeBoardConfig({ boardId: 'b2' })]
        const state = reducer(initialState(), {
          type: 'boards/fetchBoards/fulfilled',
          payload: { boards, lastSelectedId: null }
        })
        expect(state.items).toEqual(boards)
        expect(state.selectedBoardId).toBe('b1')
        expect(state.loading).toBe(false)
      })

      it('fulfilled restores lastSelectedId when valid', () => {
        const boards = [makeBoardConfig({ boardId: 'b1' }), makeBoardConfig({ boardId: 'b2' })]
        const state = reducer(initialState(), {
          type: 'boards/fetchBoards/fulfilled',
          payload: { boards, lastSelectedId: 'b2' }
        })
        expect(state.selectedBoardId).toBe('b2')
      })

      it('fulfilled falls back to first board when lastSelectedId is invalid', () => {
        const boards = [makeBoardConfig({ boardId: 'b1' })]
        const state = reducer(initialState(), {
          type: 'boards/fetchBoards/fulfilled',
          payload: { boards, lastSelectedId: 'does-not-exist' }
        })
        expect(state.selectedBoardId).toBe('b1')
      })

      it('fulfilled does not overwrite existing selectedBoardId', () => {
        let state = initialState()
        state = { ...state, selectedBoardId: 'already-set' }
        state = reducer(state, {
          type: 'boards/fetchBoards/fulfilled',
          payload: { boards: [makeBoardConfig({ boardId: 'b1' })], lastSelectedId: null }
        })
        expect(state.selectedBoardId).toBe('already-set')
      })

      it('fulfilled handles empty boards list', () => {
        const state = reducer(initialState(), {
          type: 'boards/fetchBoards/fulfilled',
          payload: { boards: [], lastSelectedId: null }
        })
        expect(state.items).toEqual([])
        expect(state.selectedBoardId).toBeNull()
        expect(state.loading).toBe(false)
      })

      it('rejected sets loading to false', () => {
        const state = reducer(initialState(), {
          type: 'boards/fetchBoards/rejected',
          error: { message: 'error' }
        })
        expect(state.loading).toBe(false)
      })
    })

    describe('syncBoard', () => {
      it('pending sets syncing and clears error', () => {
        let state = initialState()
        state = { ...state, syncError: 'old error' }
        state = reducer(state, { type: 'boards/syncBoard/pending' })
        expect(state.syncing).toBe(true)
        expect(state.syncError).toBeNull()
      })

      it('fulfilled increments syncVersion', () => {
        let state = initialState()
        state = reducer(state, { type: 'boards/syncBoard/fulfilled' })
        expect(state.syncing).toBe(false)
        expect(state.syncVersion).toBe(1)
        state = reducer(state, { type: 'boards/syncBoard/fulfilled' })
        expect(state.syncVersion).toBe(2)
      })

      it('rejected sets syncError', () => {
        const state = reducer(initialState(), {
          type: 'boards/syncBoard/rejected',
          error: { message: 'Sync failed. Please try again.' }
        })
        expect(state.syncing).toBe(false)
        expect(state.syncError).toBe('Sync failed. Please try again.')
      })

      it('rejected uses fallback message', () => {
        const state = reducer(initialState(), {
          type: 'boards/syncBoard/rejected',
          error: {}
        })
        expect(state.syncError).toBe('Sync failed.')
      })
    })

    describe('addBoard', () => {
      it('fulfilled adds board to items and selects it', () => {
        const newBoard = makeBoardConfig({ boardId: 'new-board' })
        let state = initialState()
        state = {
          ...state,
          items: [makeBoardConfig({ boardId: 'existing' })],
          selectedBoardId: 'existing'
        }
        state = reducer(state, {
          type: 'boards/addBoard/fulfilled',
          payload: newBoard
        })
        expect(state.items).toHaveLength(2)
        expect(state.items[1].boardId).toBe('new-board')
        expect(state.selectedBoardId).toBe('new-board')
      })
    })

    describe('deleteBoard', () => {
      it('fulfilled removes board and falls back to first remaining', () => {
        const b1 = makeBoardConfig({ boardId: 'b1' })
        const b2 = makeBoardConfig({ boardId: 'b2' })
        let state = initialState()
        state = { ...state, items: [b1, b2], selectedBoardId: 'b1' }
        state = reducer(state, {
          type: 'boards/deleteBoard/fulfilled',
          payload: 'b1'
        })
        expect(state.items).toHaveLength(1)
        expect(state.items[0].boardId).toBe('b2')
        expect(state.selectedBoardId).toBe('b2')
        expect(mockSetLastSelected).toHaveBeenCalledWith('b2')
      })

      it('fulfilled sets null when no boards remain', () => {
        const b1 = makeBoardConfig({ boardId: 'b1' })
        let state = initialState()
        state = { ...state, items: [b1], selectedBoardId: 'b1' }
        state = reducer(state, {
          type: 'boards/deleteBoard/fulfilled',
          payload: 'b1'
        })
        expect(state.items).toEqual([])
        expect(state.selectedBoardId).toBeNull()
      })

      it('fulfilled does not change selection when deleting non-selected board', () => {
        const b1 = makeBoardConfig({ boardId: 'b1' })
        const b2 = makeBoardConfig({ boardId: 'b2' })
        let state = initialState()
        state = { ...state, items: [b1, b2], selectedBoardId: 'b1' }
        state = reducer(state, {
          type: 'boards/deleteBoard/fulfilled',
          payload: 'b2'
        })
        expect(state.items).toHaveLength(1)
        expect(state.selectedBoardId).toBe('b1')
        expect(mockSetLastSelected).not.toHaveBeenCalled()
      })
    })

    describe('updateBoard', () => {
      it('fulfilled replaces the board in items', () => {
        const original = makeBoardConfig({ boardId: 'b1', boardName: 'Old' })
        const updated = makeBoardConfig({ boardId: 'b1', boardName: 'New' })
        let state = initialState()
        state = { ...state, items: [original] }
        state = reducer(state, {
          type: 'boards/updateBoard/fulfilled',
          payload: updated
        })
        expect(state.items[0].boardName).toBe('New')
      })

      it('fulfilled is a no-op when boardId not found', () => {
        let state = initialState()
        state = { ...state, items: [makeBoardConfig({ boardId: 'b1' })] }
        state = reducer(state, {
          type: 'boards/updateBoard/fulfilled',
          payload: makeBoardConfig({ boardId: 'unknown' })
        })
        expect(state.items).toHaveLength(1)
        expect(state.items[0].boardId).toBe('b1')
      })
    })

    describe('setEpicBoard', () => {
      it('fulfilled replaces the board in items', () => {
        const original = makeBoardConfig({ boardId: 'b1', epicBoardId: null })
        const updated = makeBoardConfig({ boardId: 'b1', epicBoardId: 'epic-1' })
        let state = initialState()
        state = { ...state, items: [original] }
        state = reducer(state, {
          type: 'boards/setEpicBoard/fulfilled',
          payload: updated
        })
        expect(state.items[0].epicBoardId).toBe('epic-1')
      })
    })

    describe('setMyMember', () => {
      it('fulfilled replaces the board in items', () => {
        const original = makeBoardConfig({ boardId: 'b1', myMemberId: null })
        const updated = makeBoardConfig({ boardId: 'b1', myMemberId: 'member-1' })
        let state = initialState()
        state = { ...state, items: [original] }
        state = reducer(state, {
          type: 'boards/setMyMember/fulfilled',
          payload: updated
        })
        expect(state.items[0].myMemberId).toBe('member-1')
      })
    })
  })

  describe('selectors', () => {
    const boards = [
      makeBoardConfig({ boardId: 'b1', boardName: 'First' }),
      makeBoardConfig({ boardId: 'b2', boardName: 'Second' })
    ]
    const makeRoot = (overrides = {}) => ({
      boards: { ...initialState(), items: boards, selectedBoardId: 'b1', ...overrides }
    })

    it('selectBoards returns items', () => {
      expect(selectBoards(makeRoot())).toEqual(boards)
    })

    it('selectSelectedBoardId returns the selected id', () => {
      expect(selectSelectedBoardId(makeRoot())).toBe('b1')
    })

    it('selectSelectedBoard returns the matching board', () => {
      expect(selectSelectedBoard(makeRoot())?.boardName).toBe('First')
    })

    it('selectSelectedBoard returns null when no match', () => {
      expect(selectSelectedBoard(makeRoot({ selectedBoardId: 'unknown' }))).toBeNull()
    })

    it('selectBoardsLoading returns loading', () => {
      expect(selectBoardsLoading(makeRoot({ loading: true }))).toBe(true)
    })

    it('selectSyncing returns syncing', () => {
      expect(selectSyncing(makeRoot({ syncing: true }))).toBe(true)
    })

    it('selectSyncVersion returns syncVersion', () => {
      expect(selectSyncVersion(makeRoot({ syncVersion: 5 }))).toBe(5)
    })

    it('selectSyncError returns syncError', () => {
      expect(selectSyncError(makeRoot({ syncError: 'oops' }))).toBe('oops')
    })
  })
})

// ── Thunk dispatch tests ───────────────────────────────────────────────────────

const makeStore = () => configureStore({ reducer: { boards: reducer } })

describe('async thunks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchBoards', () => {
    it('sets items and selects first board when both calls succeed', async () => {
      const board = makeBoardConfig({ boardId: 'b1' })
      ;(api.boards.getAll as jest.Mock).mockResolvedValueOnce({ success: true, data: [board] })
      ;(api.boards.getLastSelected as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: null
      })
      const store = makeStore()
      await store.dispatch(fetchBoards())
      const state = store.getState().boards
      expect(state.items).toHaveLength(1)
      expect(state.selectedBoardId).toBe('b1')
      expect(state.loading).toBe(false)
    })

    it('uses empty arrays when getAll fails', async () => {
      ;(api.boards.getAll as jest.Mock).mockResolvedValueOnce({ success: false })
      ;(api.boards.getLastSelected as jest.Mock).mockResolvedValueOnce({ success: false })
      const store = makeStore()
      await store.dispatch(fetchBoards())
      expect(store.getState().boards.items).toEqual([])
    })
  })

  describe('syncBoard', () => {
    it('increments syncVersion on success', async () => {
      ;(api.trello.sync as jest.Mock).mockResolvedValueOnce({ success: true, data: {} })
      ;(api.boards.getAll as jest.Mock).mockResolvedValueOnce({ success: true, data: [] })
      ;(api.boards.getLastSelected as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: null
      })
      const store = makeStore()
      await store.dispatch(syncBoard('board-1'))
      expect(store.getState().boards.syncVersion).toBe(1)
    })

    it('rejects when sync fails', async () => {
      ;(api.trello.sync as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Sync failed. Please try again.'
      })
      const store = makeStore()
      const result = await store.dispatch(syncBoard('board-1'))
      expect(result.type).toBe('boards/syncBoard/rejected')
      expect(store.getState().boards.syncError).toBe('Sync failed. Please try again.')
    })
  })

  describe('addBoard', () => {
    it('adds board and selects it on success', async () => {
      const newBoard = makeBoardConfig({ boardId: 'new-board' })
      ;(api.boards.add as jest.Mock).mockResolvedValueOnce({ success: true, data: newBoard })
      ;(api.boards.setLastSelected as jest.Mock).mockResolvedValueOnce({ success: true })
      const store = makeStore()
      await store.dispatch(
        addBoard({
          boardId: 'new-board',
          boardName: 'New',
          apiKey: 'k',
          apiToken: 't',
          projectCode: 'NB',
          nextTicketNumber: 1,
          storyPointsConfig: [],
          myMemberId: null,
          doneListNames: ['Done']
        })
      )
      const state = store.getState().boards
      expect(state.items).toHaveLength(1)
      expect(state.selectedBoardId).toBe('new-board')
    })

    it('rejects when add fails', async () => {
      ;(api.boards.add as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to add board.'
      })
      const store = makeStore()
      const result = await store.dispatch(
        addBoard({
          boardId: 'x',
          boardName: 'X',
          apiKey: 'k',
          apiToken: 't',
          projectCode: 'XX',
          nextTicketNumber: 1,
          storyPointsConfig: [],
          myMemberId: null,
          doneListNames: ['Done']
        })
      )
      expect(result.type).toBe('boards/addBoard/rejected')
    })
  })

  describe('deleteBoard', () => {
    it('removes board on success', async () => {
      ;(api.boards.delete as jest.Mock).mockResolvedValueOnce({ success: true })
      const store = configureStore({
        reducer: { boards: reducer },
        preloadedState: {
          boards: {
            ...initialState(),
            items: [makeBoardConfig({ boardId: 'b1' })],
            selectedBoardId: 'b1'
          }
        }
      })
      await store.dispatch(deleteBoard('b1'))
      expect(store.getState().boards.items).toHaveLength(0)
    })

    it('rejects when delete fails', async () => {
      ;(api.boards.delete as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to delete board.'
      })
      const store = makeStore()
      const result = await store.dispatch(deleteBoard('b1'))
      expect(result.type).toBe('boards/deleteBoard/rejected')
    })
  })

  describe('updateBoard', () => {
    it('replaces board on success', async () => {
      const updated = makeBoardConfig({ boardId: 'b1', boardName: 'Updated' })
      ;(api.boards.update as jest.Mock).mockResolvedValueOnce({ success: true, data: updated })
      const store = configureStore({
        reducer: { boards: reducer },
        preloadedState: {
          boards: {
            ...initialState(),
            items: [makeBoardConfig({ boardId: 'b1', boardName: 'Original' })]
          }
        }
      })
      await store.dispatch(updateBoard({ boardId: 'b1', updates: { boardName: 'Updated' } }))
      expect(store.getState().boards.items[0].boardName).toBe('Updated')
    })

    it('rejects when update fails', async () => {
      ;(api.boards.update as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to save settings.'
      })
      const store = makeStore()
      const result = await store.dispatch(
        updateBoard({ boardId: 'b1', updates: { boardName: 'X' } })
      )
      expect(result.type).toBe('boards/updateBoard/rejected')
    })
  })

  describe('setEpicBoard', () => {
    it('updates board with epicBoardId on success', async () => {
      const updated = makeBoardConfig({ boardId: 'b1', epicBoardId: 'epic-1' })
      ;(api.boards.setEpicBoard as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: updated
      })
      const store = configureStore({
        reducer: { boards: reducer },
        preloadedState: {
          boards: {
            ...initialState(),
            items: [makeBoardConfig({ boardId: 'b1', epicBoardId: null })]
          }
        }
      })
      await store.dispatch(setEpicBoard({ storyBoardId: 'b1', epicBoardId: 'epic-1' }))
      expect(store.getState().boards.items[0].epicBoardId).toBe('epic-1')
    })

    it('rejects when setEpicBoard fails', async () => {
      ;(api.boards.setEpicBoard as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to update epic board.'
      })
      const store = makeStore()
      const result = await store.dispatch(setEpicBoard({ storyBoardId: 'b1', epicBoardId: null }))
      expect(result.type).toBe('boards/setEpicBoard/rejected')
    })
  })

  describe('setMyMember', () => {
    it('updates board with myMemberId on success', async () => {
      const updated = makeBoardConfig({ boardId: 'b1', myMemberId: 'member-1' })
      ;(api.boards.setMyMember as jest.Mock).mockResolvedValueOnce({ success: true, data: updated })
      const store = configureStore({
        reducer: { boards: reducer },
        preloadedState: {
          boards: {
            ...initialState(),
            items: [makeBoardConfig({ boardId: 'b1', myMemberId: null })]
          }
        }
      })
      await store.dispatch(setMyMember({ boardId: 'b1', myMemberId: 'member-1' }))
      expect(store.getState().boards.items[0].myMemberId).toBe('member-1')
    })

    it('rejects when setMyMember fails', async () => {
      ;(api.boards.setMyMember as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to update identity.'
      })
      const store = makeStore()
      const result = await store.dispatch(setMyMember({ boardId: 'b1', myMemberId: null }))
      expect(result.type).toBe('boards/setMyMember/rejected')
    })
  })
})
