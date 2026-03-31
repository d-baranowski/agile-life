import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { EpicCardOption } from '../../lib/board.types'
import type { KanbanColumn, TrelloLabel } from '../../trello/trello.types'
import type {
  TemplateGroup,
  TicketTemplate,
  TicketTemplateInput,
  GenerateCardsResult
} from './template.types'
import { api } from '../api/useApi'

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchTemplatePageData = createAsyncThunk(
  'templates/fetchPageData',
  async (args: { boardId: string; epicBoardId: string | null }) => {
    const [groupsResult, listsResult, labelsResult] = await Promise.all([
      api.templates.getGroups(args.boardId),
      api.trello.getBoardData(args.boardId),
      api.templates.getBoardLabels(args.boardId)
    ])

    const epicResult = args.epicBoardId ? await api.epics.getCards(args.boardId) : null

    return {
      groups: groupsResult.success && groupsResult.data ? groupsResult.data : [],
      lists: listsResult.success && listsResult.data ? listsResult.data : [],
      boardLabels: labelsResult.success && labelsResult.data ? labelsResult.data : [],
      epicCards: epicResult?.success && epicResult.data ? epicResult.data : []
    }
  }
)

export const fetchTemplates = createAsyncThunk(
  'templates/fetchTemplates',
  async (args: { boardId: string; groupId: number }) => {
    const result = await api.templates.getTemplates(args.boardId, args.groupId)
    if (!result.success) throw new Error(result.error ?? 'Failed to load templates.')
    return result.data ?? ([] as TicketTemplate[])
  }
)

export const createTemplateGroup = createAsyncThunk(
  'templates/createGroup',
  async (args: { boardId: string; name: string }) => {
    const result = await api.templates.createGroup(args.boardId, { name: args.name })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to create group.')
    }
    return result.data
  }
)

export const renameTemplateGroup = createAsyncThunk(
  'templates/renameGroup',
  async (args: { boardId: string; groupId: number; name: string }) => {
    const result = await api.templates.updateGroup(args.boardId, args.groupId, {
      name: args.name
    })
    if (!result.success) throw new Error(result.error ?? 'Failed to rename group.')
    return { groupId: args.groupId, name: args.name }
  }
)

export const deleteTemplateGroup = createAsyncThunk(
  'templates/deleteGroup',
  async (args: { boardId: string; groupId: number }) => {
    const result = await api.templates.deleteGroup(args.boardId, args.groupId)
    if (!result.success) throw new Error(result.error ?? 'Failed to delete group.')
    return args.groupId
  }
)

export const deleteTemplate = createAsyncThunk(
  'templates/deleteTemplate',
  async (args: { boardId: string; templateId: number }) => {
    const result = await api.templates.deleteTemplate(args.boardId, args.templateId)
    if (!result.success) throw new Error(result.error ?? 'Failed to delete template.')
    return args.templateId
  }
)

export const saveTemplate = createAsyncThunk(
  'templates/saveTemplate',
  async (
    args: {
      boardId: string
      input: TicketTemplateInput
      existingId: number | null
      groupId: number
    },
    { dispatch }
  ) => {
    if (args.existingId !== null) {
      const result = await api.templates.updateTemplate(args.boardId, args.existingId, args.input)
      if (!result.success) throw new Error(result.error ?? 'Failed to update template.')
      // Re-fetch templates since updateTemplate returns void
      await dispatch(fetchTemplates({ boardId: args.boardId, groupId: args.groupId }))
      return null
    } else {
      const result = await api.templates.createTemplate(args.boardId, args.input)
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Failed to create template.')
      }
      // Re-fetch to get full list
      await dispatch(fetchTemplates({ boardId: args.boardId, groupId: args.groupId }))
      return result.data
    }
  }
)

