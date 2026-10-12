import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, TriangleAlert, Users } from 'lucide-react'
import type { Recipient, ValidationIssue } from '../types'
import { Button, IconButton, SelectInput, Tooltip } from './ui'

interface Props {
  recipients: Recipient[]
  current: Recipient | null
  issues: ValidationIssue[]
  onPick: (id: string) => void
  onManage: () => void
}

export function RecipientPicker({ recipients, current, issues, onPick, onManage }: Props) {
  if (!recipients.length || !current) {
    return (
      <div className="flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500">
        <Users className="size-4 text-slate-400" />
        <span>No recipients yet. The preview shows placeholder text.</span>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={onManage}>
          Add recipients
        </Button>
      </div>
    )
  }

  const index = recipients.indexOf(current)
  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')

  return (
    <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-2">
      <span className="text-xs font-medium text-slate-500">Preview</span>
      <IconButton
        label="Previous recipient"
        icon={ChevronLeft}
        disabled={index <= 0}
        onClick={() => onPick(recipients[index - 1].id)}
        tooltipSide="top"
      />
      <SelectInput
        aria-label="Recipient to preview"
        className="max-w-sm"
        value={current.id}
        onChange={(e) => onPick(e.target.value)}
      >
        {recipients.map((r, i) => (
          <option key={r.id} value={r.id}>
            {i + 1}. {r.recipientName || '(no name)'}
            {r.certificateNumber ? `  ·  ${r.certificateNumber}` : ''}
          </option>
        ))}
      </SelectInput>
      <IconButton
        label="Next recipient"
        icon={ChevronRight}
        disabled={index >= recipients.length - 1}
        onClick={() => onPick(recipients[index + 1].id)}
        tooltipSide="top"
      />
      <span className="text-xs text-slate-500 tabular-nums">
        {index + 1} of {recipients.length}
      </span>
      <div className="ml-auto">
        {errors.length ? (
          <Tooltip label={errors.map((e) => e.message).join(' · ')} side="top" align="end">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
              <CircleAlert className="size-4" /> {errors.length} {errors.length === 1 ? 'error' : 'errors'}
            </span>
          </Tooltip>
        ) : warnings.length ? (
          <Tooltip label={warnings.map((e) => e.message).join(' · ')} side="top" align="end">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
              <TriangleAlert className="size-4" /> {warnings.length} empty {warnings.length === 1 ? 'field' : 'fields'}
            </span>
          </Tooltip>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <CircleCheck className="size-4" /> Ready to export
          </span>
        )}
      </div>
    </div>
  )
}
