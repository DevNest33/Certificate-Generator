import {
  AlignCenterVertical,
  Lock,
  LockOpen,
  MousePointerClick,
  RotateCcw,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  TriangleAlert,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { FONT_OPTIONS, FONT_WEIGHTS, fontFamilies, renderedFontFamily } from '../lib/fonts'
import { dateInputType, isValidIsoDate } from '../lib/dates'
import { stripDrawnLabel } from '../lib/recipients'
import { centerHorizontally, realign } from '../lib/layout'
import type { FieldId, FieldSpec, FieldValues, Preset, Recipient, TemplateConfig, TextAlign, TextElement } from '../types'
import { Button, Field, IconButton, NumberInput, Segmented, SelectInput, Switch, TextInput, inputClass } from './ui'

const ALIGN_OPTIONS: { value: TextAlign; label: string; icon: typeof TextAlignStart }[] = [
  { value: 'left', label: 'Align left', icon: TextAlignStart },
  { value: 'center', label: 'Center', icon: TextAlignCenter },
  { value: 'right', label: 'Align right', icon: TextAlignEnd },
]

interface Props {
  preset: Preset
  elements: TextElement[]
  selected: TextElement | null
  config: TemplateConfig
  recipient: Recipient | null
  placeholder: string
  onSelect: (id: FieldId) => void
  onChange: (id: FieldId, patch: Partial<TextElement>) => void
  onResetPosition: (id: FieldId) => void
  onRecipientChange: (id: string, field: FieldId, value: string) => void
  onAddRecipient: (values: FieldValues) => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-b border-slate-100 px-4 py-4">
      <h3 className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{title}</h3>
      {children}
    </div>
  )
}

const SOURCE_LABEL: Record<FieldSpec['source'], string> = {
  variable: 'From your data',
  fixed: 'Set once in the preset',
  template: 'Built from other fields',
}

