import reducer, {
  tabChanged,
  registrationOpened,
  registrationClosed,
  selectActiveTab,
  selectShowRegistration
} from '../uiSlice'

const initialState = () => reducer(undefined, { type: '@@INIT' })

describe('uiSlice', () => {
  describe('initial state', () => {
    it('starts on the kanban tab with registration hidden', () => {
      const state = initialState()
      expect(state.activeTab).toBe('kanban')
      expect(state.showRegistration).toBe(false)
    })
  })

  describe('reducers', () => {
    it('tabChanged sets the active tab', () => {
      const state = reducer(initialState(), tabChanged('dashboard'))
      expect(state.activeTab).toBe('dashboard')
    })

    it('tabChanged can cycle through all tabs', () => {
      let state = initialState()
      for (const tab of ['kanban', 'dashboard', 'templates', 'settings'] as const) {
        state = reducer(state, tabChanged(tab))
        expect(state.activeTab).toBe(tab)
      }
    })

    it('registrationOpened sets showRegistration to true', () => {
      const state = reducer(initialState(), registrationOpened())
      expect(state.showRegistration).toBe(true)
    })

    it('registrationClosed sets showRegistration to false', () => {
      let state = reducer(initialState(), registrationOpened())
      state = reducer(state, registrationClosed())
      expect(state.showRegistration).toBe(false)
    })

    it('registrationClosed is idempotent when already closed', () => {
      const state = reducer(initialState(), registrationClosed())
      expect(state.showRegistration).toBe(false)
    })
  })

  describe('selectors', () => {
    it('selectActiveTab returns the active tab', () => {
      const root = { ui: reducer(initialState(), tabChanged('settings')) }
      expect(selectActiveTab(root)).toBe('settings')
    })

    it('selectShowRegistration returns the registration flag', () => {
      const root = { ui: reducer(initialState(), registrationOpened()) }
      expect(selectShowRegistration(root)).toBe(true)
    })
  })
})
