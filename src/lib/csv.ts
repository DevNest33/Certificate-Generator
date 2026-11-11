import Papa from 'papaparse'
import type { FieldId, FieldValues, Preset, Recipient } from '../types'
import { parseDate, type DateOrder } from './dates'
import { columnsFor, createRecipient, normalizeHeader, variableFields, type ColumnSpec } from './recipients'

export type ColumnMapping = Record<FieldId, string>

export interface ParsedCsv {
  fileName: string
  headers: string[]
  rows: Record<string, string>[]
  problems: string[]
}

const MAX_FILE_BYTES = 20 * 1024 * 1024

interface PapaLike {
  meta: { fields?: string[] }
  data: Record<string, string>[]
  errors: { row?: number; message: string }[]
}

function toParsed(fileName: string, results: PapaLike): ParsedCsv {
  const headers = (results.meta.fields ?? []).filter(Boolean)
  if (!headers.length) throw new Error('No header row was found. The first line must contain the column names.')
  if (!results.data.length) throw new Error('The data has a header row but no recipient rows.')
  const problems = results.errors
    .slice(0, 5)
    .map((e) => (typeof e.row === 'number' ? `Line ${e.row + 2}: ${e.message}` : e.message))
  if (results.errors.length > 5) problems.push(`…and ${results.errors.length - 5} more`)
  return { fileName, headers, rows: results.data, problems }
}

const PARSE_OPTIONS = {
  header: true as const,
  skipEmptyLines: 'greedy' as const,
  transformHeader: (header: string) => header.replace(/^\uFEFF/, '').trim(),
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  if (file.size === 0) return Promise.reject(new Error('This file is empty.'))
  if (file.size > MAX_FILE_BYTES) return Promise.reject(new Error('This file is larger than 20 MB.'))
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      ...PARSE_OPTIONS,
      complete: (results) => {
        try {
          resolve(toParsed(file.name, results as unknown as PapaLike))
        } catch (error) {
          reject(error as Error)
        }
      },
      error: (error) => reject(new Error(`The file could not be read: ${error.message}`)),
    })
  })
}

/**
 * Parses pasted text. Papaparse detects the delimiter, so a block copied out of
 * Excel or Sheets (tab separated) works as well as comma separated text.
 */
export function parseCsvText(text: string, label = 'pasted data'): ParsedCsv {
  if (!text.trim()) throw new Error('Nothing was pasted.')
  const results = Papa.parse<Record<string, string>>(text.trim(), PARSE_OPTIONS)
  return toParsed(label, results as unknown as PapaLike)
}

/** Matches headers to the preset's variable fields by name, ignoring case, spaces and punctuation. */
export function autoMapColumns(headers: string[], columns: ColumnSpec[]): ColumnMapping {
  const used = new Set<string>()
  const mapping: ColumnMapping = {}
  for (const column of columns) {
    const match = headers.find((header) => {
      const normalized = normalizeHeader(header)
      return !used.has(header) && (normalized === normalizeHeader(column.label) || column.aliases.includes(normalized))
    })
    mapping[column.key] = match ?? ''
    if (match) used.add(match)
  }
  return mapping
}

/** Headers that match none of the preset's variable fields, so the user can see what was ignored. */
export function unmappedHeaders(headers: string[], mapping: ColumnMapping): string[] {
  const used = new Set(Object.values(mapping).filter(Boolean))
  return headers.filter((h) => !used.has(h))
}

/** Invalid dates are kept as typed so validation can point them out. */
export function rowToRecipient(
  preset: Preset,
  row: Record<string, string>,
  mapping: ColumnMapping,
  order: DateOrder,
): Recipient {
  const values: FieldValues = {}
  for (const spec of variableFields(preset)) {
    const header = mapping[spec.id]
    const raw = header ? String(row[header] ?? '').trim() : ''
    values[spec.id] = spec.kind === 'date' && raw ? (parseDate(raw, order) ?? raw) : raw
  }
  return createRecipient(preset, values)
}

export function sampleCsvBlob(preset: Preset): Blob {
  const columns = columnsFor(preset)
  const samples = preset.samples ?? []
  const csv = Papa.unparse({
    fields: columns.map((c) => c.label),
    data: (samples.length ? samples : [{}]).map((row) => columns.map((c) => row[c.key] ?? '')),
  })
  // The byte-order mark makes Excel open the file as UTF-8.
  return new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
}
