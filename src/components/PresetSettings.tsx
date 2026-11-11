import { Check, Copy, Download, RotateCcw, Trash, Upload } from 'lucide-react'
import { useRef } from 'react'
import { assetUrl } from '../presets/registry'
import type { FieldId, FieldSpec, FieldSource, Preset } from '../types'
import { Badge, Button, Card, Field, SelectInput, TextInput, inputClass } from './ui'

const SOURCES: { value: FieldSource; label: string }[] = [
  { value: 'variable', label: 'From data' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'template', label: 'Built from fields' },
]

interface Props {
  presets: Preset[]
  active: Preset
  modified: boolean
  onActivate: (id: string) => void
  onChange: (patch: Partial<Preset>) => void
  onFieldChange: (fieldId: FieldId, patch: Partial<FieldSpec>) => void
  onDuplicate: () => void
  onDelete: () => void
  onReset: () => void
  onExport: () => void
  onImport: (file: File) => void
}

export function PresetSettings({
  presets,
  active,
  modified,
  onActivate,
  onChange,
  onFieldChange,
  onDuplicate,
  onDelete,
  onReset,
  onExport,
  onImport,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const drawn = new Set(active.elements.map((el) => el.id))

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-5xl gap-5 p-6">
        <Card
          title="Designs"
          description="A preset is one certificate design: its artwork, its field layout and the values that never change."
          actions={
            <>
              <Button icon={Upload} onClick={() => fileInput.current?.click()}>
                Import JSON
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onImport(file)
                  e.target.value = ''
                }}
              />
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((p) => {
              const isActive = p.id === active.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onActivate(p.id)}
                  className={`group overflow-hidden rounded-lg border text-left transition-colors ${
                    isActive ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={assetUrl(p.template)}
                    alt=""
                    className="aspect-[1.4/1] w-full bg-slate-50 object-cover"
                  />
                  <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{p.name}</span>
                    {isActive && <Check className="size-4 shrink-0 text-blue-600" />}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <Button icon={Copy} onClick={onDuplicate}>
              Duplicate
            </Button>
            <Button icon={Download} onClick={onExport}>
              Export JSON
            </Button>
            {active.builtIn ? (
              <Button variant="ghost" icon={RotateCcw} disabled={!modified} onClick={onReset}>
                Reset to shipped version
              </Button>
            ) : (
              <Button variant="ghost" icon={Trash} className="hover:text-red-600" onClick={onDelete}>
                Delete
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {active.builtIn && <Badge tone="blue">Built in</Badge>}
              {modified && <Badge tone="amber">Edited</Badge>}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Export JSON writes the design as it stands now. Drop that file into src/presets/ to ship it with the app;
            until then your edits live in this browser.
          </p>
        </Card>

        <Card title="Details" description="How this design is named and how its exports are named.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Preset name">
              <TextInput value={active.name} onChange={(e) => onChange({ name: e.target.value })} />
            </Field>
            <Field
              label="Export file name"
              hint="Use {fieldId} for any field. The extension is added automatically."
            >
              <TextInput
                value={active.fileNameTemplate}
                spellCheck={false}
                onChange={(e) => onChange({ fileNameTemplate: e.target.value })}
              />
            </Field>
          </div>
          <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-2 text-sm">
            <div className="flex justify-between gap-4 py-1.5">
              <dt className="text-slate-500">Artwork</dt>
              <dd className="text-right font-medium text-slate-800">{active.template}</dd>
            </div>
            <div className="flex justify-between gap-4 py-1.5">
              <dt className="text-slate-500">Design size</dt>
              <dd className="text-right font-medium text-slate-800">
                {active.designWidth} x {active.designHeight} px
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Fields"
          description="Choose what comes from your pasted data and what is typed once here. Fixed values print on every certificate from this design."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs font-medium text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Field</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.fields.map((f) => (
                  <tr key={f.id}>
                    <td className="py-2 pr-3 align-top">
                      <div className="font-medium text-slate-800">{f.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {f.id}
                        {!drawn.has(f.id) && ' · not drawn'}
                      </div>
                    </td>
                    <td className="w-44 py-2 pr-3 align-top">
                      <SelectInput
                        value={f.source}
                        onChange={(e) => onFieldChange(f.id, { source: e.target.value as FieldSource })}
                      >
                        {SOURCES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </SelectInput>
                    </td>
                    <td className="py-2 align-top">
                      {f.source === 'fixed' ? (
                        <TextInput
                          value={f.value ?? ''}
                          placeholder={f.name}
                          onChange={(e) => onFieldChange(f.id, { value: e.target.value })}
                        />
                      ) : f.source === 'template' ? (
                        <textarea
                          value={f.pattern ?? ''}
                          rows={3}
                          spellCheck={false}
                          placeholder="Text with {fieldId} placeholders"
                          onChange={(e) => onFieldChange(f.id, { pattern: e.target.value })}
                          className={`${inputClass} resize-y font-mono text-xs`}
                        />
                      ) : null}
                      {f.source === 'template' ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {'{fieldId}'} inserts a value. Wrap a clause in {'[[ ]]'} to drop it entirely when a field
                          it names is blank.
                        </p>
                      ) : (
                        <span className="inline-block py-1.5 text-xs text-slate-500">
                          Supplied per certificate
                          {f.required && ' · required'}
                          {f.unique && ' · must be unique'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
