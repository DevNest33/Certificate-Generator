import type { FieldId, Preset, Recipient } from '../types'

export const CODE_LENGTH = 8
export const EXAMPLE_CODE = 'fd823741'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** Certificate numbers are compared case-insensitively and ignoring surrounding spaces. */
export function numberKey(value: string): string {
  return value.trim().toLowerCase()
}

/** The field a preset auto-numbers: the first variable field marked unique. */
export function numberedField(preset: Preset): FieldId | null {
  return preset.fields.find((f) => f.source === 'variable' && f.unique)?.id ?? null
}

function takenNumbers(recipients: Recipient[], field: FieldId): Set<string> {
  return new Set(recipients.map((r) => numberKey(r.values[field] ?? '')).filter(Boolean))
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

export function nextFreeNumber(recipients: Recipient[], field: FieldId): string {
  return randomCertificateNumber(takenNumbers(recipients, field))
}

/**
 * Numbers only the recipients without a number. Existing numbers are kept.
 * Numbers are supplied with the batch data by default; this is an explicit opt-in
 * for designs where the issuer does not track them.
 */
export function fillMissingNumbers(
  recipients: Recipient[],
  field: FieldId,
): { recipients: Recipient[]; filled: number } {
  const taken = takenNumbers(recipients, field)
  let filled = 0
  const result = recipients.map((r) => {
    if ((r.values[field] ?? '').trim()) return r
    filled++
    return { ...r, values: { ...r.values, [field]: randomCertificateNumber(taken) } }
  })
  return { recipients: result, filled }
}

/** Replaces every number with a new random code. */
export function renumberAll(recipients: Recipient[], field: FieldId): Recipient[] {
  const taken = new Set<string>()
  return recipients.map((r) => ({ ...r, values: { ...r.values, [field]: randomCertificateNumber(taken) } }))
}
