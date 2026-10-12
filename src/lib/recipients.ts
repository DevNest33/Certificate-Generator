import type { DateFormat, FieldId, FieldValues, Recipient, RecipientTextKey, ValidationIssue } from '../types'
import { formatDate, isValidIsoDate } from './dates'
import { EXAMPLE_CODE, numberKey } from './numbering'

export type ImportField = RecipientTextKey | 'issueDate'

export interface ColumnSpec {
  key: ImportField
  label: string
  /** Normalized header names recognised during CSV import. */
  aliases: string[]
}

export const COLUMNS: ColumnSpec[] = [
  {
    key: 'recipientName',
    label: 'Recipient Name',
    aliases: ['recipientname', 'name', 'fullname', 'recipient', 'studentname', 'participantname', 'participant'],
  },
  { key: 'courseName', label: 'Course Name', aliases: ['coursename', 'course', 'coursetitle', 'title', 'program'] },
  {
    key: 'courseStartDate',
    label: 'Course Start Date',
    aliases: ['coursestartdate', 'startdate', 'start', 'coursestart', 'datestarted'],
  },
  {
    key: 'certificateNumber',
    label: 'Certificate Number',
    aliases: ['certificatenumber', 'certificateno', 'certno', 'certificateid', 'certid', 'certifiedno', 'number', 'serial'],
  },
  { key: 'courseDuration', label: 'Course Duration', aliases: ['courseduration', 'duration', 'hours', 'length'] },
  { key: 'issueDate', label: 'Issue Date', aliases: ['issuedate', 'dateofissue', 'issued', 'issuedon', 'date'] },
]

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createRecipient(values: Partial<Omit<Recipient, 'id'>> = {}): Recipient {
  return {
    id: newId(),
    recipientName: '',
    courseName: '',
    courseStartDate: '',
    certificateNumber: '',
    courseDuration: '',
    issueDateOverride: null,
    ...values,
  }
}

/** A bare number such as "6" is shown as "6 hours". */
export function formatDuration(raw: string): string {
  const value = raw.trim()
  if (/^\d+(\.\d+)?$/.test(value)) return `${value} ${Number(value) === 1 ? 'hour' : 'hours'}`
  return value
}

export function effectiveIssueDate(recipient: Recipient, globalIssueDate: string): string {
  return recipient.issueDateOverride ?? globalIssueDate
}

/**
 * The new template does not print these labels, so the drawn line includes them.
 * The editor still edits the raw value; `stripDrawnLabel` turns the drawn placeholder back into one.
 */
const DRAWN_LABEL: Partial<Record<FieldId, string>> = {
  courseStartDate: 'Course Start Date:',
  certificateNumber: 'Certificate Number:',
  courseDuration: 'Course Duration:',
}

function drawLabeled(id: FieldId, value: string): string {
  const label = DRAWN_LABEL[id]
  if (!label || !value) return value
  // The number sits on its own line under the label, as on the reference certificate.
  return id === 'certificateNumber' ? `${label}\n${value}` : `${label} ${value}`
}

export function stripDrawnLabel(id: FieldId, drawn: string): string {
  const label = DRAWN_LABEL[id]
  if (!label) return drawn
  for (const prefix of [`${label}\n`, `${label} `]) {
    if (drawn.startsWith(prefix)) return drawn.slice(prefix.length)
  }
  return drawn
}

/** Text drawn for each field. Without a recipient the preview shows placeholders. An empty field draws nothing. */
export function certificateValues(
  recipient: Recipient | null,
  globalIssueDate: string,
  dateFormat: DateFormat,
): FieldValues {
  const datePlaceholder = `[${dateFormat}]`
  if (!recipient) {
    return {
      recipientName: '[Recipient Name]',
      courseName: '[Course Name]',
      courseStartDate: drawLabeled('courseStartDate', datePlaceholder),
      certificateNumber: drawLabeled('certificateNumber', `[${EXAMPLE_CODE}]`),
      courseDuration: drawLabeled('courseDuration', '[X hours]'),
      issueDate: globalIssueDate ? formatDate(globalIssueDate, dateFormat) : datePlaceholder,
    }
  }
  const issueDate = effectiveIssueDate(recipient, globalIssueDate)
  return {
    recipientName: recipient.recipientName.trim(),
    courseName: recipient.courseName.trim(),
    courseStartDate: drawLabeled(
      'courseStartDate',
      recipient.courseStartDate ? formatDate(recipient.courseStartDate, dateFormat) : '',
    ),
    certificateNumber: drawLabeled('certificateNumber', recipient.certificateNumber.trim()),
    courseDuration: drawLabeled('courseDuration', formatDuration(recipient.courseDuration)),
    issueDate: issueDate ? formatDate(issueDate, dateFormat) : '',
  }
}

