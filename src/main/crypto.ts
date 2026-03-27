import { safeStorage } from 'electron'

const ENC_PREFIX = 'enc:'

/**
 * Encrypts a plaintext credential string using Electron's OS-level safeStorage.
 * Returns a prefixed base64 string.  Falls back to plaintext if encryption is
 * unavailable on this platform.
 */
export function encryptCredential(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) return plaintext
  return ENC_PREFIX + safeStorage.encryptString(plaintext).toString('base64')
}

/**
 * Decrypts a credential that was encrypted by encryptCredential.
 * Strings without the prefix are returned as-is so that credentials stored
 * before encryption was introduced continue to work (migration passthrough).
 */
export function decryptCredential(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) return value
  const buf = Buffer.from(value.slice(ENC_PREFIX.length), 'base64')
  return safeStorage.decryptString(buf)
}
