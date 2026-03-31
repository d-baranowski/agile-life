jest.mock('../../api/useApi', () => ({
  api: {
    settings: {
      getDbPath: jest.fn(),
      setDbPath: jest.fn()
    },
    logs: {
      getPath: jest.fn(),
      setPath: jest.fn()
    },
    trello: {
      getBoardMembers: jest.fn(),
      previewArchiveDoneCards: jest.fn(),
      archiveDoneCards: jest.fn(),
      getDoneColumnDebug: jest.fn()
    }
  }
}))

import { configureStore } from '@reduxjs/toolkit'
import reducer, {
  fetchSettingsData,
  chooseDbPath,
  chooseLogPath,
  previewArchiveDoneCards,
  archiveDoneCards,
  fetchDoneColumnDebug,
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
} from '../settingsSlice'
import { api } from '../../api/useApi'

const initialState = () => reducer(undefined, { type: '@@INIT' })

describe('settingsSlice', () => {
  describe('initial state', () => {
    it('has expected defaults', () => {
      const state = initialState()
      expect(state.boardName).toBe('')
      expect(state.doneListNames).toBe('')
      expect(state.saving).toBe(false)
      expect(state.deleting).toBe(false)
      expect(state.confirmDelete).toBe(false)
      expect(state.error).toBeNull()
      expect(state.success).toBeNull()
      expect(state.dbPathInfo).toBeNull()
      expect(state.dbPathChanging).toBe(false)
      expect(state.dbPathError).toBeNull()
      expect(state.dbPathChanged).toBe(false)
      expect(state.logPathInfo).toBeNull()
      expect(state.soundEnabled).toBe(true)
      expect(state.soundVolume).toBe(0.5)
      expect(state.archiveWeeks).toBe(4)
      expect(state.previewing).toBe(false)
      expect(state.previewCards).toBeNull()
      expect(state.debugOpen).toBe(false)
      expect(state.storyPointsRules).toEqual([])
      expect(state.storyPointsSaving).toBe(false)
    })
  })

  describe('reducers', () => {
    describe('settingsInitialised', () => {
      it('sets all initial fields at once', () => {
        const state = reducer(
          initialState(),
          settingsInitialised({
            boardName: 'My Board',
            doneListNames: 'Done,Archived',
            soundEnabled: false,
            soundVolume: 0.8,
            storyPointsRules: [{ labelName: 'S', points: 1 }]
          })
        )
        expect(state.boardName).toBe('My Board')
        expect(state.doneListNames).toBe('Done,Archived')
        expect(state.soundEnabled).toBe(false)
        expect(state.soundVolume).toBe(0.8)
        expect(state.storyPointsRules).toEqual([{ labelName: 'S', points: 1 }])
        expect(state.error).toBeNull()
        expect(state.success).toBeNull()
        expect(state.confirmDelete).toBe(false)
      })
    })

    it('boardNameChanged sets boardName', () => {
      const state = reducer(initialState(), boardNameChanged('New Name'))
      expect(state.boardName).toBe('New Name')
    })

    it('doneListNamesChanged sets doneListNames', () => {
      const state = reducer(initialState(), doneListNamesChanged('Done,Complete'))
      expect(state.doneListNames).toBe('Done,Complete')
    })

    it('savingStarted sets saving and clears messages', () => {
      let state = initialState()
      state = { ...state, error: 'old', success: 'old' }
      state = reducer(state, savingStarted())
      expect(state.saving).toBe(true)
      expect(state.error).toBeNull()
      expect(state.success).toBeNull()
    })

    it('savingFinished sets error and success', () => {
      let state = reducer(initialState(), savingStarted())
      state = reducer(state, savingFinished({ success: 'Saved!' }))
      expect(state.saving).toBe(false)
      expect(state.success).toBe('Saved!')
      expect(state.error).toBeNull()
    })

    it('savingFinished sets error when provided', () => {
      const state = reducer(initialState(), savingFinished({ error: 'Oops' }))
      expect(state.saving).toBe(false)
      expect(state.error).toBe('Oops')
    })

    it('deletingStarted sets deleting', () => {
      const state = reducer(initialState(), deletingStarted())
      expect(state.deleting).toBe(true)
    })

    it('deletingFinished clears deleting', () => {
      let state = reducer(initialState(), deletingStarted())
      state = reducer(state, deletingFinished())
      expect(state.deleting).toBe(false)
    })

    it('confirmDeleteToggled sets confirmDelete', () => {
      const state = reducer(initialState(), confirmDeleteToggled(true))
      expect(state.confirmDelete).toBe(true)
    })

    it('epicBoardSavingStarted sets saving and clears error', () => {
      const state = reducer(initialState(), epicBoardSavingStarted())
      expect(state.epicBoardSaving).toBe(true)
      expect(state.epicBoardError).toBeNull()
    })

    it('epicBoardSavingFinished sets error', () => {
      let state = reducer(initialState(), epicBoardSavingStarted())
      state = reducer(state, epicBoardSavingFinished('Epic error'))
      expect(state.epicBoardSaving).toBe(false)
      expect(state.epicBoardError).toBe('Epic error')
    })

    it('epicBoardSavingFinished clears error on success', () => {
      const state = reducer(initialState(), epicBoardSavingFinished(null))
      expect(state.epicBoardSaving).toBe(false)
      expect(state.epicBoardError).toBeNull()
    })

    it('myMemberSavingStarted sets saving', () => {
      const state = reducer(initialState(), myMemberSavingStarted())
      expect(state.myMemberSaving).toBe(true)
      expect(state.myMemberError).toBeNull()
    })

    it('myMemberSavingFinished sets error', () => {
      const state = reducer(initialState(), myMemberSavingFinished('fail'))
      expect(state.myMemberSaving).toBe(false)
      expect(state.myMemberError).toBe('fail')
    })

    it('soundEnabledChanged sets sound flag', () => {
      const state = reducer(initialState(), soundEnabledChanged(false))
      expect(state.soundEnabled).toBe(false)
    })

    it('soundVolumeChanged sets volume', () => {
      const state = reducer(initialState(), soundVolumeChanged(0.9))
      expect(state.soundVolume).toBe(0.9)
    })

    it('archiveWeeksChanged sets weeks', () => {
      const state = reducer(initialState(), archiveWeeksChanged(8))
      expect(state.archiveWeeks).toBe(8)
    })

    it('previewCardsDismissed clears previewCards', () => {
      let state = initialState()
      state = {
        ...state,
        previewCards: [
          {
            id: '1',
            name: 'Card',
            listId: 'l1',
            listName: 'Done',
            enteredDoneAt: '2024-01-01T00:00:00Z'
          }
        ]
      }
      state = reducer(state, previewCardsDismissed())
      expect(state.previewCards).toBeNull()
    })

    it('debugToggled toggles debugOpen', () => {
      let state = reducer(initialState(), debugToggled())
      expect(state.debugOpen).toBe(true)
      state = reducer(state, debugToggled())
      expect(state.debugOpen).toBe(false)
    })

    it('storyPointsRulesChanged sets rules', () => {
      const rules = [
        { labelName: 'S', points: 1 },
        { labelName: 'M', points: 3 }
      ]
      const state = reducer(initialState(), storyPointsRulesChanged(rules))
      expect(state.storyPointsRules).toEqual(rules)
    })

    it('storyPointsSavingStarted sets saving and clears messages', () => {
      const state = reducer(initialState(), storyPointsSavingStarted())
      expect(state.storyPointsSaving).toBe(true)
      expect(state.storyPointsError).toBeNull()
      expect(state.storyPointsSuccess).toBeNull()
    })

    it('storyPointsSavingFinished sets messages', () => {
      const state = reducer(initialState(), storyPointsSavingFinished({ success: 'Saved!' }))
      expect(state.storyPointsSaving).toBe(false)
      expect(state.storyPointsSuccess).toBe('Saved!')
      expect(state.storyPointsError).toBeNull()
    })

    it('storyPointsSavingFinished sets error', () => {
      const state = reducer(initialState(), storyPointsSavingFinished({ error: 'Bad' }))
      expect(state.storyPointsError).toBe('Bad')
    })

    it('storyPointsSuccessDismissed clears success', () => {
      let state = reducer(initialState(), storyPointsSavingFinished({ success: 'OK' }))
      state = reducer(state, storyPointsSuccessDismissed())
      expect(state.storyPointsSuccess).toBeNull()
    })
  })

  describe('extraReducers', () => {
    describe('fetchSettingsData', () => {
      it('fulfilled sets dbPathInfo, logPathInfo, boardMembers', () => {
        const payload = {
          dbPathInfo: { currentPath: '/db', defaultPath: '/db', isCustom: false },
          logPathInfo: { currentPath: '/log', defaultPath: '/log', isCustom: false },
          boardMembers: [{ id: 'm1', fullName: 'Alice', username: 'alice' }]
        }
        const state = reducer(initialState(), {
          type: 'settings/fetchSettingsData/fulfilled',
          payload
        })
        expect(state.dbPathInfo).toEqual(payload.dbPathInfo)
        expect(state.logPathInfo).toEqual(payload.logPathInfo)
        expect(state.boardMembers).toEqual(payload.boardMembers)
      })
    })

    describe('chooseDbPath', () => {
      it('pending sets changing and clears error', () => {
        const state = reducer(initialState(), { type: 'settings/chooseDbPath/pending' })
        expect(state.dbPathChanging).toBe(true)
        expect(state.dbPathError).toBeNull()
      })

      it('fulfilled with custom path sets dbPathChanged', () => {
        const pathInfo = { currentPath: '/custom', defaultPath: '/default', isCustom: true }
        const state = reducer(initialState(), {
          type: 'settings/chooseDbPath/fulfilled',
          payload: pathInfo
        })
        expect(state.dbPathChanging).toBe(false)
        expect(state.dbPathInfo).toEqual(pathInfo)
        expect(state.dbPathChanged).toBe(true)
      })

      it('fulfilled with default path does not set dbPathChanged', () => {
        const pathInfo = { currentPath: '/default', defaultPath: '/default', isCustom: false }
        const state = reducer(initialState(), {
          type: 'settings/chooseDbPath/fulfilled',
          payload: pathInfo
        })
        expect(state.dbPathChanged).toBe(false)
      })

      it('rejected sets error', () => {
        const state = reducer(initialState(), {
          type: 'settings/chooseDbPath/rejected',
          error: { message: 'Disk full' }
        })
        expect(state.dbPathChanging).toBe(false)
        expect(state.dbPathError).toBe('Disk full')
      })
    })

    describe('chooseLogPath', () => {
      it('pending sets changing', () => {
        const state = reducer(initialState(), { type: 'settings/chooseLogPath/pending' })
        expect(state.logPathChanging).toBe(true)
        expect(state.logPathError).toBeNull()
      })

      it('fulfilled sets logPathInfo', () => {
        const pathInfo = { currentPath: '/log', defaultPath: '/log', isCustom: false }
        const state = reducer(initialState(), {
          type: 'settings/chooseLogPath/fulfilled',
          payload: pathInfo
        })
        expect(state.logPathChanging).toBe(false)
        expect(state.logPathInfo).toEqual(pathInfo)
      })

      it('rejected sets error', () => {
        const state = reducer(initialState(), {
          type: 'settings/chooseLogPath/rejected',
          error: { message: 'Log error' }
        })
        expect(state.logPathChanging).toBe(false)
        expect(state.logPathError).toBe('Log error')
      })
    })

    describe('previewArchiveDoneCards', () => {
      it('pending clears everything', () => {
        let state = initialState()
        state = {
          ...state,
          previewError: 'old',
          archiveResult: { archivedCount: 1, skippedCount: 0, syncedAt: '2024-01-01' },
          archiveError: 'old'
        }
        state = reducer(state, { type: 'settings/previewArchiveDoneCards/pending' })
        expect(state.previewing).toBe(true)
        expect(state.previewError).toBeNull()
        expect(state.previewCards).toBeNull()
        expect(state.archiveResult).toBeNull()
        expect(state.archiveError).toBeNull()
      })

      it('fulfilled sets previewCards', () => {
        const cards = [
          {
            id: '1',
            name: 'Card',
            listId: 'l1',
            listName: 'Done',
            enteredDoneAt: '2024-01-01T00:00:00Z'
          }
        ]
        const state = reducer(initialState(), {
          type: 'settings/previewArchiveDoneCards/fulfilled',
          payload: cards
        })
        expect(state.previewing).toBe(false)
        expect(state.previewCards).toEqual(cards)
      })

      it('rejected sets error', () => {
        const state = reducer(initialState(), {
          type: 'settings/previewArchiveDoneCards/rejected',
          error: { message: 'Preview failed.' }
        })
        expect(state.previewing).toBe(false)
        expect(state.previewError).toBe('Preview failed.')
      })
    })

    describe('archiveDoneCards', () => {
      it('pending sets archiving', () => {
        const state = reducer(initialState(), { type: 'settings/archiveDoneCards/pending' })
        expect(state.archiving).toBe(true)
        expect(state.archiveError).toBeNull()
        expect(state.archiveResult).toBeNull()
      })

      it('fulfilled sets result and clears previewCards and debugCards', () => {
        let state = initialState()
        state = {
          ...state,
          previewCards: [
            {
              id: '1',
              name: 'Card',
              listId: 'l1',
              listName: 'Done',
              enteredDoneAt: '2024-01-01T00:00:00Z'
            }
          ],
          debugCards: []
        }
        const result = { archivedCount: 5, skippedCount: 1, syncedAt: '2024-01-15' }
        state = reducer(state, {
          type: 'settings/archiveDoneCards/fulfilled',
          payload: result
        })
        expect(state.archiving).toBe(false)
        expect(state.archiveResult).toEqual(result)
        expect(state.previewCards).toBeNull()
        expect(state.debugCards).toBeNull()
      })

      it('rejected sets error', () => {
        const state = reducer(initialState(), {
          type: 'settings/archiveDoneCards/rejected',
          error: { message: 'Archive failed.' }
        })
        expect(state.archiving).toBe(false)
        expect(state.archiveError).toBe('Archive failed.')
      })
    })

    describe('fetchDoneColumnDebug', () => {
      it('pending sets loading', () => {
        const state = reducer(initialState(), { type: 'settings/fetchDoneColumnDebug/pending' })
        expect(state.debugLoading).toBe(true)
        expect(state.debugError).toBeNull()
      })

      it('fulfilled sets debugCards', () => {
        const cards = [
          {
            id: '1',
            name: 'Card',
            listId: 'l1',
            listName: 'Done',
            enteredDoneAt: '2024-01-01',
            dateLastActivity: '2024-01-01',
            cardSyncedAt: '2024-01-01',
            hasActionEntry: 1 as const
          }
        ]
        const state = reducer(initialState(), {
          type: 'settings/fetchDoneColumnDebug/fulfilled',
          payload: cards
        })
        expect(state.debugLoading).toBe(false)
        expect(state.debugCards).toEqual(cards)
      })

      it('rejected sets error', () => {
        const state = reducer(initialState(), {
          type: 'settings/fetchDoneColumnDebug/rejected',
          error: { message: 'Debug failed.' }
        })
        expect(state.debugLoading).toBe(false)
        expect(state.debugError).toBe('Debug failed.')
      })
    })
  })
})

