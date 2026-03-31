import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type Tab = 'kanban' | 'grid' | 'dashboard' | 'templates' | 'settings'

interface UiState {
  activeTab: Tab
  showRegistration: boolean
}

const initialState: UiState = {
  activeTab: 'kanban',
  showRegistration: false
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    tabChanged(state, action: PayloadAction<Tab>) {
      state.activeTab = action.payload
    },
    registrationOpened(state) {
      state.showRegistration = true
    },
    registrationClosed(state) {
      state.showRegistration = false
    }
  }
})

export const { tabChanged, registrationOpened, registrationClosed } = uiSlice.actions
export default uiSlice.reducer

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectActiveTab = (state: { ui: UiState }): Tab => state.ui.activeTab
export const selectShowRegistration = (state: { ui: UiState }): boolean => state.ui.showRegistration
