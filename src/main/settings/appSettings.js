import { app } from 'electron';
import path from 'path';
import fs from 'fs';
function getSettingsPath() {
    return path.join(app.getPath('userData'), 'agile-life-settings.json');
}
function readSettings() {
    const filePath = getSettingsPath();
    if (!fs.existsSync(filePath))
        return {};
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    catch (err) {
        console.error('[appSettings] Failed to parse settings file, using defaults:', err);
        return {};
    }
}
function writeSettings(settings) {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}
/** Returns the default DB path (inside Electron's userData directory). */
export function getDefaultDbPath() {
    return path.join(app.getPath('userData'), 'agile-life.db');
}
/**
 * Returns the active DB path.  Falls back to the default userData path if no
 * custom path has been configured.
 */
export function getDbPath() {
    return readSettings().dbPath ?? getDefaultDbPath();
}
/** Persists a custom DB path.  Pass `null` to restore the default. */
export function setDbPath(newPath) {
    const settings = readSettings();
    if (newPath === null) {
        delete settings.dbPath;
    }
    else {
        settings.dbPath = newPath;
    }
    writeSettings(settings);
}
