/**
 * Tests for shared IPC channel definitions.
 */
import { IPC_CHANNELS } from '../ipc/ipc.types'

describe('IPC_CHANNELS', () => {
  it('all channel names are unique strings', () => {
    const values = Object.values(IPC_CHANNELS)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('channels follow namespace:action convention', () => {
    for (const channel of Object.values(IPC_CHANNELS)) {
      expect(channel).toMatch(/^[a-z]+:[a-zA-Z]+$/)
    }
  })

  it('board channels include expected operations', () => {
    expect(IPC_CHANNELS.BOARDS_GET_ALL).toBe('boards:getAll')
    expect(IPC_CHANNELS.BOARDS_ADD).toBe('boards:add')
    expect(IPC_CHANNELS.BOARDS_UPDATE).toBe('boards:update')
    expect(IPC_CHANNELS.BOARDS_DELETE).toBe('boards:delete')
  })

  it('analytics channels are defined', () => {
    expect(IPC_CHANNELS.ANALYTICS_COLUMN_COUNTS).toBeDefined()
    expect(IPC_CHANNELS.ANALYTICS_WEEKLY_USER_STATS).toBeDefined()
    expect(IPC_CHANNELS.ANALYTICS_LABEL_USER_STATS).toBeDefined()
    expect(IPC_CHANNELS.ANALYTICS_CARD_AGE).toBeDefined()
  })

  it('ticket channels are defined', () => {
    expect(IPC_CHANNELS.TICKETS_GET_CONFIG).toBeDefined()
    expect(IPC_CHANNELS.TICKETS_PREVIEW_UNNUMBERED).toBeDefined()
    expect(IPC_CHANNELS.TICKETS_APPLY_NUMBERING).toBeDefined()
    expect(IPC_CHANNELS.TICKETS_UPDATE_CONFIG).toBeDefined()
  })
})
