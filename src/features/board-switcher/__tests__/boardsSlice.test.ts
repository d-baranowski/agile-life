/**
 * boardsSlice tests.
 *
 * The `boardSelected` reducer and `deleteBoard.fulfilled` extraReducer call
 * `api.boards.setLastSelected()` as a fire-and-forget side effect. We mock
 * the module to avoid IPC calls and to assert they are invoked correctly.
 */
jest.mock('../../api/useApi', () => ({
  api: {
    boards: { setLastSelected: jest.fn() }
  }
}))

import reducer, {
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
