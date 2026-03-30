import { configureStore } from '@reduxjs/toolkit'
import boardsReducer from '../features/board-switcher/boardsSlice'
import uiReducer from './uiSlice'
import kanbanReducer from '../features/kanban/kanbanSlice'
import dashboardReducer from '../features/dashboard/dashboardSlice'
import settingsReducer from '../features/settings/settingsSlice'
import templatesReducer from '../features/templates/templatesSlice'
import ticketsReducer from '../features/tickets/ticketsSlice'

export const store = configureStore({
  reducer: {
    boards: boardsReducer,
    ui: uiReducer,
    kanban: kanbanReducer,
    dashboard: dashboardReducer,
    settings: settingsReducer,
    templates: templatesReducer,
    tickets: ticketsReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
