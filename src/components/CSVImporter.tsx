import { CircleAlert, ClipboardPaste, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react'
import { useMemo, useRef, useState, type DragEvent } from 'react'
import {
  autoMapColumns,
  parseCsvFile,
  parseCsvText,
  rowToRecipient,
  unmappedHeaders,
  type ColumnMapping,
  type ParsedCsv,
} from '../lib/csv'
import type { DateOrder } from '../lib/dates'
import { fillMissingNumbers, numberedField } from '../lib/numbering'
import { columnsFor, validateAll } from '../lib/recipients'
import type { Preset, Recipient } from '../types'
import { Badge, Button, Field, Modal, SelectInput, Switch } from './ui'

const PREVIEW_ROWS = 50

interface Props {
  open: boolean
  preset: Preset
  existing: Recipient[]
  onClose: () => void
  onImport: (recipients: Recipient[], mode: 'append' | 'replace', numbered: number) => void
  onSampleCsv: () => void
}

export function CSVImporter({ open, preset, existing, onClose, onImport, onSampleCsv }: Props) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [pasted, setPasted] = useState('')
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [dateOrder, setDateOrder] = useState<DateOrder>('YMD')
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [autoNumber, setAutoNumber] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const columns = useMemo(() => columnsFor(preset), [preset])
  const numberField = useMemo(() => numberedField(preset), [preset])
  const requiredIds = useMemo(
    () => preset.fields.filter((f) => f.source === 'variable' && f.required).map((f) => f.id),
    [preset],
  )

  const reset = () => {
    setParsed(null)
    setMapping(null)
    setError(null)
    setDragging(false)
  }

  const close = () => {
    reset()
    setPasted('')
    onClose()
  }

  const accept = (result: ParsedCsv) => {
    setParsed(result)
    setMapping(autoMapColumns(result.headers, columns))
    setMode(existing.length ? 'append' : 'replace')
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setReading(true)
    try {
      accept(await parseCsvFile(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setParsed(null)
    } finally {
      setReading(false)
    }
  }

  const readPasted = () => {
    setError(null)
    try {
      accept(parseCsvText(pasted))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setParsed(null)
    }
  }

  const prepared = useMemo(() => {
    if (!parsed || !mapping) return null
    const imported = parsed.rows.map((row) => rowToRecipient(preset, row, mapping, dateOrder))
    const kept = mode === 'append' ? existing : []
    let numbered = 0
    let list = imported
    if (autoNumber && numberField) {
      const result = fillMissingNumbers([...kept, ...imported], numberField)
      list = result.recipients.slice(kept.length)
      numbered = result.filled
    }
    const issues = validateAll(preset, [...kept, ...list])
    let errors = 0
    let warnings = 0
    for (const r of list) {
      const rowIssues = issues.get(r.id)
      if (!rowIssues) continue
      if (rowIssues.some((i) => i.level === 'error')) errors++
      else warnings++
    }
    return { list, issues, numbered, errors, warnings, ignored: unmappedHeaders(parsed.headers, mapping) }
  }, [parsed, mapping, dateOrder, mode, autoNumber, existing, preset, numberField])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void readFile(e.dataTransfer.files[0])
  }

  const missingRequired = requiredIds.filter((id) => !mapping?.[id])
  const canImport = !!prepared && missingRequired.length === 0 && prepared.list.length > 0

  return (
    <Modal
      open={open}
      size={parsed ? 'xl' : 'md'}
      title={`Add data for ${preset.name}`}
      description="Everything is read in this browser and never uploaded."
      onClose={close}
      footer={
        parsed ? (
          <>
            <Button variant="ghost" className="mr-auto" onClick={reset}>
              Start over
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
              Add {prepared?.list.length ?? 0} certificates
            </Button>
          </>
        ) : undefined
      }
    >
      {!parsed ? (
        <div className="space-y-4">
          <Field
            group
            label="Paste rows"
            hint="Copy straight out of Excel or Sheets, including the header row. Commas or tabs both work."
          >
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={7}
              spellCheck={false}
              placeholder={`${columns.map((c) => c.label).join(',')}\n…`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs shadow-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={ClipboardPaste} disabled={!pasted.trim()} onClick={readPasted}>
              Use pasted data
            </Button>
            <span className="text-xs text-slate-400">or</span>
            <Button
              icon={Upload}
              loading={reading}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={dragging ? 'border-blue-400 bg-blue-50' : ''}
            >
              Choose a CSV file
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
            Expected columns: {columns.map((c) => c.label).join(', ')}. Other column names can be mapped in the next
            step.{' '}
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

            {prepared.ignored.length > 0 && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Ignored {prepared.ignored.length === 1 ? 'column' : 'columns'}: {prepared.ignored.join(', ')}. This
                design does not use {prepared.ignored.length === 1 ? 'it' : 'them'}, or the value is set once in the
                preset.
              </p>
            )}

            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">Column mapping</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {columns.map((column) => {
                  const required = requiredIds.includes(column.key)
                  return (
                    <Field key={column.key} label={column.label + (required ? ' *' : '')}>
                      <SelectInput
                        value={mapping[column.key] ?? ''}
                        onChange={(e) => setMapping({ ...mapping, [column.key]: e.target.value })}
                        className={!mapping[column.key] && required ? 'border-red-400' : ''}
                      >
                        <option value="">— Not in data —</option>
                        {parsed.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  )
                })}
              </div>
              {missingRequired.length > 0 && (
                <p className="mt-2 text-xs text-red-600">
                  Map a column for: {missingRequired.map((id) => columns.find((c) => c.key === id)?.label).join(', ')}.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Dates in this data" hint="ISO dates (2026-04-23) are always accepted.">
                <SelectInput value={dateOrder} onChange={(e) => setDateOrder(e.target.value as DateOrder)}>
                  <option value="YMD">YYYY-MM-DD</option>
                  <option value="DMY">DD/MM/YYYY</option>
                  <option value="MDY">MM/DD/YYYY</option>
                </SelectInput>
              </Field>
              <Field
                label="Existing rows"
                hint={existing.length ? `${existing.length} in the list now.` : 'The list is empty.'}
              >
                <SelectInput
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'append' | 'replace')}
                  disabled={!existing.length}
                >
                  <option value="append">Keep and add these rows</option>
                  <option value="replace">Replace with these rows</option>
                </SelectInput>
              </Field>
              {numberField && (
                <div className="pt-5">
                  <Switch
                    checked={autoNumber}
                    onChange={setAutoNumber}
                    label="Generate missing numbers"
                    description="Off by default: numbers you supply are kept exactly, so re-running a batch reproduces them."
                  />
                </div>
              )}
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
                      {columns.map((c) => (
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
                      return (
                        <tr key={r.id}>
                          <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                          {columns.map((c) => {
                            const issue = issues.find((x) => x.field === c.key)
                            const value = r.values[c.key] ?? ''
                            return (
                              <td
                                key={c.key}
                                className={`px-3 py-1.5 ${issue ? (issue.level === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700') : 'text-slate-700'}`}
                                title={issue?.message}
                              >
                                {value || <span className="text-slate-400">—</span>}
                              </td>
                            )
                          })}
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
                Rows with errors can still be added and fixed in the table afterwards. Batch export stays disabled until
                they are fixed.
              </p>
            </div>
          </div>
        )
      )}
    </Modal>
  )
}
