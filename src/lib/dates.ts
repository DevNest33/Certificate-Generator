import type { DateFormat } from '../types'

export const DATE_FORMATS: { value: DateFormat; example: string }[] = [
  { value: 'YYYY-MM-DD', example: '2026-04-29' },
  { value: 'DD-MM-YYYY', example: '29-04-2026' },
  { value: 'DD/MM/YYYY', example: '29/04/2026' },
  { value: 'MM/DD/YYYY', example: '04/29/2026' },
  { value: 'D MMMM YYYY', example: '29 April 2026' },
  { value: 'MMMM D, YYYY', example: 'April 29, 2026' },
]

/** Order of day, month and year in imported dates that are not ISO formatted. */
export type DateOrder = 'YMD' | 'DMY' | 'MDY'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const pad = (n: number) => String(n).padStart(2, '0')

function buildIso(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  const valid =
    year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return valid ? `${year}-${pad(month)}-${pad(day)}` : null
}

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return !!match && buildIso(Number(match[1]), Number(match[2]), Number(match[3])) === value
}

/**
 * Input type for editing a stored date, chosen by shape rather than validity: while a year is typed, the native
 * input reports values like 0002-04-23 or 20261-04-23, and swapping it for a text box mid-entry scrambles the date.
 */
export function dateInputType(value: string): 'date' | 'text' {
  return value === '' || /^\d{4,}-\d{2}-\d{2}$/.test(value) ? 'date' : 'text'
}

export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Formats an ISO date for display. Values that are not valid ISO dates are returned unchanged. */
export function formatDate(iso: string, format: DateFormat): string {
  if (!isValidIsoDate(iso)) return iso
  const [y, m, d] = iso.split('-')
  const month = MONTHS[Number(m) - 1]
  switch (format) {
    case 'YYYY-MM-DD':
      return iso
    case 'DD-MM-YYYY':
      return `${d}-${m}-${y}`
    case 'DD/MM/YYYY':
      return `${d}/${m}/${y}`
    case 'MM/DD/YYYY':
      return `${m}/${d}/${y}`
    case 'D MMMM YYYY':
      return `${Number(d)} ${month} ${y}`
    case 'MMMM D, YYYY':
      return `${month} ${Number(d)}, ${y}`
  }
}

/**
 * Converts a typed or imported date to ISO. ISO input (optionally with a time) is always accepted;
 * numeric dates such as 23/04/2026 are read in `order`, and dates with month names are parsed by the browser.
 * Returns '' for empty input and null when the value is not a real date.
 */
export function parseDate(raw: string, order: DateOrder = 'YMD'): string | null {
  const value = raw.trim()
  if (!value) return ''

  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(value)
  if (iso) return buildIso(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const numeric = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(value)
  if (numeric) {
    const [a, b, year] = [Number(numeric[1]), Number(numeric[2]), Number(numeric[3])]
    if (order === 'DMY') return buildIso(year, b, a)
    if (order === 'MDY') return buildIso(year, a, b)
    return null
  }

  if (/[a-z]/i.test(value)) {
    const time = Date.parse(value)
    if (Number.isNaN(time)) return null
    const date = new Date(time)
    return buildIso(date.getFullYear(), date.getMonth() + 1, date.getDate())
  }
  return null
}