export function TextPropertiesPanel({
  preset,
  elements,
  selected,
  config,
  recipient,
  placeholder,
  onSelect,
  onChange,
  onResetPosition,
  onRecipientChange,
  onAddRecipient,
}: Props) {
  if (!selected) {
    return (
      <div className="px-4 py-4">
        <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">
          <MousePointerClick className="mt-0.5 size-4 shrink-0 text-slate-400" />
          Select a text field on the certificate, or pick one below, to edit its content, style and position.
        </div>
        <ul className="mt-3 space-y-1">
          {elements.map((el) => (
            <li key={el.id}>
              <button
                type="button"
                onClick={() => onSelect(el.id)}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                {el.name}
                {el.locked && <Lock className="size-3.5 text-slate-400" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const el = selected
  const spec = preset.fields.find((f) => f.id === el.id)
  const update = (patch: Partial<TextElement>) => onChange(el.id, patch)
  const W = config.designWidth
  const H = config.designHeight
  const requestedFamily = fontFamilies(el.fontFamily)[0]
  const usedFamily = renderedFontFamily(el.fontFamily)
  const fontKnown = FONT_OPTIONS.some((f) => f.value === el.fontFamily)

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900">{el.name}</h2>
          <p className="text-xs text-slate-500">{spec ? SOURCE_LABEL[spec.source] : 'Text field'}</p>
        </div>
        <IconButton
          label={el.locked ? 'Unlock position' : 'Lock position'}
          icon={el.locked ? Lock : LockOpen}
          active={el.locked}
          tooltipAlign="end"
          onClick={() => update({ locked: !el.locked })}
        />
      </div>

      <Section title="Content">
        <ContentEditor
          spec={spec}
          recipient={recipient}
          placeholder={placeholder}
          onRecipientChange={onRecipientChange}
          onAddRecipient={onAddRecipient}
        />
      </Section>

      <Section title="Typography">
        <Field label="Font family">
          <SelectInput value={el.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })}>
            {!fontKnown && <option value={el.fontFamily}>{requestedFamily}</option>}
            {FONT_OPTIONS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        {usedFamily !== requestedFamily && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            {requestedFamily} is not installed on this device, so {usedFamily} is used in the preview and exports.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Size (px)">
            <NumberInput value={el.fontSize} min={4} max={200} step={0.5} onValueChange={(fontSize) => update({ fontSize })} />
          </Field>
          <Field label="Weight">
            <SelectInput value={el.fontWeight} onChange={(e) => update({ fontWeight: Number(e.target.value) })}>
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Color" group>
            <div className="flex gap-1.5">
              <input
                type="color"
                aria-label="Text color"
                value={el.color}
                onChange={(e) => update({ color: e.target.value })}
                className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-0.5"
              />
              <TextInput
                aria-label="Text color hex"
                value={el.color}
                maxLength={7}
                className="font-mono text-xs uppercase"
                onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && update({ color: e.target.value.toLowerCase() })}
              />
            </div>
          </Field>
          <Field label="Letter spacing (px)">
            <NumberInput value={el.letterSpacing} min={-5} max={40} step={0.1} onValueChange={(letterSpacing) => update({ letterSpacing })} />
          </Field>
        </div>
        <Field label="Horizontal alignment" group>
          <Segmented value={el.align} options={ALIGN_OPTIONS} onChange={(align) => update(realign(el, align))} />
        </Field>
        <Switch
          checked={el.shrinkToFit}
          onChange={(shrinkToFit) => update({ shrinkToFit })}
          label="Shrink to fit"
          description="Reduces the font size when the text is wider than the box."
        />
      </Section>

      <Section title="Position and size">
        <p className="-mt-1 text-xs text-slate-500">
          In template pixels ({W} × {H}). X is the box's {el.align === 'center' ? 'center' : el.align === 'left' ? 'left edge' : 'right edge'}.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="X">
            <NumberInput value={el.x * W} disabled={el.locked} onValueChange={(v) => update({ x: v / W })} />
          </Field>
          <Field label="Y">
            <NumberInput value={el.y * H} disabled={el.locked} onValueChange={(v) => update({ y: v / H })} />
          </Field>
          <Field label="Box width">
            <NumberInput value={el.width * W} min={12} disabled={el.locked} onValueChange={(v) => update({ width: v / W })} />
          </Field>
          <Field label="Box height">
            <NumberInput value={el.height * H} min={8} disabled={el.locked} onValueChange={(v) => update({ height: v / H })} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={AlignCenterVertical} disabled={el.locked} onClick={() => update(centerHorizontally(el))}>
            Center on page
          </Button>
          <Button size="sm" icon={RotateCcw} onClick={() => onResetPosition(el.id)}>
            Reset position
          </Button>
        </div>
        {el.locked && <p className="text-xs text-slate-500">Position is locked. Unlock it to move or resize.</p>}
      </Section>
    </div>
  )
}

function ContentEditor({
  spec,
  recipient,
  placeholder,
  onRecipientChange,
  onAddRecipient,
}: {
  spec: FieldSpec | undefined
  recipient: Recipient | null
  placeholder: string
  onRecipientChange: (id: string, field: FieldId, value: string) => void
  onAddRecipient: (values: FieldValues) => void
}) {
  if (!spec) {
    return <p className="text-xs text-slate-500">This box has no matching field in the preset.</p>
  }

  if (spec.source === 'fixed') {
    return (
      <Field label={spec.name} hint="The same on every certificate from this design. Change it under Presets.">
        <TextInput value={spec.value ?? ''} readOnly disabled />
      </Field>
    )
  }

  if (spec.source === 'template') {
    return (
      <Field label={spec.name} hint="Assembled from other fields. Edit the pattern under Presets.">
        <textarea
          value={placeholder}
          readOnly
          rows={3}
          className={`${inputClass} resize-none bg-slate-50 text-slate-500`}
        />
      </Field>
    )
  }

  // Without a recipient the same inputs are rendered, so focus stays put when the first keystroke adds one.
  const edit = (value: string) =>
    recipient ? onRecipientChange(recipient.id, spec.id, value) : onAddRecipient({ [spec.id]: value })
  const value = recipient?.values[spec.id] ?? ''
  const hint = recipient ? 'Editing the certificate being previewed.' : 'Typing here adds your first row.'

  if (spec.kind === 'date') {
    const invalid = value !== '' && !isValidIsoDate(value)
    return (
      <Field label={spec.name} hint={hint}>
        <input
          type={dateInputType(value)}
          value={value}
          onChange={(e) => edit(e.target.value)}
          className={`${inputClass} ${invalid ? 'border-red-400 text-red-700' : ''}`}
        />
      </Field>
    )
  }

  return (
    <Field label={spec.name} hint={hint}>
      <TextInput
        value={value}
        placeholder={recipient ? undefined : stripDrawnLabel(spec, placeholder)}
        onChange={(e) => edit(e.target.value)}
      />
    </Field>
  )
}
