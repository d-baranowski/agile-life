import { ipcMain, shell } from 'electron'
import path from 'path'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import { getLogFilePath } from '../logger'

export function registerLogHandlers(): void {
  // ── Get log file path ───────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_PATH, async (): Promise<IpcResult<string>> => {
    try {
      return { success: true, data: getLogFilePath() }
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
}
