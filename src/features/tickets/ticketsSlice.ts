import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { TicketNumberingConfig, UnnumberedCard } from '../../lib/ticket.types'
import type { CardStatus } from './tickets.types'
import { api } from '../api/useApi'

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchTicketConfig = createAsyncThunk(
  'tickets/fetchConfig',
  async (boardId: string) => {
    const result = await api.tickets.getConfig(boardId)
    if (!result.success) throw new Error(result.error ?? 'Failed to load configuration.')
    return result.data!
  }
)

export const saveTicketConfig = createAsyncThunk(
  'tickets/saveConfig',
  async (args: { boardId: string; projectCode: string; nextTicketNumber: number }) => {
    const updateResult = await api.tickets.updateConfig(args.boardId, {
      projectCode: args.projectCode,
      nextTicketNumber: args.nextTicketNumber
    })
    if (!updateResult.success) {
      throw new Error(updateResult.error ?? 'Failed to save configuration.')
    }
    // Re-fetch config after save since updateConfig returns void
    const configResult = await api.tickets.getConfig(args.boardId)
    if (!configResult.success || !configResult.data) {
      throw new Error(configResult.error ?? 'Failed to reload configuration.')
    }
    return configResult.data
  }
)

export const previewUnnumbered = createAsyncThunk(
  'tickets/previewUnnumbered',
  async (boardId: string) => {
    const result = await api.tickets.previewUnnumbered(boardId)
    if (!result.success) throw new Error(result.error ?? 'Failed to load preview.')
    return result.data ?? ([] as UnnumberedCard[])
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

interface CardState {
  card: UnnumberedCard
  status: CardStatus
  error?: string
  showError: boolean
}

interface TicketsState {
  config: TicketNumberingConfig | null
  projectCode: string
  nextTicketNumber: number
  configError: string | null
  savingConfig: boolean

  preview: UnnumberedCard[] | null
  loadingPreview: boolean
  previewError: string | null

  cardStates: CardState[] | null
  applying: boolean
}

const initialState: TicketsState = {
  config: null,
  projectCode: '',
  nextTicketNumber: 1,
  configError: null,
  savingConfig: false,

  preview: null,
  loadingPreview: false,
  previewError: null,

  cardStates: null,
  applying: false
}

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    // ── Page reset ──
    ticketsPageReset(state) {
      Object.assign(state, initialState)
    },

    // ── Config form ──
    projectCodeChanged(state, action: PayloadAction<string>) {
      state.projectCode = action.payload
    },
    nextTicketNumberChanged(state, action: PayloadAction<number>) {
      state.nextTicketNumber = action.payload
    },
    configErrorSet(state, action: PayloadAction<string | null>) {
      state.configError = action.payload
    },

    // ── Preview ──
    cardRemovedFromPreview(state, action: PayloadAction<string>) {
      if (state.preview) {
        state.preview = state.preview.filter((c) => c.cardId !== action.payload)
      }
    },

    // ── Apply ──
    applyStarted(state) {
      if (!state.preview || state.preview.length === 0) return
      state.cardStates = state.preview.map((card) => ({
        card,
        status: 'queued' as CardStatus,
        showError: false
      }))
      state.preview = null
      state.applying = true
    },
    cardStatusUpdated(
      state,
      action: PayloadAction<{ cardId: string; status: CardStatus; error?: string }>
    ) {
      if (!state.cardStates) return
      const cs = state.cardStates.find((c) => c.card.cardId === action.payload.cardId)
      if (cs) {
        cs.status = action.payload.status
        if (action.payload.error) cs.error = action.payload.error
      }
    },
    cardRemovedFromQueue(state, action: PayloadAction<string>) {
      if (state.cardStates) {
        state.cardStates = state.cardStates.filter((cs) => cs.card.cardId !== action.payload)
      }
    },
    applyCancelled(state) {
      if (!state.cardStates) return
      for (const cs of state.cardStates) {
        if (cs.status === 'queued') cs.status = 'cancelled'
      }
      state.applying = false
    },
    applyFinished(state) {
      state.applying = false
    },
    errorDetailToggled(state, action: PayloadAction<string>) {
      if (!state.cardStates) return
      const cs = state.cardStates.find((c) => c.card.cardId === action.payload)
      if (cs) cs.showError = !cs.showError
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchTicketConfig ──
      .addCase(fetchTicketConfig.fulfilled, (state, action) => {
        state.config = action.payload
        state.projectCode = action.payload.projectCode
        state.nextTicketNumber = action.payload.nextTicketNumber
        state.configError = null
      })
      .addCase(fetchTicketConfig.rejected, (state, action) => {
        state.configError = action.error.message ?? 'Failed to load configuration.'
      })

      // ── saveTicketConfig ──
      .addCase(saveTicketConfig.pending, (state) => {
        state.savingConfig = true
        state.configError = null
      })
      .addCase(saveTicketConfig.fulfilled, (state, action) => {
        state.savingConfig = false
        state.config = action.payload
        state.projectCode = action.payload.projectCode
        state.nextTicketNumber = action.payload.nextTicketNumber
        state.preview = null
        state.cardStates = null
      })
      .addCase(saveTicketConfig.rejected, (state, action) => {
        state.savingConfig = false
        state.configError = action.error.message ?? 'Failed to save configuration.'
      })

      // ── previewUnnumbered ──
      .addCase(previewUnnumbered.pending, (state) => {
        state.loadingPreview = true
        state.previewError = null
        state.cardStates = null
      })
      .addCase(previewUnnumbered.fulfilled, (state, action) => {
        state.loadingPreview = false
        state.preview = action.payload
      })
      .addCase(previewUnnumbered.rejected, (state, action) => {
        state.loadingPreview = false
        state.previewError = action.error.message ?? 'Failed to load preview.'
        state.preview = null
      })
  }
})

export const {
  ticketsPageReset,
  projectCodeChanged,
  nextTicketNumberChanged,
  configErrorSet,
  cardRemovedFromPreview,
  applyStarted,
  cardStatusUpdated,
  cardRemovedFromQueue,
  applyCancelled,
  applyFinished,
  errorDetailToggled
} = ticketsSlice.actions
export default ticketsSlice.reducer
