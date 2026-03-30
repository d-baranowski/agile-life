import log from 'electron-log/main'
import { getLogPath } from '../../settings/appSettings'

// Write logs to the default electron-log file location:
//   macOS:   ~/Library/Logs/<app name>/main.log
//   Windows: %USERPROFILE%\AppData\Roaming\<app name>\logs\main.log
//   Linux:   ~/.config/<app name>/logs/main.log
log.initialize()

log.transports.file.level = 'debug'
log.transports.console.level = 'debug'

// Record the electron-log default before any override.
const defaultLogFilePath = log.transports.file.getFile().path

// Apply a persisted custom log path if one has been configured.
const savedLogPath = getLogPath()
if (savedLogPath) {
  log.transports.file.resolvePathFn = () => savedLogPath
}

export default log

/** Returns the electron-log default log file path (before any user override). */
export function getDefaultLogFilePath(): string {
  return defaultLogFilePath
}

/** Returns the absolute path of the current (possibly custom) log file. */
export function getLogFilePath(): string {
  return log.transports.file.getFile().path
}

/**
 * Changes the active log file path at runtime and persists the choice.
 * Pass `null` to revert to the electron-log default.
 */
export function applyLogPath(newPath: string | null): void {
  if (newPath) {
    log.transports.file.resolvePathFn = () => newPath
  } else {
    log.transports.file.resolvePathFn = () => defaultLogFilePath
  }
}
