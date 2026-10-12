import { CalendarClock, Download, Hash, Plus, Sparkles, Trash, Upload, Users } from 'lucide-react'
import type { DateFormat, Recipient } from '../types'
import { RecipientTable } from './RecipientTable'
import { Badge, Button } from './ui'

interface Props {
  recipients: Recipient[]
  duplicates: Set<string>
  errorCount: number
  warningCount: number
  globalIssueDate: string
  dateFormat: DateFormat
  previewId: string | null
  onChange: (id: string, patch: Partial<Recipient>) => void
  onRemove: (id: string) => void
  onPreview: (id: string) => void
  onAdd: () => void
  onImport: () => void
  onSampleCsv: () => void
  onLoadSample: () => void
  onFillMissing: () => void
  onUseGlobalForAll: () => void
  onClearAll: () => void
}

export function RecipientData(props: Props) {
  const { recipients, errorCount, warningCount } = props
  const missingNumbers = recipients.filter((r) => !r.certificateNumber.trim()).length
  const overrides = recipients.filter((r) => r.issueDateOverride !== null).length

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <Button variant="primary" icon={Plus} onClick={props.onAdd}>
          Add recipient
        </Button>
        <Button icon={Upload} onClick={props.onImport}>
          Import CSV
        </Button>
        <Button variant="ghost" icon={Download} onClick={props.onSampleCsv}>
          Sample CSV
        </Button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <Button variant="ghost" icon={Hash} disabled={!missingNumbers} onClick={props.onFillMissing}>
          Fill missing numbers{missingNumbers ? ` (${missingNumbers})` : ''}
        </Button>
        <Button variant="ghost" icon={CalendarClock} disabled={!overrides} onClick={props.onUseGlobalForAll}>
          Use global issue date for all{overrides ? ` (${overrides})` : ''}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {recipients.length > 0 && (
            <>
              <span className="text-xs text-slate-500">{recipients.length} recipients</span>
              {errorCount > 0 && <Badge tone="red">{errorCount} with errors</Badge>}
              {warningCount > 0 && <Badge tone="amber">{warningCount} with empty fields</Badge>}
              <Button variant="ghost" icon={Trash} className="hover:text-red-600" onClick={props.onClearAll}>
                Clear all
              </Button>
            </>
          )}
        </div>
      </div>

      {recipients.length ? (
        <RecipientTable
          recipients={recipients}
          duplicates={props.duplicates}
          globalIssueDate={props.globalIssueDate}
          dateFormat={props.dateFormat}
          previewId={props.previewId}
          onChange={props.onChange}
          onRemove={props.onRemove}
          onPreview={props.onPreview}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-blue-50">
            <Users className="size-6 text-blue-600" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">No recipients yet</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Add recipients one by one, or import a CSV with the columns Recipient Name, Course Name, Course Start Date,
            Certificate Number, Course Duration and Issue Date.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="primary" icon={Upload} onClick={props.onImport}>
              Import CSV
            </Button>
            <Button icon={Plus} onClick={props.onAdd}>
              Add recipient
            </Button>
            <Button variant="ghost" icon={Sparkles} onClick={props.onLoadSample}>
              Load sample data
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