// ── Thunk dispatch tests ───────────────────────────────────────────────────────

const makeStore = () => configureStore({ reducer: { settings: reducer } })

describe('async thunks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchSettingsData', () => {
    it('sets dbPathInfo, logPathInfo, boardMembers when all calls succeed', async () => {
      const dbPathInfo = { currentPath: '/db', defaultPath: '/db', isCustom: false }
      const logPathInfo = { currentPath: '/log', defaultPath: '/log', isCustom: false }
      const member = { id: 'm1', fullName: 'Alice', username: 'alice' }
      ;(api.settings.getDbPath as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: dbPathInfo
      })
      ;(api.logs.getPath as jest.Mock).mockResolvedValueOnce({ success: true, data: logPathInfo })
      ;(api.trello.getBoardMembers as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [member]
      })
      const store = makeStore()
      await store.dispatch(fetchSettingsData('board-1'))
      const state = store.getState().settings
      expect(state.dbPathInfo).toEqual(dbPathInfo)
      expect(state.logPathInfo).toEqual(logPathInfo)
      expect(state.boardMembers).toHaveLength(1)
    })

    it('uses null when API calls fail', async () => {
      ;(api.settings.getDbPath as jest.Mock).mockResolvedValueOnce({ success: false })
      ;(api.logs.getPath as jest.Mock).mockResolvedValueOnce({ success: false })
      ;(api.trello.getBoardMembers as jest.Mock).mockResolvedValueOnce({ success: false })
      const store = makeStore()
      await store.dispatch(fetchSettingsData('board-1'))
      const state = store.getState().settings
      expect(state.dbPathInfo).toBeNull()
      expect(state.logPathInfo).toBeNull()
      expect(state.boardMembers).toEqual([])
    })
  })

  describe('chooseDbPath', () => {
    it('sets dbPathInfo on success', async () => {
      const pathInfo = { currentPath: '/custom', defaultPath: '/default', isCustom: true }
      ;(api.settings.setDbPath as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: pathInfo
      })
      const store = makeStore()
      await store.dispatch(chooseDbPath(false))
      expect(store.getState().settings.dbPathInfo).toEqual(pathInfo)
      expect(store.getState().settings.dbPathChanged).toBe(true)
    })

    it('throws when setDbPath fails', async () => {
      ;(api.settings.setDbPath as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Disk full'
      })
      const store = makeStore()
      const result = await store.dispatch(chooseDbPath(false))
      expect(result.type).toBe('settings/chooseDbPath/rejected')
      expect(store.getState().settings.dbPathError).toBe('Disk full')
    })
  })

  describe('chooseLogPath', () => {
    it('sets logPathInfo on success', async () => {
      const pathInfo = { currentPath: '/log', defaultPath: '/log', isCustom: false }
      ;(api.logs.setPath as jest.Mock).mockResolvedValueOnce({ success: true, data: pathInfo })
      const store = makeStore()
      await store.dispatch(chooseLogPath(false))
      expect(store.getState().settings.logPathInfo).toEqual(pathInfo)
    })

    it('throws when setPath fails', async () => {
      ;(api.logs.setPath as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Log error'
      })
      const store = makeStore()
      const result = await store.dispatch(chooseLogPath(false))
      expect(result.type).toBe('settings/chooseLogPath/rejected')
      expect(store.getState().settings.logPathError).toBe('Log error')
    })
  })

  describe('previewArchiveDoneCards', () => {
    it('sets previewCards on success', async () => {
      const cards = [
        { id: '1', name: 'Card', listId: 'l1', listName: 'Done', enteredDoneAt: '2024-01-01' }
      ]
      ;(api.trello.previewArchiveDoneCards as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: cards
      })
      const store = makeStore()
      await store.dispatch(previewArchiveDoneCards({ boardId: 'b1', weeks: 4 }))
      expect(store.getState().settings.previewCards).toHaveLength(1)
    })

    it('throws when preview fails', async () => {
      ;(api.trello.previewArchiveDoneCards as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Preview failed.'
      })
      const store = makeStore()
      const result = await store.dispatch(previewArchiveDoneCards({ boardId: 'b1', weeks: 4 }))
      expect(result.type).toBe('settings/previewArchiveDoneCards/rejected')
      expect(store.getState().settings.previewError).toBe('Preview failed.')
    })
  })

  describe('archiveDoneCards', () => {
    it('sets archiveResult on success', async () => {
      const archiveResult = { archivedCount: 5, skippedCount: 1, syncedAt: '2024-01-15' }
      ;(api.trello.archiveDoneCards as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: archiveResult
      })
      const store = makeStore()
      await store.dispatch(archiveDoneCards({ boardId: 'b1', weeks: 4 }))
      expect(store.getState().settings.archiveResult).toEqual(archiveResult)
    })

    it('throws when archive fails', async () => {
      ;(api.trello.archiveDoneCards as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Archive failed.'
      })
      const store = makeStore()
      const result = await store.dispatch(archiveDoneCards({ boardId: 'b1', weeks: 4 }))
      expect(result.type).toBe('settings/archiveDoneCards/rejected')
      expect(store.getState().settings.archiveError).toBe('Archive failed.')
    })
  })

  describe('fetchDoneColumnDebug', () => {
    it('sets debugCards on success', async () => {
      const cards = [
        {
          id: '1',
          name: 'Card',
          listId: 'l1',
          listName: 'Done',
          enteredDoneAt: '2024-01-01',
          dateLastActivity: '2024-01-01',
          cardSyncedAt: '2024-01-01',
          hasActionEntry: 1 as const
        }
      ]
      ;(api.trello.getDoneColumnDebug as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: cards
      })
      const store = makeStore()
      await store.dispatch(fetchDoneColumnDebug('board-1'))
      expect(store.getState().settings.debugCards).toHaveLength(1)
    })

    it('throws when debug fetch fails', async () => {
      ;(api.trello.getDoneColumnDebug as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Debug failed.'
      })
      const store = makeStore()
      const result = await store.dispatch(fetchDoneColumnDebug('board-1'))
      expect(result.type).toBe('settings/fetchDoneColumnDebug/rejected')
      expect(store.getState().settings.debugError).toBe('Debug failed.')
    })
  })
})
