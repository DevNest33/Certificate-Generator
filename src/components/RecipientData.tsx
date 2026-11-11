import { ClipboardPaste, Download, Hash, Plus, Sparkles, Trash, Upload, Users } from 'lucide-react'
import { useMemo } from 'react'
import { numberedField } from '../lib/numbering'
import { variableFields } from '../lib/recipients'
import type { FieldId, Preset, Recipient } from '../types'
import { RecipientTable } from './RecipientTable'
import { Badge, Button } from './ui'

interface Props {
  preset: Preset
  recipients: Recipient[]
  duplicates: Map<FieldId, Set<string>>
  errorCount: number
  warningCount: number
  previewId: string | null
  onChange: (id: string, field: FieldId, value: string) => void
  onRemove: (id: string) => void
  onPreview: (id: string) => void
  onAdd: () => void
  onImport: () => void
  onSampleCsv: () => void
  onLoadSample: () => void
  onFillMissing: () => void
  onClearAll: () => void
}

export function RecipientData(props: Props) {
  const { preset, recipients, errorCount, warningCount } = props
  const numberField = useMemo(() => numberedField(preset), [preset])
  const missingNumbers = numberField
    ? recipients.filter((r) => !(r.values[numberField] ?? '').trim()).length
    : 0
  const columnList = useMemo(() => variableFields(preset).map((f) => f.name), [preset])

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <Button variant="primary" icon={ClipboardPaste} onClick={props.onImport}>
          Paste or import data
        </Button>
        <Button icon={Plus} onClick={props.onAdd}>
          Add row
        </Button>
        <Button variant="ghost" icon={Download} onClick={props.onSampleCsv}>
          Sample CSV
        </Button>
        {numberField && (
          <>
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <Button variant="ghost" icon={Hash} disabled={!missingNumbers} onClick={props.onFillMissing}>
              Fill missing numbers{missingNumbers ? ` (${missingNumbers})` : ''}
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {recipients.length > 0 && (
            <>
              <span className="text-xs text-slate-500">{recipients.length} certificates</span>
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
          preset={preset}
          recipients={recipients}
          duplicates={props.duplicates}
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
          <h2 className="mt-4 text-base font-semibold text-slate-900">No data yet</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Paste rows copied from a spreadsheet, or import a CSV. For {preset.name} the columns are{' '}
            {columnList.join(', ')}.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="primary" icon={ClipboardPaste} onClick={props.onImport}>
              Paste or import data
            </Button>
            <Button icon={Upload} onClick={props.onAdd}>
              Add row
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
