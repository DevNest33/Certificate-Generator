import type {
  DateFormat,
  FieldId,
  FieldSpec,
  FieldValues,
  Preset,
  Recipient,
  ValidationIssue,
} from '../types'
import { formatDate, isValidIsoDate } from './dates'

export interface ColumnSpec {
  key: FieldId
  label: string
  /** Normalized header names recognised during CSV import. */
  aliases: string[]
}

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Fields whose value comes from the imported data, in preset order. */
export function variableFields(preset: Preset): FieldSpec[] {
  return preset.fields.filter((f) => f.source === 'variable')
}

/** The columns a batch for this preset is expected to supply. */
export function columnsFor(preset: Preset): ColumnSpec[] {
  return variableFields(preset).map((f) => ({
    key: f.id,
    label: f.name,
    aliases: [normalizeHeader(f.id), ...(f.aliases ?? [])],
  }))
}

export function createRecipient(preset: Preset, values: FieldValues = {}): Recipient {
  const blank: FieldValues = {}
  for (const field of variableFields(preset)) blank[field.id] = ''
  return { id: newId(), values: { ...blank, ...values } }
}

/** A bare number such as "6" is shown as "6 hours". */
export function formatDuration(raw: string): string {
  const value = raw.trim()
  if (/^\d+(\.\d+)?$/.test(value)) return `${value} ${Number(value) === 1 ? 'hour' : 'hours'}`
  return value
}

function formatValue(spec: FieldSpec, raw: string, dateFormat: DateFormat): string {
  const value = raw.trim()
  if (!value) return ''
  if (spec.kind === 'date') return formatDate(value, dateFormat)
  if (spec.kind === 'duration') return formatDuration(value)
  return value
}

function withLabel(spec: FieldSpec, value: string): string {
  if (!spec.drawnLabel || !value) return value
  return `${spec.drawnLabel} ${value}`
}

/** Turns the drawn placeholder back into the raw value the editor edits. */
export function stripDrawnLabel(spec: FieldSpec | undefined, drawn: string): string {
  if (!spec?.drawnLabel) return drawn
  for (const prefix of [`${spec.drawnLabel}\n`, `${spec.drawnLabel} `]) {
    if (drawn.startsWith(prefix)) return drawn.slice(prefix.length)
  }
  return drawn
}

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g
/** `[[ ... ]]` marks a stretch of text that only prints when every field it names has a value. */
const OPTIONAL = /\[\[(.*?)\]\]/g

/**
 * Fills `{fieldId}` placeholders from already-formatted values.
 *
 * Text inside `[[ ... ]]` is dropped whole when any field it names is blank, so a missing
 * value takes its own clause with it instead of leaving a dangling phrase. Segments do not nest.
 */
export function interpolate(pattern: string, values: FieldValues): string {
  const resolved = pattern.replace(OPTIONAL, (_, segment: string) => {
    const ids = Array.from(segment.matchAll(PLACEHOLDER), (m) => m[1])
    return ids.every((id) => (values[id] ?? '').trim()) ? segment : ''
  })
  return resolved.replace(PLACEHOLDER, (_, id: string) => values[id] ?? '')
}

/**
 * Text drawn for each field of `preset`.
 * Without a recipient the preview shows bracketed placeholders for the variable fields.
 */
export function certificateValues(
  preset: Preset,
  recipient: Recipient | null,
  dateFormat: DateFormat,
): FieldValues {
  // Pass one: everything that does not depend on another field.
  const formatted: FieldValues = {}
  for (const spec of preset.fields) {
    if (spec.source === 'template') continue
    if (spec.source === 'fixed') {
      formatted[spec.id] = formatValue(spec, spec.value ?? '', dateFormat)
      continue
    }
    if (recipient) {
      formatted[spec.id] = formatValue(spec, recipient.values[spec.id] ?? '', dateFormat)
    } else {
      formatted[spec.id] = `[${spec.placeholder ?? spec.name}]`
    }
  }
  // Pass two: templates read the formatted values of the fields they name.
  for (const spec of preset.fields) {
    if (spec.source === 'template') formatted[spec.id] = interpolate(spec.pattern ?? '', formatted)
  }
  // Labels are part of the drawn text, not of the value a template interpolates.
  const drawn: FieldValues = {}
  for (const spec of preset.fields) drawn[spec.id] = withLabel(spec, formatted[spec.id] ?? '')
  return drawn
}

/** For each field marked unique, the values used by more than one certificate. */
export function duplicateValues(preset: Preset, recipients: Recipient[]): Map<FieldId, Set<string>> {
  const result = new Map<FieldId, Set<string>>()
  for (const spec of preset.fields) {
    if (!spec.unique || spec.source !== 'variable') continue
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const r of recipients) {
      const key = (r.values[spec.id] ?? '').trim().toLowerCase()
      if (!key) continue
      if (seen.has(key)) duplicates.add(key)
      seen.add(key)
    }
    result.set(spec.id, duplicates)
  }
  return result
}

/** Errors block export of that certificate; warnings point out fields that will print empty. */
export function validateRecipient(
  preset: Preset,
  recipient: Recipient,
  duplicates: Map<FieldId, Set<string>>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const spec of variableFields(preset)) {
    const raw = (recipient.values[spec.id] ?? '').trim()
    if (!raw) {
      issues.push({
        field: spec.id,
        level: spec.required ? 'error' : 'warning',
        message: spec.required ? `${spec.name} is missing` : `${spec.name} is empty`,
      })
      continue
    }
    if (spec.kind === 'date' && !isValidIsoDate(raw)) {
      issues.push({ field: spec.id, level: 'error', message: `"${raw}" is not a valid ${spec.name.toLowerCase()}` })
    }
    if (spec.unique && duplicates.get(spec.id)?.has(raw.toLowerCase())) {
      issues.push({ field: spec.id, level: 'error', message: `${spec.name} ${raw} is used more than once` })
    }
  }
  return issues
}

export function validateAll(preset: Preset, recipients: Recipient[]): Map<string, ValidationIssue[]> {
  const duplicates = duplicateValues(preset, recipients)
  const result = new Map<string, ValidationIssue[]>()
  for (const r of recipients) {
    const issues = validateRecipient(preset, r, duplicates)
    if (issues.length) result.set(r.id, issues)
  }
  return result
}

export function countIssues(issues: Map<string, ValidationIssue[]>) {
  let errors = 0
  let warnings = 0
  for (const list of issues.values()) {
    if (list.some((i) => i.level === 'error')) errors++
    else warnings++
  }
  return { errors, warnings }
}

/** The preset's demo rows, as recipients. */
export function sampleRecipients(preset: Preset): Recipient[] {
  return (preset.samples ?? []).map((values) => createRecipient(preset, values))
}

/** First non-empty variable value, used to label a row in lists. */
export function recipientLabel(preset: Preset, recipient: Recipient): string {
  for (const spec of variableFields(preset)) {
    const value = (recipient.values[spec.id] ?? '').trim()
    if (value) return value
  }
  return 'Untitled'
}
