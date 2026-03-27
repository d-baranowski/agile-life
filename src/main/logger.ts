import log from 'electron-log/main'

// Write logs to the default electron-log file location:
//   macOS:   ~/Library/Logs/<app name>/main.log
//   Windows: %USERPROFILE%\AppData\Roaming\<app name>\logs\main.log
//   Linux:   ~/.config/<app name>/logs/main.log
log.initialize()

log.transports.file.level = 'debug'
log.transports.console.level = 'debug'

export default log

/** Returns the absolute path of the current log file. */
export function getLogFilePath(): string {
  return log.transports.file.getFile().path
}
