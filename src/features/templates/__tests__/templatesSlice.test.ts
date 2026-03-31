jest.mock('../../api/useApi', () => ({
  api: {
    templates: {
      getGroups: jest.fn(),
      getTemplates: jest.fn(),
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      deleteTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      createTemplate: jest.fn(),
      generateCards: jest.fn(),
      getBoardLabels: jest.fn()
    },
    trello: {
      getBoardData: jest.fn()
    },
    epics: {
      getCards: jest.fn()
    }
  }
}))

import { configureStore } from '@reduxjs/toolkit'
import reducer, {
  fetchTemplatePageData,
  fetchTemplates,
  createTemplateGroup,
  renameTemplateGroup,
  deleteTemplateGroup,
  deleteTemplate,
  saveTemplate,
  generateCards,
  templatesPageReset,
  groupSelected,
  groupEditStarted,
  groupEditCancelled,
  editingGroupNameChanged,
  newGroupNameChanged,
  newGroupInputToggled,
  newGroupInputClosed,
  templateFormOpened,
  templateFormClosed,
  formNameChanged,
  formTitleTemplateChanged,
  formDescTemplateChanged,
  formListIdChanged,
  formLabelToggled,
  formEpicCardIdChanged
} from '../templatesSlice'
import { api } from '../../api/useApi'

const initialState = () => reducer(undefined, { type: '@@INIT' })

