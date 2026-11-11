import { ChevronLeft, ChevronRight, Eye, Trash } from 'lucide-react'
import { memo, useMemo, useState, type ReactNode } from 'react'
import { dateInputType, parseDate } from '../lib/dates'
import { validateRecipient, variableFields } from '../lib/recipients'
import type { FieldId, FieldSpec, Preset, Recipient, ValidationIssue } from '../types'
import { IconButton, Tooltip, inputClass } from './ui'

const PAGE_SIZE = 100

interface TableProps {
  preset: Preset
  recipients: Recipient[]
  duplicates: Map<FieldId, Set<string>>
  previewId: string | null
  onChange: (id: string, field: FieldId, value: string) => void
  onRemove: (id: string) => void
  onPreview: (id: string) => void
}

export function RecipientTable({ preset, recipients, duplicates, previewId, onChange, onRemove, onPreview }: TableProps) {
  const [page, setPage] = useState(0)
  const fields = useMemo(() => variableFields(preset), [preset])
  const pageCount = Math.max(1, Math.ceil(recipients.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const start = current * PAGE_SIZE
  const rows = recipients.slice(start, start + PAGE_SIZE)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm" style={{ minWidth: `${220 + fields.length * 170}px` }}>
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-2 py-2 pl-4 font-medium">#</th>
              {fields.map((f) => (
                <th key={f.id} className="border-b border-slate-200 px-2 py-2 font-medium">
                  {f.name}
                  {f.required && <span className="ml-0.5 text-red-400">*</span>}
                </th>
              ))}
              <th className="border-b border-slate-200 px-2 py-2 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <RecipientRow
                key={r.id}
                preset={preset}
                fields={fields}
                index={start + i}
                recipient={r}
                duplicates={duplicates}
                active={r.id === previewId}
                onChange={onChange}
                onRemove={onRemove}
                onPreview={onPreview}
              />
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
          <span className="tabular-nums">
            {start + 1}–{start + rows.length} of {recipients.length}
          </span>
          <IconButton label="Previous page" icon={ChevronLeft} disabled={current === 0} onClick={() => setPage(current - 1)} tooltipSide="top" />
          <IconButton
            label="Next page"
            icon={ChevronRight}
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            tooltipSide="top"
            tooltipAlign="end"
          />
        </div>
      )}
    </div>
  )
}

interface RowProps {
  preset: Preset
  fields: FieldSpec[]
  index: number
  recipient: Recipient
  duplicates: Map<FieldId, Set<string>>
  active: boolean
  onChange: (id: string, field: FieldId, value: string) => void
  onRemove: (id: string) => void
  onPreview: (id: string) => void
}

const RecipientRow = memo(function RecipientRow({
  preset,
  fields,
  index,
  recipient: r,
  duplicates,
  active,
  onChange,
  onRemove,
  onPreview,
}: RowProps) {
  const issues = useMemo(() => validateRecipient(preset, r, duplicates), [preset, r, duplicates])
  const issueFor = (field: FieldId) => issues.find((i) => i.field === field)
  const hasError = issues.some((i) => i.level === 'error')

  return (
    <tr className={active ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'}>
      <td className={`border-b border-slate-100 py-1.5 pr-2 pl-4 text-xs tabular-nums ${hasError ? 'text-red-600' : 'text-slate-400'}`}>
        {index + 1}
      </td>
      {fields.map((f) => {
        const issue = issueFor(f.id)
        const value = r.values[f.id] ?? ''
        return (
          <Cell key={f.id} issue={issue} width={f.kind === 'date' ? 'w-40' : undefined}>
            {f.kind === 'date' ? (
              <DateCell value={value} issue={issue} onChange={(v) => onChange(r.id, f.id, v)} />
            ) : (
              <TextCell
                value={value}
                issue={issue}
                placeholder={f.placeholder ?? f.name}
                onChange={(v) => onChange(r.id, f.id, v)}
              />
            )}
          </Cell>
        )
      })}
      <td className="border-b border-slate-100 py-1.5 pr-4 pl-2">
        <div className="flex justify-end">
          <IconButton label="Preview this certificate" icon={Eye} active={active} onClick={() => onPreview(r.id)} tooltipAlign="end" />
          <IconButton label="Remove recipient" icon={Trash} className="hover:text-red-600" onClick={() => onRemove(r.id)} tooltipAlign="end" />
        </div>
      </td>
    </tr>
  )
})

function Cell({ issue, width, children }: { issue?: ValidationIssue; width?: string; children: ReactNode }) {
  const content = <div className="w-full">{children}</div>
  return (
    <td className={`border-b border-slate-100 px-2 py-1.5 align-middle ${width ?? ''}`}>
      {issue ? (
        <Tooltip label={issue.message} align="start">
          {content}
        </Tooltip>
      ) : (
        content
      )}
    </td>
  )
}

function issueClass(issue?: ValidationIssue) {
  if (!issue) return ''
  return issue.level === 'error' ? 'border-red-400 bg-red-50/40' : 'border-amber-300 bg-amber-50/40'
}

function TextCell({
  value,
  issue,
  placeholder,
  onChange,
}: {
  value: string
  issue?: ValidationIssue
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} ${issueClass(issue)}`}
    />
  )
}

/** Uses the native date picker, falling back to a text box for imported values that are not in YYYY-MM-DD form. */
function DateCell({ value, issue, onChange }: { value: string; issue?: ValidationIssue; onChange: (value: string) => void }) {
  return (
    <input
      type={dateInputType(value)}
      value={value}
      placeholder="YYYY-MM-DD"
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        const parsed = parseDate(e.target.value)
        if (parsed && parsed !== value) onChange(parsed)
      }}
      className={`${inputClass} ${issueClass(issue)}`}
    />
  )
}
