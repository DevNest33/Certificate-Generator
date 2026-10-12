import { CircleAlert, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react'
import { useMemo, useRef, useState, type DragEvent } from 'react'
import { autoMapColumns, parseCsvFile, rowToRecipient, type ColumnMapping, type ParsedCsv } from '../lib/csv'
import type { DateOrder } from '../lib/dates'
import { fillMissingNumbers } from '../lib/numbering'
import { COLUMNS, validateAll } from '../lib/recipients'
import type { Recipient } from '../types'
import { Badge, Button, Field, Modal, SelectInput, Switch } from './ui'

const PREVIEW_ROWS = 50

interface Props {
  open: boolean
  existing: Recipient[]
  globalIssueDate: string
  onClose: () => void
  onImport: (recipients: Recipient[], mode: 'append' | 'replace', numbered: number) => void
  onSampleCsv: () => void
}

export function CSVImporter({ open, existing, globalIssueDate, onClose, onImport, onSampleCsv }: Props) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [dateOrder, setDateOrder] = useState<DateOrder>('YMD')
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [autoNumber, setAutoNumber] = useState(true)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const reset = () => {
    setParsed(null)
    setMapping(null)
    setError(null)
    setDragging(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setReading(true)
    try {
      const result = await parseCsvFile(file)
      setParsed(result)
      setMapping(autoMapColumns(result.headers))
      setMode(existing.length ? 'append' : 'replace')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setParsed(null)
    } finally {
      setReading(false)
    }
  }

  const prepared = useMemo(() => {
    if (!parsed || !mapping) return null
    const imported = parsed.rows.map((row) => rowToRecipient(row, mapping, dateOrder))
    const kept = mode === 'append' ? existing : []
    let numbered = 0
    let list = imported
    if (autoNumber) {
      const result = fillMissingNumbers([...kept, ...imported])
      list = result.recipients.slice(kept.length)
      numbered = result.filled
    }
    const issues = validateAll([...kept, ...list], globalIssueDate)
    let errors = 0
    let warnings = 0
    for (const r of list) {
      const rowIssues = issues.get(r.id)
      if (!rowIssues) continue
      if (rowIssues.some((i) => i.level === 'error')) errors++
      else warnings++
    }
    return { list, issues, numbered, errors, warnings }
  }, [parsed, mapping, dateOrder, mode, autoNumber, existing, globalIssueDate])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void readFile(e.dataTransfer.files[0])
  }

  const canImport = !!prepared && !!mapping?.recipientName && prepared.list.length > 0

  return (
    <Modal
      open={open}
      size={parsed ? 'xl' : 'md'}
      title="Import recipients from CSV"
      description="The file is read in this browser and never uploaded."
      onClose={close}
      footer={
        parsed ? (
          <>
            <Button variant="ghost" className="mr-auto" onClick={reset}>
              Choose another file
            </Button>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!canImport}
              onClick={() => {
                if (!prepared) return
                onImport(prepared.list, mode, prepared.numbered)
                close()
              }}
            >
              Import {prepared?.list.length ?? 0} recipients
            </Button>
          </>
        ) : undefined
      }
    >
      {!parsed ? (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="size-8 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">Drop a CSV file here</p>
            <p className="mt-1 text-xs text-slate-500">or</p>
            <Button className="mt-2" icon={Upload} loading={reading} onClick={() => fileInput.current?.click()}>
              Choose file
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                void readFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
          <p className="text-sm text-slate-600">
            Expected columns: {COLUMNS.map((c) => c.label).join(', ')}. Other column names can be mapped in the next step.
            Leave Issue Date empty to use the global issue date.{' '}
            <button type="button" className="font-medium text-blue-700 hover:underline" onClick={onSampleCsv}>
              Download a sample CSV
            </button>
          </p>
        </div>
      ) : (
        mapping &&
        prepared && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <FileSpreadsheet className="size-4 text-slate-400" />
              <span className="font-medium text-slate-800">{parsed.fileName}</span>
              <span>· {parsed.rows.length} rows</span>
              {prepared.errors > 0 && <Badge tone="red">{prepared.errors} with errors</Badge>}
              {prepared.warnings > 0 && <Badge tone="amber">{prepared.warnings} with empty fields</Badge>}
              {prepared.numbered > 0 && <Badge tone="blue">{prepared.numbered} numbers will be generated</Badge>}
            </div>

            {parsed.problems.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <p className="flex items-center gap-1.5 font-medium">
                  <TriangleAlert className="size-3.5" /> Some lines could not be read cleanly
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {parsed.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">Column mapping</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {COLUMNS.map((column) => (
                  <Field key={column.key} label={column.label + (column.key === 'recipientName' ? ' *' : '')}>
                    <SelectInput
                      value={mapping[column.key]}
                      onChange={(e) => setMapping({ ...mapping, [column.key]: e.target.value })}
                      className={!mapping[column.key] && column.key === 'recipientName' ? 'border-red-400' : ''}
                    >
                      <option value="">{column.key === 'issueDate' ? 'Use global date' : '— Not in file —'}</option>
                      {parsed.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Dates in this file" hint="ISO dates (2026-04-23) are always accepted.">
                <SelectInput value={dateOrder} onChange={(e) => setDateOrder(e.target.value as DateOrder)}>
                  <option value="YMD">YYYY-MM-DD</option>
                  <option value="DMY">DD/MM/YYYY</option>
                  <option value="MDY">MM/DD/YYYY</option>
                </SelectInput>
              </Field>
              <Field label="Existing recipients" hint={existing.length ? `${existing.length} in the list now.` : 'The list is empty.'}>
                <SelectInput value={mode} onChange={(e) => setMode(e.target.value as 'append' | 'replace')} disabled={!existing.length}>
                  <option value="append">Keep and add imported rows</option>
                  <option value="replace">Replace with imported rows</option>
                </SelectInput>
              </Field>
              <div className="pt-5">
                <Switch
                  checked={autoNumber}
                  onChange={setAutoNumber}
                  label="Number rows without a certificate number"
                  description="Empty rows get an 8-character code. Numbers already in the file are kept."
                />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Preview {prepared.list.length > PREVIEW_ROWS && `(first ${PREVIEW_ROWS} of ${prepared.list.length})`}
              </h3>
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      {COLUMNS.map((c) => (
                        <th key={c.key} className="px-3 py-2 font-medium">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prepared.list.slice(0, PREVIEW_ROWS).map((r, i) => {
                      const issues = prepared.issues.get(r.id) ?? []
                      const bad = (field: string) => issues.find((issue) => issue.field === field)
                      const cell = (field: string, value: string) => {
                        const issue = bad(field)
                        return (
                          <td
                            className={`px-3 py-1.5 ${issue ? (issue.level === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700') : 'text-slate-700'}`}
                            title={issue?.message}
                          >
                            {value || <span className="text-slate-400">—</span>}
                          </td>
                        )
                      }
                      return (
                        <tr key={r.id}>
                          <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                          {cell('recipientName', r.recipientName)}
                          {cell('courseName', r.courseName)}
                          {cell('courseStartDate', r.courseStartDate)}
                          {cell('certificateNumber', r.certificateNumber)}
                          {cell('courseDuration', r.courseDuration)}
                          {cell('issueDate', r.issueDateOverride ?? 'Global')}
                          <td className="px-3 py-1.5">
                            {issues.some((x) => x.level === 'error') ? (
                              <Badge tone="red">Error</Badge>
                            ) : issues.length ? (
                              <Badge tone="amber">Empty fields</Badge>
                            ) : (
                              <Badge tone="green">OK</Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Rows with errors can still be imported and fixed in the table afterwards. Batch export stays disabled until they are fixed.
              </p>
            </div>
          </div>
        )
      )}
    </Modal>
  )
}