export const generateCards = createAsyncThunk(
  'templates/generateCards',
  async (args: { boardId: string; groupId: number }) => {
    const result = await api.templates.generateCards(args.boardId, args.groupId)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to generate cards.')
    }
    return result.data
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

interface TemplatesState {
  // Page data
  groups: TemplateGroup[]
  selectedGroupId: number | null
  templates: TicketTemplate[]
  lists: KanbanColumn[]
  boardLabels: TrelloLabel[]
  epicCards: EpicCardOption[]

  // Group editing
  editingGroupId: number | null
  editingGroupName: string
  newGroupName: string
  showNewGroupInput: boolean

  // Template form
  showTemplateForm: boolean
  editingTemplate: TicketTemplate | null
  formSaving: boolean
  formError: string | null

  // Template form fields
  formName: string
  formTitleTemplate: string
  formDescTemplate: string
  formListId: string
  formSelectedLabelIds: string[]
  formEpicCardId: string

  // Generate
  generating: boolean
  generateResult: GenerateCardsResult | null
  generateError: string | null
}

const initialState: TemplatesState = {
  groups: [],
  selectedGroupId: null,
  templates: [],
  lists: [],
  boardLabels: [],
  epicCards: [],

  editingGroupId: null,
  editingGroupName: '',
  newGroupName: '',
  showNewGroupInput: false,

  showTemplateForm: false,
  editingTemplate: null,
  formSaving: false,
  formError: null,

  formName: '',
  formTitleTemplate: '',
  formDescTemplate: '',
  formListId: '',
  formSelectedLabelIds: [],
  formEpicCardId: '',

  generating: false,
  generateResult: null,
  generateError: null
}

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    // ── Board change reset ──
    templatesPageReset(state) {
      Object.assign(state, initialState)
    },

    // ── Group selection ──
    groupSelected(state, action: PayloadAction<number | null>) {
      state.selectedGroupId = action.payload
      state.generateResult = null
      state.generateError = null
    },

    // ── Group editing ──
    groupEditStarted(state, action: PayloadAction<{ id: number; name: string }>) {
      state.editingGroupId = action.payload.id
      state.editingGroupName = action.payload.name
    },
    groupEditCancelled(state) {
      state.editingGroupId = null
    },
    editingGroupNameChanged(state, action: PayloadAction<string>) {
      state.editingGroupName = action.payload
    },
    newGroupNameChanged(state, action: PayloadAction<string>) {
      state.newGroupName = action.payload
    },
    newGroupInputToggled(state) {
      state.showNewGroupInput = !state.showNewGroupInput
    },
    newGroupInputClosed(state) {
      state.showNewGroupInput = false
      state.newGroupName = ''
    },

    // ── Template form ──
    templateFormOpened(state, action: PayloadAction<TicketTemplate | null>) {
      const t = action.payload
      state.editingTemplate = t
      state.formError = null
      state.showTemplateForm = true
      state.formName = t?.name ?? ''
      state.formTitleTemplate = t?.titleTemplate ?? ''
      state.formDescTemplate = t?.descTemplate ?? ''
      state.formListId = t?.listId ?? state.lists[0]?.id ?? ''
      state.formSelectedLabelIds = t?.labelIds ?? []
      state.formEpicCardId = t?.epicCardId ?? ''
    },
    templateFormClosed(state) {
      state.showTemplateForm = false
      state.editingTemplate = null
    },
    formSavingStarted(state) {
      state.formSaving = true
      state.formError = null
    },
    formSavingFinished(state, action: PayloadAction<string | null>) {
      state.formSaving = false
      state.formError = action.payload
      if (!action.payload) {
        state.showTemplateForm = false
        state.editingTemplate = null
      }
    },

    // ── Template form fields ──
    formNameChanged(state, action: PayloadAction<string>) {
      state.formName = action.payload
    },
    formTitleTemplateChanged(state, action: PayloadAction<string>) {
      state.formTitleTemplate = action.payload
    },
    formDescTemplateChanged(state, action: PayloadAction<string>) {
      state.formDescTemplate = action.payload
    },
    formListIdChanged(state, action: PayloadAction<string>) {
      state.formListId = action.payload
    },
    formLabelToggled(state, action: PayloadAction<string>) {
      const id = action.payload
      const idx = state.formSelectedLabelIds.indexOf(id)
      if (idx >= 0) {
        state.formSelectedLabelIds.splice(idx, 1)
      } else {
        state.formSelectedLabelIds.push(id)
      }
    },
    formEpicCardIdChanged(state, action: PayloadAction<string>) {
      state.formEpicCardId = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplatePageData.fulfilled, (state, action) => {
        state.groups = action.payload.groups
        state.lists = action.payload.lists
        state.boardLabels = action.payload.boardLabels
        state.epicCards = action.payload.epicCards
      })

      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.templates = action.payload
      })

      .addCase(createTemplateGroup.fulfilled, (state, action) => {
        state.groups.push(action.payload)
        state.selectedGroupId = action.payload.id
        state.newGroupName = ''
        state.showNewGroupInput = false
      })

      .addCase(renameTemplateGroup.fulfilled, (state, action) => {
        const group = state.groups.find((g) => g.id === action.payload.groupId)
        if (group) group.name = action.payload.name
        state.editingGroupId = null
      })

      .addCase(deleteTemplateGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter((g) => g.id !== action.payload)
        if (state.selectedGroupId === action.payload) {
          state.selectedGroupId = null
        }
      })

      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.templates = state.templates.filter((t) => t.id !== action.payload)
      })

      .addCase(generateCards.pending, (state) => {
        state.generating = true
        state.generateResult = null
        state.generateError = null
      })
      .addCase(generateCards.fulfilled, (state, action) => {
        state.generating = false
        state.generateResult = action.payload
      })
      .addCase(generateCards.rejected, (state, action) => {
        state.generating = false
        state.generateError = action.error.message ?? 'Failed to generate cards.'
      })

      // ── saveTemplate ──
      .addCase(saveTemplate.pending, (state) => {
        state.formSaving = true
        state.formError = null
      })
      .addCase(saveTemplate.fulfilled, (state) => {
        state.formSaving = false
        state.showTemplateForm = false
        state.editingTemplate = null
      })
      .addCase(saveTemplate.rejected, (state, action) => {
        state.formSaving = false
        state.formError = action.error.message ?? 'Failed to save template.'
      })
  }
})

export const {
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
} = templatesSlice.actions
export default templatesSlice.reducer
