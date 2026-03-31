/**
 * 8-bit Mario coin–style sound generated with the Web Audio API.
 *
 * No external sound file required — the tone is synthesised on the fly using
 * two short square-wave oscillator bursts (B5 → E6), similar to the classic
 * Super Mario Bros. coin-collect jingle.
 */

const SOUND_PREF_KEY = 'agile-life-sound-effects-enabled'
const SOUND_VOLUME_KEY = 'agile-life-sound-volume'

/** Returns true when the user has NOT disabled sound effects. */
export function isSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(SOUND_PREF_KEY)
    // Default is enabled (null means never set)
    return stored !== 'false'
  } catch {
    return true
  }
}

/** Persists the user's sound-effects preference. */
export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_PREF_KEY, String(enabled))
  } catch {
    // ignore – localStorage unavailable in some sandboxed contexts
  }
}

/**
 * Returns the current sound volume as a value between 0 and 1.
 * Defaults to 0.5 when not set.
 */
export function getSoundVolume(): number {
  try {
    const stored = localStorage.getItem(SOUND_VOLUME_KEY)
    if (stored === null) return 0.5
    const parsed = parseFloat(stored)
    return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed))
  } catch {
    return 0.5
  }
}

/** Persists the user's preferred sound volume (0–1). */
export function setSoundVolume(volume: number): void {
  try {
    localStorage.setItem(SOUND_VOLUME_KEY, String(Math.max(0, Math.min(1, volume))))
  } catch {
    // ignore – localStorage unavailable in some sandboxed contexts
  }
}

/** Lazily-created AudioContext, shared across all coin-sound invocations. */
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext()
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Plays a short 8-bit coin sound if the user hasn't disabled sound effects.
 *
 * The sound is two square-wave tones in quick succession:
 *   • B5 (987.77 Hz) for 60 ms
 *   • E6 (1318.51 Hz) for 130 ms
 */
export function playCoinSound(): void {
  if (!isSoundEnabled()) return

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    // Resume suspended context (browsers suspend AudioContext until a user gesture).
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    // Scale the master gain by the user's volume preference (0.25 at max volume)
    const volume = getSoundVolume()
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.25 * volume, ctx.currentTime)
    masterGain.connect(ctx.destination)

    const scheduleTone = (frequency: number, startOffset: number, duration: number): void => {
      const osc = ctx.createOscillator()
      const envGain = ctx.createGain()

      osc.type = 'square'
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset)

      // Short fade-out at the end of each tone to remove clicks
      envGain.gain.setValueAtTime(1, ctx.currentTime + startOffset)
      envGain.gain.linearRampToValueAtTime(0, ctx.currentTime + startOffset + duration)

      osc.connect(envGain)
      envGain.connect(masterGain)

      osc.start(ctx.currentTime + startOffset)
      osc.stop(ctx.currentTime + startOffset + duration)
    }

    scheduleTone(987.77, 0, 0.06) // B5
    scheduleTone(1318.51, 0.06, 0.13) // E6

    // Disconnect the master gain node after the sound finishes to free resources
    setTimeout(() => masterGain.disconnect(), 250)
  } catch {
    // Audio context not available in this environment — silently ignore
  }
}

/**
 * Plays an 8-bit JRPG level-up fanfare when the user beats their previous week's score.
 *
 * Five ascending square-wave tones in a pentatonic pattern inspired by classic
 * old-school RPG level-up jingles (e.g. Final Fantasy, Dragon Quest):
 *   E5 → G5 → B5 → E6 → G6 (longer final note)
 */
export function playLevelUpSound(): void {
  if (!isSoundEnabled()) return

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const volume = getSoundVolume()
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.3 * volume, ctx.currentTime)
    masterGain.connect(ctx.destination)

    const scheduleTone = (frequency: number, startOffset: number, duration: number): void => {
      const osc = ctx.createOscillator()
      const envGain = ctx.createGain()

      osc.type = 'square'
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset)

      envGain.gain.setValueAtTime(0.8, ctx.currentTime + startOffset)
      envGain.gain.linearRampToValueAtTime(0, ctx.currentTime + startOffset + duration)

      osc.connect(envGain)
      envGain.connect(masterGain)

      osc.start(ctx.currentTime + startOffset)
      osc.stop(ctx.currentTime + startOffset + duration)
    }

    // Ascending pentatonic fanfare: E5 → G5 → B5 → E6 → G6
    scheduleTone(659.25, 0.0, 0.07) // E5
    scheduleTone(783.99, 0.07, 0.07) // G5
    scheduleTone(987.77, 0.14, 0.07) // B5
    scheduleTone(1318.51, 0.21, 0.09) // E6
    scheduleTone(1567.98, 0.3, 0.25) // G6 (longer final note)

    setTimeout(() => masterGain.disconnect(), 700)
  } catch {
    // Audio context not available in this environment — silently ignore
  }
}