export function duplicateNumbers(recipients: Recipient[]): Set<string> {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const r of recipients) {
    const key = numberKey(r.certificateNumber)
    if (!key) continue
    if (seen.has(key)) duplicates.add(key)
    seen.add(key)
  }
  return duplicates
}

/** Errors block export of that certificate; warnings point out fields that will print empty. */
export function validateRecipient(
  recipient: Recipient,
  duplicates: Set<string>,
  globalIssueDate: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!recipient.recipientName.trim()) {
    issues.push({ field: 'recipientName', level: 'error', message: 'Recipient name is missing' })
  }
  if (!recipient.courseName.trim()) {
    issues.push({ field: 'courseName', level: 'warning', message: 'Course name is empty' })
  }
  if (!recipient.courseStartDate.trim()) {
    issues.push({ field: 'courseStartDate', level: 'warning', message: 'Course start date is empty' })
  } else if (!isValidIsoDate(recipient.courseStartDate)) {
    issues.push({
      field: 'courseStartDate',
      level: 'error',
      message: `"${recipient.courseStartDate}" is not a valid start date`,
    })
  }
  const number = numberKey(recipient.certificateNumber)
  if (!number) {
    issues.push({ field: 'certificateNumber', level: 'warning', message: 'Certificate number is empty' })
  } else if (duplicates.has(number)) {
    issues.push({
      field: 'certificateNumber',
      level: 'error',
      message: `Certificate number ${recipient.certificateNumber.trim()} is used more than once`,
    })
  }
  if (!recipient.courseDuration.trim()) {
    issues.push({ field: 'courseDuration', level: 'warning', message: 'Course duration is empty' })
  }
  const issueDate = effectiveIssueDate(recipient, globalIssueDate)
  if (!isValidIsoDate(issueDate)) {
    issues.push({
      field: 'issueDate',
      level: 'error',
      message:
        recipient.issueDateOverride === null
          ? 'The global issue date is not set'
          : `"${recipient.issueDateOverride}" is not a valid issue date`,
    })
  }
  return issues
}

export function validateAll(recipients: Recipient[], globalIssueDate: string): Map<string, ValidationIssue[]> {
  const duplicates = duplicateNumbers(recipients)
  const result = new Map<string, ValidationIssue[]>()
  for (const r of recipients) {
    const issues = validateRecipient(r, duplicates, globalIssueDate)
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

export const SAMPLE_RECIPIENTS: Omit<Recipient, 'id'>[] = [
  {
    recipientName: 'Syed Rushda',
    courseName: 'Receiver basics in Analog Communication',
    courseStartDate: '2026-04-23',
    certificateNumber: 'fd823741',
    courseDuration: '1 hour',
    issueDateOverride: null,
  },
  {
    recipientName: 'Aarav Mehta',
    courseName: 'Introduction to Digital Signal Processing',
    courseStartDate: '2026-05-04',
    certificateNumber: 'k7m2p9qx',
    courseDuration: '6 hours',
    issueDateOverride: null,
  },
  {
    recipientName: 'Fatima Khan',
    courseName: 'Fundamentals of Embedded Systems with Arduino',
    courseStartDate: '2026-05-11',
    certificateNumber: 'a4n8c1wd',
    courseDuration: '12 hours',
    issueDateOverride: null,
  },
  {
    recipientName: "Daniel O'Connor",
    courseName: 'Wireless Communication Systems and Antenna Design Principles for Modern Networks',
    courseStartDate: '2026-06-01',
    certificateNumber: 'h3r6t0yb',
    courseDuration: '8 hours',
    issueDateOverride: null,
  },
  {
    recipientName: 'Priya Raghavan',
    courseName: 'Python for Data Analysis',
    courseStartDate: '2026-06-15',
    certificateNumber: '',
    courseDuration: '4',
    issueDateOverride: null,
  },
]
