import { QrCode, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { DATE_FORMATS } from '../lib/dates'
import { assetUrl, hasQr } from '../presets/registry'
import type { DateFormat, Preset } from '../types'
import { Button, Card, Field, SelectInput, Switch } from './ui'

interface Props {
  preset: Preset
  template: HTMLImageElement | null
  pageLabel: string
  pixelLabel: string
  dateFormat: DateFormat
  hideQr: boolean
  onDateFormatChange: (format: DateFormat) => void
  onHideQrChange: (hide: boolean) => void
  onResetLayout: () => void
  numbering: ReactNode
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  )
}

export function TemplateSettings({
  preset,
  template,
  pageLabel,
  pixelLabel,
  dateFormat,
  hideQr,
  onDateFormatChange,
  onHideQrChange,
  onResetLayout,
  numbering,
}: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-5xl gap-5 p-6 lg:grid-cols-2">
        <Card
          title={`Template - ${preset.name}`}
          description="Used unchanged as the background of every certificate from this design."
          className="lg:col-span-2"
        >
          <div className="grid gap-6 md:grid-cols-[1fr_280px]">
            <div className="grid grid-cols-2 gap-3">
              <figure>
                <img
                  src={assetUrl(preset.template)}
                  alt="Blank certificate template"
                  className="w-full rounded border border-slate-200"
                />
                <figcaption className="mt-1.5 text-xs text-slate-500">public/{preset.template}</figcaption>
              </figure>
              {preset.referenceSrc && (
                <figure>
                  <img
                    src={assetUrl(preset.referenceSrc)}
                    alt="Reference certificate"
                    className="w-full rounded border border-slate-200"
                  />
                  <figcaption className="mt-1.5 text-xs text-slate-500">
                    public/{preset.referenceSrc} (layout guide, never exported)
                  </figcaption>
                </figure>
              )}
            </div>
            <dl className="divide-y divide-slate-100">
              <Detail label="Template size" value={template ? `${template.naturalWidth} × ${template.naturalHeight} px` : '…'} />
              <Detail label="PDF page" value={pageLabel} />
              <Detail label="Export resolution" value={pixelLabel} />
              <Detail label="Field positions" value="Normalized to template size" />
            </dl>
          </div>
        </Card>

        <Card title="Date display" description="Dates are stored as YYYY-MM-DD and printed in this format.">
          <Field label="Format">
            <SelectInput value={dateFormat} onChange={(e) => onDateFormatChange(e.target.value as DateFormat)}>
              {DATE_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.value} ({f.example})
                </option>
              ))}
            </SelectInput>
          </Field>
          <p className="mt-3 text-sm text-slate-600">
            Applies to every field of kind date in this design.
          </p>
        </Card>

        {hasQr(preset) && (
        <Card title="QR-like graphic" description="Part of the template artwork.">
          <div className="flex items-start gap-3">
            <QrCode className="mt-0.5 size-5 shrink-0 text-slate-400" />
            <p className="text-sm text-slate-600">
              This app does not generate QR codes and does not verify certificates, so it makes no claim about that
              graphic. If it is only decorative, you can paint over it with a blank patch of the certificate background.
            </p>
          </div>
          <div className="mt-4">
            <Switch
              checked={hideQr}
              onChange={onHideQrChange}
              label="Cover the QR-like graphic"
              description="Applies to the preview and every export."
            />
          </div>
        </Card>
        )}

        <div className="lg:col-span-2">{numbering}</div>

        <Card
          title="Layout"
          description="Field positions and styles are saved with the preset."
          className="lg:col-span-2"
          actions={
            <Button icon={RotateCcw} onClick={onResetLayout}>
              Reset layout
            </Button>
          }
        >
          <p className="text-sm text-slate-600">
            Drag fields in the Certificate Generator, or edit X, Y, width and height in the properties panel. Reset
            layout restores the original positions and styles of every field in this design.
          </p>
        </Card>
      </div>
    </div>
  )
}
