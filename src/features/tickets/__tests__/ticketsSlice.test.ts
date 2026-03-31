import reducer, {
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
} from '../ticketsSlice'

const initialState = () => reducer(undefined, { type: '@@INIT' })

const mockConfig = {
  projectCode: 'PRJ',
  nextTicketNumber: 42,
  unnumberedCount: 5
}

const mockCards = [
  { cardId: 'c1', cardName: 'Card One', listName: 'To Do', proposedName: 'PRJ-1 Card One' },
  { cardId: 'c2', cardName: 'Card Two', listName: 'To Do', proposedName: 'PRJ-2 Card Two' },
  { cardId: 'c3', cardName: 'Card Three', listName: 'Doing', proposedName: 'PRJ-3 Card Three' }
]

describe('ticketsSlice', () => {
  describe('initial state', () => {
    it('has expected defaults', () => {
      const state = initialState()
      expect(state.config).toBeNull()
      expect(state.projectCode).toBe('')
      expect(state.nextTicketNumber).toBe(1)
      expect(state.configError).toBeNull()
      expect(state.savingConfig).toBe(false)
      expect(state.preview).toBeNull()
      expect(state.loadingPreview).toBe(false)
      expect(state.previewError).toBeNull()
      expect(state.cardStates).toBeNull()
      expect(state.applying).toBe(false)
    })
  })

  describe('reducers', () => {
    it('ticketsPageReset resets to initial state', () => {
      let state = initialState()
      state = reducer(state, projectCodeChanged('ABC'))
      state = reducer(state, nextTicketNumberChanged(99))
      state = reducer(state, ticketsPageReset())
      expect(state.projectCode).toBe('')
      expect(state.nextTicketNumber).toBe(1)
    })

    it('projectCodeChanged updates projectCode', () => {
      const state = reducer(initialState(), projectCodeChanged('NEW'))
      expect(state.projectCode).toBe('NEW')
    })

    it('nextTicketNumberChanged updates nextTicketNumber', () => {
      const state = reducer(initialState(), nextTicketNumberChanged(100))
      expect(state.nextTicketNumber).toBe(100)
    })

    it('configErrorSet sets and clears error', () => {
      let state = reducer(initialState(), configErrorSet('Something broke'))
      expect(state.configError).toBe('Something broke')
      state = reducer(state, configErrorSet(null))
      expect(state.configError).toBeNull()
    })

    it('cardRemovedFromPreview removes a card from preview', () => {
      let state = initialState()
      state = { ...state, preview: [...mockCards] }
      state = reducer(state, cardRemovedFromPreview('c2'))
      expect(state.preview).toHaveLength(2)
      expect(state.preview!.map((c) => c.cardId)).toEqual(['c1', 'c3'])
    })

    it('cardRemovedFromPreview is a no-op when preview is null', () => {
      const state = reducer(initialState(), cardRemovedFromPreview('c1'))
      expect(state.preview).toBeNull()
    })

    describe('applyStarted', () => {
      it('converts preview cards to cardStates with queued status', () => {
        let state = initialState()
        state = { ...state, preview: [...mockCards] }
        state = reducer(state, applyStarted())
        expect(state.cardStates).toHaveLength(3)
        expect(state.cardStates![0].card).toEqual(mockCards[0])
        expect(state.cardStates![0].status).toBe('queued')
        expect(state.cardStates![0].showError).toBe(false)
        expect(state.preview).toBeNull()
        expect(state.applying).toBe(true)
      })

      it('is a no-op when preview is null', () => {
        const state = reducer(initialState(), applyStarted())
        expect(state.cardStates).toBeNull()
        expect(state.applying).toBe(false)
      })

      it('is a no-op when preview is empty', () => {
        let state = initialState()
        state = { ...state, preview: [] }
        state = reducer(state, applyStarted())
        expect(state.cardStates).toBeNull()
        expect(state.applying).toBe(false)
      })
    })

    describe('cardStatusUpdated', () => {
      it('updates a card status', () => {
        let state = initialState()
        state = { ...state, preview: [...mockCards] }
        state = reducer(state, applyStarted())
        state = reducer(state, cardStatusUpdated({ cardId: 'c1', status: 'success' }))
        expect(state.cardStates![0].status).toBe('success')
      })

      it('sets error message when provided', () => {
        let state = initialState()
        state = { ...state, preview: [...mockCards] }
        state = reducer(state, applyStarted())
        state = reducer(
          state,
          cardStatusUpdated({ cardId: 'c2', status: 'error', error: 'API error' })
        )
        expect(state.cardStates![1].status).toBe('error')
        expect(state.cardStates![1].error).toBe('API error')
      })

      it('is a no-op when cardStates is null', () => {
        const state = reducer(
          initialState(),
          cardStatusUpdated({ cardId: 'c1', status: 'success' })
        )
        expect(state.cardStates).toBeNull()
      })
    })

    it('cardRemovedFromQueue removes a card from cardStates', () => {
      let state = initialState()
      state = { ...state, preview: [...mockCards] }
      state = reducer(state, applyStarted())
      state = reducer(state, cardRemovedFromQueue('c2'))
      expect(state.cardStates).toHaveLength(2)
      expect(state.cardStates!.map((cs) => cs.card.cardId)).toEqual(['c1', 'c3'])
    })

    it('applyCancelled marks all queued cards as cancelled', () => {
      let state = initialState()
      state = { ...state, preview: [...mockCards] }
      state = reducer(state, applyStarted())
      // Mark first as success
      state = reducer(state, cardStatusUpdated({ cardId: 'c1', status: 'success' }))
      state = reducer(state, applyCancelled())
      expect(state.cardStates![0].status).toBe('success') // unchanged
      expect(state.cardStates![1].status).toBe('cancelled')
      expect(state.cardStates![2].status).toBe('cancelled')
      expect(state.applying).toBe(false)
    })

    it('applyFinished sets applying to false', () => {
      let state = initialState()
      state = { ...state, preview: [...mockCards], applying: true }
      state = reducer(state, applyFinished())
      expect(state.applying).toBe(false)
    })

    it('errorDetailToggled toggles showError on a card', () => {
      let state = initialState()
      state = { ...state, preview: [...mockCards] }
      state = reducer(state, applyStarted())
      state = reducer(state, errorDetailToggled('c2'))
      expect(state.cardStates![1].showError).toBe(true)
      state = reducer(state, errorDetailToggled('c2'))
      expect(state.cardStates![1].showError).toBe(false)
    })
  })

  describe('extraReducers', () => {
    describe('fetchTicketConfig', () => {
      it('fulfilled sets config and form fields', () => {
        const state = reducer(initialState(), {
          type: 'tickets/fetchConfig/fulfilled',
          payload: mockConfig
        })
        expect(state.config).toEqual(mockConfig)
        expect(state.projectCode).toBe('PRJ')
        expect(state.nextTicketNumber).toBe(42)
        expect(state.configError).toBeNull()
      })

      it('rejected sets configError', () => {
        const state = reducer(initialState(), {
          type: 'tickets/fetchConfig/rejected',
          error: { message: 'Network error' }
        })
        expect(state.configError).toBe('Network error')
      })

      it('rejected uses fallback message', () => {
        const state = reducer(initialState(), {
          type: 'tickets/fetchConfig/rejected',
          error: {}
        })
        expect(state.configError).toBe('Failed to load configuration.')
      })
    })

    describe('saveTicketConfig', () => {
      it('pending sets savingConfig and clears error', () => {
        let state = initialState()
        state = { ...state, configError: 'old error' }
        state = reducer(state, { type: 'tickets/saveConfig/pending' })
        expect(state.savingConfig).toBe(true)
        expect(state.configError).toBeNull()
      })

      it('fulfilled updates config and clears preview/cardStates', () => {
        let state = initialState()
        state = { ...state, preview: [...mockCards], cardStates: [] }
        state = reducer(state, {
          type: 'tickets/saveConfig/fulfilled',
          payload: mockConfig
        })
        expect(state.savingConfig).toBe(false)
        expect(state.config).toEqual(mockConfig)
        expect(state.projectCode).toBe('PRJ')
        expect(state.nextTicketNumber).toBe(42)
        expect(state.preview).toBeNull()
        expect(state.cardStates).toBeNull()
      })

      it('rejected sets error', () => {
        const state = reducer(initialState(), {
          type: 'tickets/saveConfig/rejected',
          error: { message: 'Save failed' }
        })
        expect(state.savingConfig).toBe(false)
        expect(state.configError).toBe('Save failed')
      })
    })

    describe('previewUnnumbered', () => {
      it('pending sets loading and clears cardStates', () => {
        let state = initialState()
        state = {
          ...state,
          cardStates: [{ card: mockCards[0], status: 'queued' as const, showError: false }]
        }
        state = reducer(state, { type: 'tickets/previewUnnumbered/pending' })
        expect(state.loadingPreview).toBe(true)
        expect(state.previewError).toBeNull()
        expect(state.cardStates).toBeNull()
      })

      it('fulfilled sets preview', () => {
        const state = reducer(initialState(), {
          type: 'tickets/previewUnnumbered/fulfilled',
          payload: mockCards
        })
        expect(state.loadingPreview).toBe(false)
        expect(state.preview).toEqual(mockCards)
      })

      it('rejected sets error and clears preview', () => {
        const state = reducer(initialState(), {
          type: 'tickets/previewUnnumbered/rejected',
          error: { message: 'Preview failed' }
        })
        expect(state.loadingPreview).toBe(false)
        expect(state.previewError).toBe('Preview failed')
        expect(state.preview).toBeNull()
      })
    })
  })
})
