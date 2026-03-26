import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { DbPathInfo } from '@shared/settings.types'
import { getDbPath, getDefaultDbPath, setDbPath } from '../settings/appSettings'

export function registerSettingsHandlers(): void {
  // ── Get DB path info ────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_DB_PATH, async (): Promise<IpcResult<DbPathInfo>> => {
    try {
      const defaultPath = getDefaultDbPath()
      const currentPath = getDbPath()
      return {
        success: true,
        data: {
          currentPath,
          defaultPath,
          isCustom: currentPath !== defaultPath
        }
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ── Set DB path (opens native save dialog, then copies current DB) ──────────

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET_DB_PATH,
    async (_e, resetToDefault: boolean): Promise<IpcResult<DbPathInfo>> => {
      try {
        if (resetToDefault) {
          setDbPath(null)
        } else {
          const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Choose Database Location',
            defaultPath: getDbPath(),
            buttonLabel: 'Select',
            filters: [{ name: 'SQLite Database', extensions: ['db'] }],
            properties: ['createDirectory', 'showOverwriteConfirmation']
          })

          if (canceled || !filePath) {
            const defaultPath = getDefaultDbPath()
            const currentPath = getDbPath()
            return {
              success: true,
              data: { currentPath, defaultPath, isCustom: currentPath !== defaultPath }
            }
          }

          // Copy current DB to the new location (unless the file already exists there)
          const currentPath = getDbPath()
          if (fs.existsSync(currentPath)) {
            if (!fs.existsSync(filePath)) {
              fs.copyFileSync(currentPath, filePath)
            }
          } else {
            console.warn(
              '[settings] Current database file not found at',
              currentPath,
              '— new location will start with an empty database.'
            )
          }

          setDbPath(filePath)
        }

        const defaultPath = getDefaultDbPath()
        const currentPath = getDbPath()
        return {
          success: true,
          data: { currentPath, defaultPath, isCustom: currentPath !== defaultPath }
        }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
