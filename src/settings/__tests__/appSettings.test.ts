/**
 * Tests for appSettings.ts — reads and writes agile-life-settings.json using
 * the Electron userData directory.  We mock `electron`, `fs`, and `path` to
 * run in a pure Node.js test environment.
 */

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/userData')
  }
}))

const mockExistsSync = jest.fn()
const mockReadFileSync = jest.fn()
const mockWriteFileSync = jest.fn()

jest.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args)
}))

import { getDefaultDbPath, getDbPath, setDbPath, getLogPath, setLogPath } from '../appSettings'

const SETTINGS_PATH = '/mock/userData/agile-life-settings.json'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('getDefaultDbPath', () => {
  it('returns the default userData db path', () => {
    expect(getDefaultDbPath()).toBe('/mock/userData/agile-life.db')
  })
})

describe('getDbPath', () => {
  it('returns the default db path when settings file does not exist', () => {
    mockExistsSync.mockReturnValueOnce(false)
    expect(getDbPath()).toBe('/mock/userData/agile-life.db')
  })

  it('returns the custom db path when set in settings', () => {
    mockExistsSync.mockReturnValueOnce(true)
    mockReadFileSync.mockReturnValueOnce(JSON.stringify({ dbPath: '/custom/db.sqlite' }))
    expect(getDbPath()).toBe('/custom/db.sqlite')
  })

  it('returns the default db path when settings has no dbPath', () => {
    mockExistsSync.mockReturnValueOnce(true)
    mockReadFileSync.mockReturnValueOnce(JSON.stringify({ logPath: '/custom/log' }))
    expect(getDbPath()).toBe('/mock/userData/agile-life.db')
  })

  it('returns defaults when settings file is malformed JSON', () => {
    mockExistsSync.mockReturnValueOnce(true)
    mockReadFileSync.mockReturnValueOnce('not valid json {{')
    expect(getDbPath()).toBe('/mock/userData/agile-life.db')
  })
})

describe('setDbPath', () => {
  it('persists a custom db path', () => {
    mockExistsSync.mockReturnValueOnce(false)
    setDbPath('/new/db.sqlite')
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      SETTINGS_PATH,
      JSON.stringify({ dbPath: '/new/db.sqlite' }, null, 2),
      'utf-8'
    )
  })

  it('removes dbPath from settings when null is passed', () => {
    mockExistsSync.mockReturnValueOnce(true)
    mockReadFileSync.mockReturnValueOnce(JSON.stringify({ dbPath: '/old/db.sqlite' }))
    setDbPath(null)
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string)
    expect(written).not.toHaveProperty('dbPath')
  })
})

describe('getLogPath', () => {
  it('returns null when no logPath is stored', () => {
    mockExistsSync.mockReturnValueOnce(false)
    expect(getLogPath()).toBeNull()
  })

  it('returns the custom log path when set', () => {
    mockExistsSync.mockReturnValueOnce(true)
    mockReadFileSync.mockReturnValueOnce(JSON.stringify({ logPath: '/custom/logs' }))
    expect(getLogPath()).toBe('/custom/logs')
  })
})

describe('setLogPath', () => {
  it('persists a custom log path', () => {
    mockExistsSync.mockReturnValueOnce(false)
    setLogPath('/custom/logs')
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      SETTINGS_PATH,
      JSON.stringify({ logPath: '/custom/logs' }, null, 2),
      'utf-8'
    )
  })

  it('removes logPath from settings when null is passed', () => {
    mockExistsSync.mockReturnValueOnce(true)
    mockReadFileSync.mockReturnValueOnce(JSON.stringify({ logPath: '/old/logs' }))
    setLogPath(null)
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string)
    expect(written).not.toHaveProperty('logPath')
  })
})
