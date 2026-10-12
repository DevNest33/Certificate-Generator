import Papa from 'papaparse'
import type { Recipient } from '../types'
import { parseDate, type DateOrder } from './dates'
import { COLUMNS, createRecipient, normalizeHeader, SAMPLE_RECIPIENTS, type ImportField } from './recipients'

export type ColumnMapping = Record<ImportField, string>

export interface ParsedCsv {
  fileName: string
  headers: string[]
  rows: Record<string, string>[]
  problems: string[]
}

const MAX_FILE_BYTES = 20 * 1024 * 1024

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  if (file.size === 0) return Promise.reject(new Error('This file is empty.'))
  if (file.size > MAX_FILE_BYTES) return Promise.reject(new Error('This file is larger than 20 MB.'))
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
      complete: (results) => {
        const headers = (results.meta.fields ?? []).filter(Boolean)
        if (!headers.length) {
          reject(new Error('No header row was found. The first line must contain the column names.'))
          return
        }
        if (!results.data.length) {
          reject(new Error('The file has a header row but no recipient rows.'))
          return
        }
        const problems = results.errors
          .slice(0, 5)
          .map((e) => (typeof e.row === 'number' ? `Line ${e.row + 2}: ${e.message}` : e.message))
        if (results.errors.length > 5) problems.push(`…and ${results.errors.length - 5} more`)
        resolve({ fileName: file.name, headers, rows: results.data, problems })
      },
      error: (error) => reject(new Error(`The file could not be read: ${error.message}`)),
    })
  })
}

/** Matches CSV headers to recipient fields by name, ignoring case, spaces and punctuation. */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const used = new Set<string>()
  const mapping = {} as ColumnMapping
  for (const column of COLUMNS) {
    const match = headers.find((header) => {
      const normalized = normalizeHeader(header)
      return !used.has(header) && (normalized === normalizeHeader(column.label) || column.aliases.includes(normalized))
    })
    mapping[column.key] = match ?? ''
    if (match) used.add(match)
  }
  return mapping
}

/** Invalid dates are kept as typed so validation can point them out. */
export function rowToRecipient(row: Record<string, string>, mapping: ColumnMapping, order: DateOrder): Recipient {
  const get = (key: ImportField) => (mapping[key] ? String(row[mapping[key]] ?? '').trim() : '')
  const date = (raw: string) => parseDate(raw, order) ?? raw
  const issueDate = get('issueDate')
  return createRecipient({
    recipientName: get('recipientName'),
    courseName: get('courseName'),
    courseStartDate: date(get('courseStartDate')),
    certificateNumber: get('certificateNumber'),
    courseDuration: get('courseDuration'),
    issueDateOverride: issueDate ? date(issueDate) : null,
  })
}

export function sampleCsvBlob(): Blob {
  const csv = Papa.unparse({
    fields: COLUMNS.map((c) => c.label),
    data: SAMPLE_RECIPIENTS.map((r) => [
      r.recipientName,
      r.courseName,
      r.courseStartDate,
      r.certificateNumber,
      r.courseDuration,
      r.issueDateOverride ?? '',
    ]),
  })
  // The byte-order mark makes Excel open the file as UTF-8.
  return new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
}