const mockTemplate = {
  id: 1,
  boardId: 'b1',
  groupId: 10,
  name: 'Sprint Template',
  titleTemplate: '[{N}] {name}',
  descTemplate: 'Description for {name}',
  listId: 'list-1',
  listName: 'Backlog',
  labelIds: ['lab-1', 'lab-2'],
  epicCardId: 'epic-1',
  position: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

const mockGroup = {
  id: 10,
  boardId: 'b1',
  name: 'Sprint Group',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
}

describe('templatesSlice', () => {
  describe('initial state', () => {
    it('has expected defaults', () => {
      const state = initialState()
      expect(state.groups).toEqual([])
      expect(state.selectedGroupId).toBeNull()
      expect(state.templates).toEqual([])
      expect(state.lists).toEqual([])
      expect(state.boardLabels).toEqual([])
      expect(state.epicCards).toEqual([])
      expect(state.editingGroupId).toBeNull()
      expect(state.showTemplateForm).toBe(false)
      expect(state.editingTemplate).toBeNull()
      expect(state.formSaving).toBe(false)
      expect(state.formError).toBeNull()
      expect(state.formName).toBe('')
      expect(state.formSelectedLabelIds).toEqual([])
      expect(state.generating).toBe(false)
      expect(state.generateResult).toBeNull()
      expect(state.generateError).toBeNull()
    })
  })

  describe('reducers', () => {
    it('templatesPageReset resets entire state to initial', () => {
      let state = initialState()
      state = reducer(state, groupSelected(5))
      state = reducer(state, formNameChanged('test'))
      state = reducer(state, templatesPageReset())
      expect(state.selectedGroupId).toBeNull()
      expect(state.formName).toBe('')
    })

    it('groupSelected sets selectedGroupId and clears generate results', () => {
      let state = initialState()
      state = {
        ...state,
        generateResult: { created: 3, failed: 0, errors: [] },
        generateError: 'old error'
      }
      state = reducer(state, groupSelected(5))
      expect(state.selectedGroupId).toBe(5)
      expect(state.generateResult).toBeNull()
      expect(state.generateError).toBeNull()
    })

    it('groupSelected can set null', () => {
      let state = reducer(initialState(), groupSelected(5))
      state = reducer(state, groupSelected(null))
      expect(state.selectedGroupId).toBeNull()
    })

    it('groupEditStarted sets editing state', () => {
      const state = reducer(initialState(), groupEditStarted({ id: 10, name: 'Sprint' }))
      expect(state.editingGroupId).toBe(10)
      expect(state.editingGroupName).toBe('Sprint')
    })

    it('groupEditCancelled clears editing', () => {
      let state = reducer(initialState(), groupEditStarted({ id: 10, name: 'Sprint' }))
      state = reducer(state, groupEditCancelled())
      expect(state.editingGroupId).toBeNull()
    })

    it('editingGroupNameChanged updates name', () => {
      const state = reducer(initialState(), editingGroupNameChanged('New Name'))
      expect(state.editingGroupName).toBe('New Name')
    })

    it('newGroupNameChanged updates name', () => {
      const state = reducer(initialState(), newGroupNameChanged('New Group'))
      expect(state.newGroupName).toBe('New Group')
    })

    it('newGroupInputToggled toggles showNewGroupInput', () => {
      let state = reducer(initialState(), newGroupInputToggled())
      expect(state.showNewGroupInput).toBe(true)
      state = reducer(state, newGroupInputToggled())
      expect(state.showNewGroupInput).toBe(false)
    })

    it('newGroupInputClosed hides input and clears name', () => {
      let state = reducer(initialState(), newGroupNameChanged('test'))
      state = reducer(state, newGroupInputToggled())
      state = reducer(state, newGroupInputClosed())
      expect(state.showNewGroupInput).toBe(false)
      expect(state.newGroupName).toBe('')
    })

    describe('templateFormOpened', () => {
      it('opens form for new template with defaults', () => {
        let state = initialState()
        state = {
          ...state,
          lists: [{ id: 'list-default', name: 'Backlog', cards: [] }] as never[]
        }
        state = reducer(state, templateFormOpened(null))
        expect(state.showTemplateForm).toBe(true)
        expect(state.editingTemplate).toBeNull()
        expect(state.formName).toBe('')
        expect(state.formTitleTemplate).toBe('')
        expect(state.formDescTemplate).toBe('')
        expect(state.formListId).toBe('list-default')
        expect(state.formSelectedLabelIds).toEqual([])
        expect(state.formEpicCardId).toBe('')
        expect(state.formError).toBeNull()
      })

      it('opens form for existing template with prefilled data', () => {
        const state = reducer(initialState(), templateFormOpened(mockTemplate))
        expect(state.showTemplateForm).toBe(true)
        expect(state.editingTemplate).toEqual(mockTemplate)
        expect(state.formName).toBe('Sprint Template')
        expect(state.formTitleTemplate).toBe('[{N}] {name}')
        expect(state.formDescTemplate).toBe('Description for {name}')
        expect(state.formListId).toBe('list-1')
        expect(state.formSelectedLabelIds).toEqual(['lab-1', 'lab-2'])
        expect(state.formEpicCardId).toBe('epic-1')
      })
    })

    it('templateFormClosed closes form and clears editing', () => {
      let state = reducer(initialState(), templateFormOpened(mockTemplate))
      state = reducer(state, templateFormClosed())
      expect(state.showTemplateForm).toBe(false)
      expect(state.editingTemplate).toBeNull()
    })

    it('formNameChanged sets name', () => {
      const state = reducer(initialState(), formNameChanged('New'))
      expect(state.formName).toBe('New')
    })

    it('formTitleTemplateChanged sets title', () => {
      const state = reducer(initialState(), formTitleTemplateChanged('{N} {name}'))
      expect(state.formTitleTemplate).toBe('{N} {name}')
    })

    it('formDescTemplateChanged sets description', () => {
      const state = reducer(initialState(), formDescTemplateChanged('Desc'))
      expect(state.formDescTemplate).toBe('Desc')
    })

    it('formListIdChanged sets listId', () => {
      const state = reducer(initialState(), formListIdChanged('list-2'))
      expect(state.formListId).toBe('list-2')
    })

    describe('formLabelToggled', () => {
      it('adds label when not present', () => {
        const state = reducer(initialState(), formLabelToggled('lab-1'))
        expect(state.formSelectedLabelIds).toEqual(['lab-1'])
      })

      it('removes label when already present', () => {
        let state = reducer(initialState(), formLabelToggled('lab-1'))
        state = reducer(state, formLabelToggled('lab-2'))
        state = reducer(state, formLabelToggled('lab-1'))
        expect(state.formSelectedLabelIds).toEqual(['lab-2'])
      })
    })

    it('formEpicCardIdChanged sets epicCardId', () => {
      const state = reducer(initialState(), formEpicCardIdChanged('epic-2'))
      expect(state.formEpicCardId).toBe('epic-2')
    })
  })

  describe('extraReducers', () => {
    describe('fetchTemplatePageData', () => {
      it('fulfilled sets page data', () => {
        const payload = {
          groups: [mockGroup],
          lists: [{ id: 'l1', name: 'Backlog', cards: [] }],
          boardLabels: [{ id: 'lab-1', name: 'Bug', color: 'red', idBoard: 'b1' }],
          epicCards: [{ id: 'e1', name: 'Epic', listId: 'el1', listName: 'Epics' }]
        }
        const state = reducer(initialState(), {
          type: 'templates/fetchPageData/fulfilled',
          payload
        })
        expect(state.groups).toEqual([mockGroup])
        expect(state.lists).toEqual(payload.lists)
        expect(state.boardLabels).toEqual(payload.boardLabels)
        expect(state.epicCards).toEqual(payload.epicCards)
      })
    })

    describe('fetchTemplates', () => {
      it('fulfilled sets templates', () => {
        const state = reducer(initialState(), {
          type: 'templates/fetchTemplates/fulfilled',
          payload: [mockTemplate]
        })
        expect(state.templates).toEqual([mockTemplate])
      })
    })

    describe('createTemplateGroup', () => {
      it('fulfilled adds group, auto-selects, and clears new group input', () => {
        let state = initialState()
        state = { ...state, newGroupName: 'test', showNewGroupInput: true }
        state = reducer(state, {
          type: 'templates/createGroup/fulfilled',
          payload: mockGroup
        })
        expect(state.groups).toEqual([mockGroup])
        expect(state.selectedGroupId).toBe(10)
        expect(state.newGroupName).toBe('')
        expect(state.showNewGroupInput).toBe(false)
      })
    })

    describe('renameTemplateGroup', () => {
      it('fulfilled renames group and clears editing', () => {
        let state = initialState()
        state = {
          ...state,
          groups: [{ ...mockGroup }],
          editingGroupId: 10
        }
        state = reducer(state, {
          type: 'templates/renameGroup/fulfilled',
          payload: { groupId: 10, name: 'Renamed' }
        })
        expect(state.groups[0].name).toBe('Renamed')
        expect(state.editingGroupId).toBeNull()
      })
    })

    describe('deleteTemplateGroup', () => {
      it('fulfilled removes group and clears selection if it was selected', () => {
        let state = initialState()
        state = {
          ...state,
          groups: [mockGroup],
          selectedGroupId: 10
        }
        state = reducer(state, {
          type: 'templates/deleteGroup/fulfilled',
          payload: 10
        })
        expect(state.groups).toEqual([])
        expect(state.selectedGroupId).toBeNull()
      })

      it('fulfilled does not clear selection if different group was selected', () => {
        let state = initialState()
        state = {
          ...state,
          groups: [mockGroup, { ...mockGroup, id: 20, name: 'Other' }],
          selectedGroupId: 20
        }
        state = reducer(state, {
          type: 'templates/deleteGroup/fulfilled',
          payload: 10
        })
        expect(state.groups).toHaveLength(1)
        expect(state.selectedGroupId).toBe(20)
      })
    })

    describe('deleteTemplate', () => {
      it('fulfilled removes template from list', () => {
        let state = initialState()
        state = {
          ...state,
          templates: [mockTemplate, { ...mockTemplate, id: 2 }]
        }
        state = reducer(state, {
          type: 'templates/deleteTemplate/fulfilled',
          payload: 1
        })
        expect(state.templates).toHaveLength(1)
        expect(state.templates[0].id).toBe(2)
      })
    })

    describe('generateCards', () => {
      it('pending sets generating', () => {
        const state = reducer(initialState(), { type: 'templates/generateCards/pending' })
        expect(state.generating).toBe(true)
        expect(state.generateResult).toBeNull()
        expect(state.generateError).toBeNull()
      })

      it('fulfilled sets result', () => {
        const result = { created: 5, errors: [] }
        const state = reducer(initialState(), {
          type: 'templates/generateCards/fulfilled',
          payload: result
        })
        expect(state.generating).toBe(false)
        expect(state.generateResult).toEqual(result)
      })

      it('rejected sets error', () => {
        const state = reducer(initialState(), {
          type: 'templates/generateCards/rejected',
          error: { message: 'Generate failed.' }
        })
        expect(state.generating).toBe(false)
        expect(state.generateError).toBe('Generate failed.')
      })
    })

    describe('saveTemplate', () => {
      it('pending sets saving', () => {
        const state = reducer(initialState(), { type: 'templates/saveTemplate/pending' })
        expect(state.formSaving).toBe(true)
        expect(state.formError).toBeNull()
      })

      it('fulfilled closes form', () => {
        let state = reducer(initialState(), templateFormOpened(mockTemplate))
        state = reducer(state, { type: 'templates/saveTemplate/fulfilled' })
        expect(state.formSaving).toBe(false)
        expect(state.showTemplateForm).toBe(false)
        expect(state.editingTemplate).toBeNull()
      })

      it('rejected sets error', () => {
        const state = reducer(initialState(), {
          type: 'templates/saveTemplate/rejected',
          error: { message: 'Save failed.' }
        })
        expect(state.formSaving).toBe(false)
        expect(state.formError).toBe('Save failed.')
      })
    })
  })
})

// ── Thunk dispatch tests ───────────────────────────────────────────────────────

const makeStore = () => configureStore({ reducer: { templates: reducer } })

describe('async thunks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchTemplatePageData', () => {
    it('sets groups, lists, boardLabels, epicCards on success', async () => {
      ;(api.templates.getGroups as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [mockGroup]
      })
      ;(api.trello.getBoardData as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [{ id: 'l1', name: 'Backlog', cards: [] }]
      })
      ;(api.templates.getBoardLabels as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [{ id: 'lab-1', name: 'Bug', color: 'red', idBoard: 'b1' }]
      })
      const store = makeStore()
      await store.dispatch(fetchTemplatePageData({ boardId: 'b1', epicBoardId: null }))
      const state = store.getState().templates
      expect(state.groups).toHaveLength(1)
      expect(state.lists).toHaveLength(1)
      expect(state.boardLabels).toHaveLength(1)
      expect(state.epicCards).toEqual([])
    })

    it('fetches epicCards when epicBoardId is provided', async () => {
      ;(api.templates.getGroups as jest.Mock).mockResolvedValueOnce({ success: true, data: [] })
      ;(api.trello.getBoardData as jest.Mock).mockResolvedValueOnce({ success: true, data: [] })
      ;(api.templates.getBoardLabels as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: []
      })
      ;(api.epics.getCards as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [{ id: 'e1', name: 'Epic', listId: 'l1', listName: 'Epics' }]
      })
      const store = makeStore()
      await store.dispatch(fetchTemplatePageData({ boardId: 'b1', epicBoardId: 'epic-board' }))
      expect(store.getState().templates.epicCards).toHaveLength(1)
    })

    it('uses empty arrays when API calls fail', async () => {
      ;(api.templates.getGroups as jest.Mock).mockResolvedValueOnce({ success: false })
      ;(api.trello.getBoardData as jest.Mock).mockResolvedValueOnce({ success: false })
      ;(api.templates.getBoardLabels as jest.Mock).mockResolvedValueOnce({ success: false })
      const store = makeStore()
      await store.dispatch(fetchTemplatePageData({ boardId: 'b1', epicBoardId: null }))
      const state = store.getState().templates
      expect(state.groups).toEqual([])
      expect(state.lists).toEqual([])
    })
  })

  describe('fetchTemplates', () => {
    it('sets templates on success', async () => {
      ;(api.templates.getTemplates as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [mockTemplate]
      })
      const store = makeStore()
      await store.dispatch(fetchTemplates({ boardId: 'b1', groupId: 10 }))
      expect(store.getState().templates.templates).toHaveLength(1)
    })

    it('rejects when getTemplates fails', async () => {
      ;(api.templates.getTemplates as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to load templates.'
      })
      const store = makeStore()
      const result = await store.dispatch(fetchTemplates({ boardId: 'b1', groupId: 10 }))
      expect(result.type).toBe('templates/fetchTemplates/rejected')
    })
  })

  describe('createTemplateGroup', () => {
    it('adds group on success', async () => {
      ;(api.templates.createGroup as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockGroup
      })
      const store = makeStore()
      await store.dispatch(createTemplateGroup({ boardId: 'b1', name: 'Sprint Group' }))
      expect(store.getState().templates.groups).toHaveLength(1)
      expect(store.getState().templates.selectedGroupId).toBe(10)
    })

    it('rejects when createGroup fails', async () => {
      ;(api.templates.createGroup as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to create group.'
      })
      const store = makeStore()
      const result = await store.dispatch(
        createTemplateGroup({ boardId: 'b1', name: 'Sprint Group' })
      )
      expect(result.type).toBe('templates/createGroup/rejected')
    })
  })

  describe('renameTemplateGroup', () => {
    it('renames group on success', async () => {
      ;(api.templates.updateGroup as jest.Mock).mockResolvedValueOnce({ success: true })
      const store = configureStore({
        reducer: { templates: reducer },
        preloadedState: {
          templates: {
            ...initialState(),
            groups: [{ ...mockGroup }]
          }
        }
      })
      await store.dispatch(renameTemplateGroup({ boardId: 'b1', groupId: 10, name: 'Renamed' }))
      expect(store.getState().templates.groups[0].name).toBe('Renamed')
    })

    it('rejects when updateGroup fails', async () => {
      ;(api.templates.updateGroup as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to rename group.'
      })
      const store = makeStore()
      const result = await store.dispatch(
        renameTemplateGroup({ boardId: 'b1', groupId: 10, name: 'Renamed' })
      )
      expect(result.type).toBe('templates/renameGroup/rejected')
    })
  })

  describe('deleteTemplateGroup', () => {
    it('removes group on success', async () => {
      ;(api.templates.deleteGroup as jest.Mock).mockResolvedValueOnce({ success: true })
      const store = configureStore({
        reducer: { templates: reducer },
        preloadedState: { templates: { ...initialState(), groups: [{ ...mockGroup }] } }
      })
      await store.dispatch(deleteTemplateGroup({ boardId: 'b1', groupId: 10 }))
      expect(store.getState().templates.groups).toHaveLength(0)
    })

    it('rejects when deleteGroup fails', async () => {
      ;(api.templates.deleteGroup as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to delete group.'
      })
      const store = makeStore()
      const result = await store.dispatch(deleteTemplateGroup({ boardId: 'b1', groupId: 10 }))
      expect(result.type).toBe('templates/deleteGroup/rejected')
    })
  })

  describe('deleteTemplate', () => {
    it('removes template on success', async () => {
      ;(api.templates.deleteTemplate as jest.Mock).mockResolvedValueOnce({ success: true })
      const store = configureStore({
        reducer: { templates: reducer },
        preloadedState: {
          templates: { ...initialState(), templates: [mockTemplate, { ...mockTemplate, id: 2 }] }
        }
      })
      await store.dispatch(deleteTemplate({ boardId: 'b1', templateId: 1 }))
      expect(store.getState().templates.templates).toHaveLength(1)
    })

    it('rejects when deleteTemplate fails', async () => {
      ;(api.templates.deleteTemplate as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to delete template.'
      })
      const store = makeStore()
      const result = await store.dispatch(deleteTemplate({ boardId: 'b1', templateId: 1 }))
      expect(result.type).toBe('templates/deleteTemplate/rejected')
    })
  })

  describe('saveTemplate (create)', () => {
    it('creates template and re-fetches on success', async () => {
      ;(api.templates.createTemplate as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockTemplate
      })
      ;(api.templates.getTemplates as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [mockTemplate]
      })
      const store = makeStore()
      await store.dispatch(
        saveTemplate({
          boardId: 'b1',
          input: {
            name: 'T',
            titleTemplate: '',
            descTemplate: '',
            listId: 'l1',
            labelIds: [],
            epicCardId: null,
            position: 0,
            groupId: 10
          },
          existingId: null,
          groupId: 10
        })
      )
      expect(store.getState().templates.showTemplateForm).toBe(false)
    })

    it('rejects when createTemplate fails', async () => {
      ;(api.templates.createTemplate as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to create template.'
      })
      const store = makeStore()
      const result = await store.dispatch(
        saveTemplate({
          boardId: 'b1',
          input: {
            name: 'T',
            titleTemplate: '',
            descTemplate: '',
            listId: 'l1',
            labelIds: [],
            epicCardId: null,
            position: 0,
            groupId: 10
          },
          existingId: null,
          groupId: 10
        })
      )
      expect(result.type).toBe('templates/saveTemplate/rejected')
    })
  })

  describe('saveTemplate (update)', () => {
    it('updates template and re-fetches on success', async () => {
      ;(api.templates.updateTemplate as jest.Mock).mockResolvedValueOnce({ success: true })
      ;(api.templates.getTemplates as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [mockTemplate]
      })
      const store = makeStore()
      await store.dispatch(
        saveTemplate({
          boardId: 'b1',
          input: {
            name: 'T',
            titleTemplate: '',
            descTemplate: '',
            listId: 'l1',
            labelIds: [],
            epicCardId: null,
            position: 0,
            groupId: 10
          },
          existingId: 1,
          groupId: 10
        })
      )
      expect(store.getState().templates.showTemplateForm).toBe(false)
    })

    it('rejects when updateTemplate fails', async () => {
      ;(api.templates.updateTemplate as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to update template.'
      })
      const store = makeStore()
      const result = await store.dispatch(
        saveTemplate({
          boardId: 'b1',
          input: {
            name: 'T',
            titleTemplate: '',
            descTemplate: '',
            listId: 'l1',
            labelIds: [],
            epicCardId: null,
            position: 0,
            groupId: 10
          },
          existingId: 1,
          groupId: 10
        })
      )
      expect(result.type).toBe('templates/saveTemplate/rejected')
    })
  })

  describe('generateCards', () => {
    it('sets generateResult on success', async () => {
      ;(api.templates.generateCards as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { created: 5, errors: [] }
      })
      const store = makeStore()
      await store.dispatch(generateCards({ boardId: 'b1', groupId: 10 }))
      expect(store.getState().templates.generateResult).toEqual({ created: 5, errors: [] })
    })

    it('rejects when generateCards fails', async () => {
      ;(api.templates.generateCards as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to generate cards.'
      })
      const store = makeStore()
      const result = await store.dispatch(generateCards({ boardId: 'b1', groupId: 10 }))
      expect(result.type).toBe('templates/generateCards/rejected')
    })
  })
})
