import { CalendarDays } from 'lucide-react'
import { isValidIsoDate, todayIso } from '../lib/dates'
import { Tooltip, inputClass } from './ui'

interface Props {
  value: string
  total: number
  overrides: number
  onChange: (value: string) => void
}

export function GlobalDateSettings({ value, total, overrides, onChange }: Props) {
  const invalid = !isValidIsoDate(value)
  return (
    <div className="flex items-center gap-3">
      <Tooltip label="Printed on every certificate that does not have its own issue date" align="end">
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
          <CalendarDays className="size-4 text-blue-600" />
          Issue date
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} w-40 ${invalid ? 'border-red-400' : ''}`}
          />
        </label>
      </Tooltip>
      {value !== todayIso() && (
        <button type="button" className="text-xs font-medium text-blue-700 hover:underline" onClick={() => onChange(todayIso())}>
          Today
        </button>
      )}
      <span className="hidden text-xs text-slate-500 xl:inline">
        {invalid
          ? 'Set a date to export'
          : total
            ? `Applies to ${total - overrides} of ${total} recipients${overrides ? ` · ${overrides} with their own date` : ''}`
            : 'Applies to all recipients'}
      </span>
    </div>
  )
}
