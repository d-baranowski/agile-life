import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import log from '../logger'

interface AppSettings {
  dbPath?: string
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'agile-life-settings.json')
}

function readSettings(): AppSettings {
  const filePath = getSettingsPath()
  if (!fs.existsSync(filePath)) return {}
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as AppSettings
  } catch (err) {
    log.error('[appSettings] Failed to parse settings file, using defaults:', err)
    return {}
  }
}

function writeSettings(settings: AppSettings): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

/** Returns the default DB path (inside Electron's userData directory). */
export function getDefaultDbPath(): string {
  return path.join(app.getPath('userData'), 'agile-life.db')
}

/**
 * Returns the active DB path.  Falls back to the default userData path if no
 * custom path has been configured.
 */
export function getDbPath(): string {
  return readSettings().dbPath ?? getDefaultDbPath()
}

/** Persists a custom DB path.  Pass `null` to restore the default. */
export function setDbPath(newPath: string | null): void {
  const settings = readSettings()
  if (newPath === null) {
    delete settings.dbPath
  } else {
    settings.dbPath = newPath
  }
  writeSettings(settings)
}
