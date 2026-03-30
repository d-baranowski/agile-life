import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import { IPC_CHANNELS } from './ipc.types'
import type { IpcResult } from './ipc.types'
import type { DbPathInfo } from '../features/settings/settings.types'
import { getDbPath, getDefaultDbPath, setDbPath } from '../settings/appSettings'
import log from '../lib/logger'

export function registerSettingsHandlers(): void {
  // ── Get DB path info ────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_DB_PATH, async (): Promise<IpcResult<DbPathInfo>> => {
    try {
      const defaultPath = getDefaultDbPath()
      const currentPath = getDbPath()
      log.debug(
        `[settings] getDbPath currentPath="${currentPath}" isCustom=${currentPath !== defaultPath}`
      )
      return {
        success: true,
        data: {
          currentPath,
          defaultPath,
          isCustom: currentPath !== defaultPath
        }
      }
    } catch (err) {
      log.error('[settings] getDbPath failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Set DB path (opens native save dialog, then copies current DB) ──────────

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET_DB_PATH,
    async (_e, resetToDefault: boolean): Promise<IpcResult<DbPathInfo>> => {
      try {
        if (resetToDefault) {
          log.info('[settings] setDbPath: resetting to default')
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
            log.info('[settings] setDbPath: dialog cancelled')
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
            log.warn(
              '[settings] setDbPath: current database file not found at',
              currentPath,
              '— new location will start with an empty database.'
            )
          }

          log.info(`[settings] setDbPath: new path="${filePath}"`)
          setDbPath(filePath)
        }

        const defaultPath = getDefaultDbPath()
        const currentPath = getDbPath()
        return {
          success: true,
          data: { currentPath, defaultPath, isCustom: currentPath !== defaultPath }
        }
      } catch (err) {
        log.error('[settings] setDbPath failed:', err)
        return { success: false, error: String(err) }
      }
    }
  )
}
