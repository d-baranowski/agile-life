export interface DbPathInfo {
  /** The currently active database file path. */
  currentPath: string
  /** The default database file path (inside Electron's userData directory). */
  defaultPath: string
  /** True when the user has configured a custom path different from the default. */
  isCustom: boolean
}
