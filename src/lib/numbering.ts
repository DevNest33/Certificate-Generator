import type { Recipient } from '../types'

export const CODE_LENGTH = 8
export const EXAMPLE_CODE = 'fd823741'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** Certificate numbers are compared case-insensitively and ignoring surrounding spaces. */
export function numberKey(value: string): string {
  return value.trim().toLowerCase()
}

function takenNumbers(recipients: Recipient[]): Set<string> {
  return new Set(recipients.map((r) => numberKey(r.certificateNumber)).filter(Boolean))
}

/** An 8-character code of lowercase letters and digits, not already present in `taken`. */
export function randomCertificateNumber(taken: Set<string>): string {
  const bytes = new Uint8Array(CODE_LENGTH)
  for (let attempt = 0; attempt < 32; attempt++) {
    crypto.getRandomValues(bytes)
    let code = ''
    for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length]
    const key = numberKey(code)
    if (!taken.has(key)) {
      taken.add(key)
      return code
    }
  }
  throw new Error('Could not generate a unique certificate number.')
}

export function nextFreeNumber(recipients: Recipient[]): string {
  return randomCertificateNumber(takenNumbers(recipients))
}

/** Numbers only the recipients without a certificate number. Existing numbers are kept. */
export function fillMissingNumbers(recipients: Recipient[]): { recipients: Recipient[]; filled: number } {
  const taken = takenNumbers(recipients)
  let filled = 0
  const result = recipients.map((r) => {
    if (r.certificateNumber.trim()) return r
    filled++
    return { ...r, certificateNumber: randomCertificateNumber(taken) }
  })
  return { recipients: result, filled }
}

/** Replaces every certificate number with a new random code. */
export function renumberAll(recipients: Recipient[]): Recipient[] {
  const taken = new Set<string>()
  return recipients.map((r) => ({ ...r, certificateNumber: randomCertificateNumber(taken) }))
}
