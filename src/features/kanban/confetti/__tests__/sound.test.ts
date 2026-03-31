/**
 * Tests for sound.ts — localStorage preference helpers and playCoinSound.
 *
 * Since Jest runs in a Node.js environment, browser globals (localStorage,
 * AudioContext) are absent. We set up lightweight mocks so the happy-path
 * code is executed in addition to the catch-path fallbacks.
 */

// ── localStorage mock ──────────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: jest.fn((key: string) => localStorageStore[key] ?? null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageStore[key] = value
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageStore[key]
  }),
  clear: jest.fn(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  })
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// ── AudioContext mock ──────────────────────────────────────────────────────────

const mockDisconnect = jest.fn()
const mockConnect = jest.fn()
const mockSetValueAtTime = jest.fn()
const mockLinearRampToValueAtTime = jest.fn()
const mockStart = jest.fn()
const mockStop = jest.fn()

const mockOscillator = {
  type: '',
  frequency: { setValueAtTime: mockSetValueAtTime },
  connect: mockConnect,
  start: mockStart,
  stop: mockStop
}

const mockEnvGain = {
  gain: {
    setValueAtTime: mockSetValueAtTime,
    linearRampToValueAtTime: mockLinearRampToValueAtTime
  },
  connect: mockConnect
}

const mockMasterGain = {
  gain: { setValueAtTime: mockSetValueAtTime },
  connect: mockConnect,
  disconnect: mockDisconnect
}

const mockAudioContext = {
  state: 'running' as AudioContext['state'],
  currentTime: 0,
  destination: {},
  createGain: jest.fn(() => mockMasterGain),
  createOscillator: jest.fn(() => mockOscillator),
  resume: jest.fn()
}

Object.defineProperty(global, 'AudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
})

// ── Import after mocks are set up ──────────────────────────────────────────────

import {
  isSoundEnabled,
  setSoundEnabled,
  getSoundVolume,
  setSoundVolume,
  playCoinSound
} from '../sound'

// ── Helpers ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  localStorageMock.clear()
  // Reset AudioContext state mock
  mockAudioContext.state = 'running'
  // Reset createGain to return mockMasterGain then mockEnvGain alternately
  mockAudioContext.createGain.mockReturnValue(mockMasterGain)
  mockAudioContext.createOscillator.mockReturnValue(mockOscillator)
})

// ── isSoundEnabled ─────────────────────────────────────────────────────────────

describe('isSoundEnabled', () => {
  it('returns true when localStorage has no stored value (default)', () => {
    expect(isSoundEnabled()).toBe(true)
  })

  it('returns true when stored value is not "false"', () => {
    localStorageStore['agile-life-sound-effects-enabled'] = 'true'
    expect(isSoundEnabled()).toBe(true)
  })

  it('returns false when stored value is "false"', () => {
    localStorageStore['agile-life-sound-effects-enabled'] = 'false'
    expect(isSoundEnabled()).toBe(false)
  })

  it('returns true when localStorage.getItem throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    expect(isSoundEnabled()).toBe(true)
  })
})

// ── setSoundEnabled ────────────────────────────────────────────────────────────

describe('setSoundEnabled', () => {
  it('persists "false" when disabled', () => {
    setSoundEnabled(false)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'agile-life-sound-effects-enabled',
      'false'
    )
  })

  it('persists "true" when enabled', () => {
    setSoundEnabled(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'agile-life-sound-effects-enabled',
      'true'
    )
  })

  it('does not throw when localStorage.setItem throws', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    expect(() => setSoundEnabled(true)).not.toThrow()
  })
})

// ── getSoundVolume ─────────────────────────────────────────────────────────────

describe('getSoundVolume', () => {
  it('returns 0.5 when no value is stored', () => {
    expect(getSoundVolume()).toBe(0.5)
  })

  it('returns the stored numeric value', () => {
    localStorageStore['agile-life-sound-volume'] = '0.8'
    expect(getSoundVolume()).toBe(0.8)
  })

  it('clamps values above 1 to 1', () => {
    localStorageStore['agile-life-sound-volume'] = '1.5'
    expect(getSoundVolume()).toBe(1)
  })

  it('clamps values below 0 to 0', () => {
    localStorageStore['agile-life-sound-volume'] = '-0.5'
    expect(getSoundVolume()).toBe(0)
  })

  it('returns 0.5 for NaN values', () => {
    localStorageStore['agile-life-sound-volume'] = 'not-a-number'
    expect(getSoundVolume()).toBe(0.5)
  })

  it('returns 0.5 when localStorage.getItem throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    expect(getSoundVolume()).toBe(0.5)
  })
})

// ── setSoundVolume ─────────────────────────────────────────────────────────────

describe('setSoundVolume', () => {
  it('persists the given volume clamped to 0–1', () => {
    setSoundVolume(0.75)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('agile-life-sound-volume', '0.75')
  })

  it('clamps values above 1 to 1 before persisting', () => {
    setSoundVolume(2)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('agile-life-sound-volume', '1')
  })

  it('clamps values below 0 to 0 before persisting', () => {
    setSoundVolume(-1)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('agile-life-sound-volume', '0')
  })

  it('does not throw when localStorage.setItem throws', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    expect(() => setSoundVolume(0.5)).not.toThrow()
  })
})

// ── playCoinSound ──────────────────────────────────────────────────────────────

describe('playCoinSound', () => {
  it('does nothing when sound is disabled', () => {
    localStorageStore['agile-life-sound-effects-enabled'] = 'false'
    playCoinSound()
    expect(mockAudioContext.createGain).not.toHaveBeenCalled()
  })

  it('plays sound when sound is enabled and AudioContext is available', () => {
    localStorageStore['agile-life-sound-effects-enabled'] = 'true'
    // Make createGain return different objects for master and env gains
    let gainCallCount = 0
    mockAudioContext.createGain.mockImplementation(() => {
      gainCallCount++
      return gainCallCount === 1 ? mockMasterGain : mockEnvGain
    })
    mockAudioContext.createOscillator.mockReturnValue(mockOscillator)
    playCoinSound()
    expect(mockAudioContext.createGain).toHaveBeenCalled()
  })

  it('resumes a suspended AudioContext before playing', () => {
    localStorageStore['agile-life-sound-effects-enabled'] = 'true'
    mockAudioContext.state = 'suspended'
    mockAudioContext.createGain.mockReturnValue(mockMasterGain)
    mockAudioContext.createOscillator.mockReturnValue(mockOscillator)
    playCoinSound()
    expect(mockAudioContext.resume).toHaveBeenCalled()
  })

  it('does not throw when AudioContext is unavailable', () => {
    localStorageStore['agile-life-sound-effects-enabled'] = 'true'
    const OrigAudioContext = (global as Record<string, unknown>).AudioContext
    delete (global as Record<string, unknown>).AudioContext
    expect(() => playCoinSound()).not.toThrow()
    ;(global as Record<string, unknown>).AudioContext = OrigAudioContext
  })
})
