import { Pencil, Undo2 } from 'lucide-react'
import { dateInputType, formatDate, isValidIsoDate, todayIso } from '../lib/dates'
import type { DateFormat } from '../types'
import { Badge, IconButton, inputClass } from './ui'

interface Props {
  override: string | null
  globalIssueDate: string
  dateFormat: DateFormat
  onChange: (override: string | null) => void
  compact?: boolean
}

/** Shows the global issue date, or a per-recipient override that can be reverted. */
export function IssueDateControl({ override, globalIssueDate, dateFormat, onChange, compact }: Props) {
  if (override === null) {
    return (
      <div className="flex h-8 items-center gap-1.5">
        <span className="truncate text-sm text-slate-600 tabular-nums">
          {globalIssueDate ? formatDate(globalIssueDate, dateFormat) : 'Not set'}
        </span>
        <Badge tone="blue">Global</Badge>
        <IconButton
          label="Use a different issue date for this recipient"
          icon={Pencil}
          className="size-7"
          tooltipAlign="end"
          onClick={() => onChange(isValidIsoDate(globalIssueDate) ? globalIssueDate : todayIso())}
        />
      </div>
    )
  }
  const invalid = !isValidIsoDate(override)
  // A date input reports '' while a part is half typed (the 0 of 04), so an empty override reverts to the global date only on blur.
  return (
    <div className="flex items-center gap-1">
      <input
        type={dateInputType(override)}
        aria-label="Issue date override"
        value={override}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => !e.target.value && onChange(null)}
        className={`${inputClass} ${compact ? 'w-36' : ''} ${invalid ? 'border-red-400 text-red-700' : 'border-amber-300 bg-amber-50/40'}`}
      />
      <IconButton
        label="Use the global issue date"
        icon={Undo2}
        className="size-7"
        tooltipAlign="end"
        onClick={() => onChange(null)}
      />
    </div>
  )
}
