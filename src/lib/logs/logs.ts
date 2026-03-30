import { ipcMain, shell, dialog } from 'electron'
import path from 'path'
import { IPC_CHANNELS } from '../../features/ipc/ipc.types'
import type { IpcResult } from '../../features/ipc/ipc.types'
import type { LogPathInfo } from '../../features/settings/settings.types'
import { getLogFilePath, getDefaultLogFilePath, applyLogPath } from './logger'
import { setLogPath } from '../../settings/appSettings'
import log from './logger'

function buildLogPathInfo(): LogPathInfo {
  const currentPath = getLogFilePath()
  const defaultPath = getDefaultLogFilePath()
  return { currentPath, defaultPath, isCustom: currentPath !== defaultPath }
}

export function registerLogHandlers(): void {
  // ── Get log file path info ──────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_PATH, async (): Promise<IpcResult<LogPathInfo>> => {
    try {
      return { success: true, data: buildLogPathInfo() }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ── Open log folder in the native file manager ──────────────────────────────

  ipcMain.handle(IPC_CHANNELS.LOGS_OPEN_FOLDER, async (): Promise<IpcResult<void>> => {
    try {
      const logPath = getLogFilePath()
      const logDir = path.dirname(logPath)
      await shell.openPath(logDir)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ── Choose a custom log folder (opens native folder-picker dialog) ──────────
  //
  // The user picks a folder; the log file will be placed there as "main.log".
  // Pass `resetToDefault = true` to restore the electron-log default location.
  // The new path takes effect immediately (no restart required).

  ipcMain.handle(
    IPC_CHANNELS.LOGS_SET_PATH,
    async (_e, resetToDefault: boolean): Promise<IpcResult<LogPathInfo>> => {
      try {
        if (resetToDefault) {
          log.info('[logs] setPath: resetting to default')
          setLogPath(null)
          applyLogPath(null)
          log.info('[logs] setPath: restored default log path')
        } else {
          const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Choose Log Folder',
            defaultPath: path.dirname(getLogFilePath()),
            properties: ['openDirectory', 'createDirectory']
          })

          if (canceled || !filePaths[0]) {
            log.info('[logs] setPath: dialog cancelled')
            return { success: true, data: buildLogPathInfo() }
          }

          const newLogPath = path.join(filePaths[0], 'main.log')
          log.info(`[logs] setPath: new path="${newLogPath}"`)
          setLogPath(newLogPath)
          applyLogPath(newLogPath)
          log.info(`[logs] now writing to "${newLogPath}"`)
        }

        return { success: true, data: buildLogPathInfo() }
      } catch (err) {
        log.error('[logs] setPath failed:', err)
        return { success: false, error: String(err) }
      }
    }
  )
}
