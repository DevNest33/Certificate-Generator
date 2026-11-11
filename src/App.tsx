import { useCallback, useMemo, useState } from 'react'
import { CertificateNumberSettings } from './components/CertificateNumberSettings'
import { CertificateWorkspace } from './components/CertificateWorkspace'
import { CSVImporter } from './components/CSVImporter'
import { DashboardLayout } from './components/DashboardLayout'
import { ExportHistory } from './components/ExportHistory'
import { ExportPanel } from './components/ExportPanel'
import { PresetSettings } from './components/PresetSettings'
import { RecipientData } from './components/RecipientData'
import { TemplateSettings } from './components/TemplateSettings'
import { TextPropertiesPanel } from './components/TextPropertiesPanel'
import { ConfirmDialog, SelectInput, Toaster } from './components/ui'
import { useConfirm } from './hooks/useConfirm'
import { useExporter } from './hooks/useExporter'
import { useLoadedImage } from './hooks/useLoadedImage'
import { useToasts } from './hooks/useToasts'
import { useLocalState, useSessionState } from './hooks/useStoredState'
import { sampleCsvBlob } from './lib/csv'
import { todayIso } from './lib/dates'
import { downloadBlob } from './lib/download'
import type { CertificateScene } from './lib/drawCertificate'
import { exportPixelSize, pdfPageSize } from './lib/exporter'
import { fillMissingNumbers, numberedField, renumberAll } from './lib/numbering'
import {
  certificateValues,
  countIssues,
  createRecipient,
  duplicateValues,
  sampleRecipients,
  validateAll,
} from './lib/recipients'
import {
  assetUrl,
  BUILT_IN_PRESETS,
  clonePreset,
  isModified,
  mergePresets,
  presetBlob,
  presetFileName,
  revivePresets,
  templateConfig,
} from './presets/registry'
import type {
  BatchFormat,
  DateFormat,
  EditorView,
  ExportRecord,
  FieldId,
  FieldSpec,
  FieldValues,
  Preset,
  Recipient,
  Section,
} from './types'

const DEFAULT_VIEW: EditorView = { zoom: 1, showGrid: false, showBounds: true, showReference: false }

export default function App() {
  // Presets and batch data outlive the tab; view state does not.
  const [storedPresets, setStoredPresets] = useLocalState<Preset[]>('certgen.v5.presets', [], revivePresets)
  const [activeId, setActiveId] = useLocalState('certgen.v5.activePreset', BUILT_IN_PRESETS[0].id)
  const [batches, setBatches] = useLocalState<Record<string, Recipient[]>>('certgen.v5.batches', {})
  const [history, setHistory] = useLocalState<ExportRecord[]>('certgen.v5.history', [])
  const [dateFormat, setDateFormat] = useLocalState<DateFormat>('certgen.v5.dateFormat', 'YYYY-MM-DD')
  const [batchFormat, setBatchFormat] = useLocalState<BatchFormat>('certgen.v5.batchFormat', 'png')
  const [hideQr, setHideQr] = useLocalState('certgen.v5.hideQr', false)
  const [view, setView] = useSessionState<EditorView>('certgen.v5.view', DEFAULT_VIEW)
  const [previewId, setPreviewId] = useSessionState<string | null>('certgen.v5.previewId', null)
  const [section, setSection] = useState<Section>('generator')
  const [selectedId, setSelectedId] = useState<FieldId | null>(null)
  const [importerOpen, setImporterOpen] = useState(false)

  const { toasts, notify, dismiss } = useToasts()
  const { confirm, options: confirmOptions, resolve: resolveConfirm } = useConfirm()

  const presets = useMemo(() => mergePresets(storedPresets), [storedPresets])
  const preset = presets.find((p) => p.id === activeId) ?? presets[0]
  const modified = isModified(storedPresets, preset.id)

  const recipients = useMemo(() => batches[preset.id] ?? [], [batches, preset.id])
  const setRecipients = useCallback(
    (next: Recipient[] | ((list: Recipient[]) => Recipient[])) =>
      setBatches((all) => {
        const current = all[preset.id] ?? []
        return { ...all, [preset.id]: typeof next === 'function' ? next(current) : next }
      }),
    [setBatches, preset.id],
  )

  const template = useLoadedImage(assetUrl(preset.template))
  const reference = useLoadedImage(view.showReference && preset.referenceSrc ? assetUrl(preset.referenceSrc) : null)

  const issues = useMemo(() => validateAll(preset, recipients), [preset, recipients])
  const duplicates = useMemo(() => duplicateValues(preset, recipients), [preset, recipients])
  const issueCounts = useMemo(() => countIssues(issues), [issues])
  const numberField = useMemo(() => numberedField(preset), [preset])

  const previewRecipient = recipients.find((r) => r.id === previewId) ?? recipients[0] ?? null
  const previewIndex = previewRecipient ? recipients.indexOf(previewRecipient) : -1
  const selected = preset.elements.find((el) => el.id === selectedId) ?? null

  const sceneFor = useCallback(
    (recipient: Recipient | null): CertificateScene | null =>
      template.image && {
        template: template.image,
        config: templateConfig(preset),
        elements: preset.elements,
        staticLines: preset.staticLines,
        values: certificateValues(preset, recipient, dateFormat),
        hideQr,
      },
    [template.image, preset, dateFormat, hideQr],
  )
  const scene = useMemo(() => sceneFor(previewRecipient), [sceneFor, previewRecipient])

  const onRecord = useCallback(
    (record: ExportRecord) => setHistory((list) => [record, ...list].slice(0, 200)),
    [setHistory],
  )
  const exporter = useExporter({ preset, sceneFor, notify, onRecord })

  // Presets
  const updatePreset = useCallback(
    (patch: Partial<Preset>) => {
      const next = { ...preset, ...patch }
      setStoredPresets((list) =>
        list.some((p) => p.id === next.id) ? list.map((p) => (p.id === next.id ? next : p)) : [...list, next],
      )
    },
    [preset, setStoredPresets],
  )

  const updateElement = useCallback(
    (id: FieldId, patch: Partial<Preset['elements'][number]>) =>
      updatePreset({ elements: preset.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)) }),
    [preset.elements, updatePreset],
  )

  const updateField = useCallback(
    (id: FieldId, patch: Partial<FieldSpec>) =>
      updatePreset({ fields: preset.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) }),
    [preset.fields, updatePreset],
  )

  const shipped = BUILT_IN_PRESETS.find((p) => p.id === preset.id)

  const resetPosition = (id: FieldId) => {
    const d = shipped?.elements.find((el) => el.id === id)
    if (d) updateElement(id, { x: d.x, y: d.y, width: d.width, height: d.height, align: d.align })
  }

  const resetLayout = async () => {
    if (!shipped) {
      notify('info', 'This design has no shipped version to reset to.')
      return
    }
    const ok = await confirm({
      title: 'Reset layout?',
      message: `Every field of ${preset.name} goes back to its original position, size and style. Your data is not affected.`,
      confirmLabel: 'Reset layout',
    })
    if (!ok) return
    updatePreset({ elements: shipped.elements })
    notify('success', 'Layout reset to the original positions.')
  }

  const resetPreset = async () => {
    const ok = await confirm({
      title: `Reset ${preset.name}?`,
      message: 'Every change you made to this design is discarded and the version that ships with the app comes back.',
      confirmLabel: 'Reset preset',
    })
    if (!ok) return
    setStoredPresets((list) => list.filter((p) => p.id !== preset.id))
    notify('success', `${preset.name} reset.`)
  }

  const deletePreset = async () => {
    const ok = await confirm({
      title: `Delete ${preset.name}?`,
      message: 'The design is removed from this browser. Any data entered for it is kept until you clear it.',
      confirmLabel: 'Delete preset',
    })
    if (!ok) return
    setStoredPresets((list) => list.filter((p) => p.id !== preset.id))
    setActiveId(BUILT_IN_PRESETS[0].id)
    notify('success', 'Preset deleted.')
  }

  const duplicatePreset = () => {
    const copy = clonePreset(preset, `${preset.name} copy`)
    setStoredPresets((list) => [...list, copy])
    setActiveId(copy.id)
    notify('success', `Created ${copy.name}.`)
  }

  const exportPreset = () => downloadBlob(presetBlob(preset), presetFileName(preset))

  const importPreset = async (file: File) => {
    try {
      const [imported] = revivePresets(JSON.parse(await file.text()))
      if (!imported) throw new Error('That file is not a certificate preset.')
      const taken = presets.some((p) => p.id === imported.id)
      const next = taken ? clonePreset(imported, `${imported.name} (imported)`) : { ...imported, builtIn: false }
      setStoredPresets((list) => [...list.filter((p) => p.id !== next.id), next])
      setActiveId(next.id)
      notify('success', `Imported ${next.name}.`)
    } catch (e) {
      notify('error', e instanceof Error ? e.message : String(e))
    }
  }

  const updateView = useCallback((patch: Partial<EditorView>) => setView((v) => ({ ...v, ...patch })), [setView])

  // Certificate data
  const updateRecipient = useCallback(
    (id: string, field: FieldId, value: string) =>
      setRecipients((list) => list.map((r) => (r.id === id ? { ...r, values: { ...r.values, [field]: value } } : r))),
    [setRecipients],
  )

  const removeRecipient = useCallback(
    (id: string) => setRecipients((list) => list.filter((r) => r.id !== id)),
    [setRecipients],
  )

  const addRecipient = (values: FieldValues = {}) => {
    const last = recipients[recipients.length - 1]
    // Carry over the previous row for fields that usually repeat across a cohort.
    const carried: FieldValues = {}
    if (last) {
      for (const f of preset.fields) {
        if (f.source === 'variable' && !f.unique && f.id !== 'recipientName') {
          carried[f.id] = last.values[f.id] ?? ''
        }
      }
    }
    const recipient = createRecipient(preset, { ...carried, ...values })
    setRecipients([...recipients, recipient])
    setPreviewId(recipient.id)
  }

  const importRecipients = (list: Recipient[], mode: 'append' | 'replace', numbered: number) => {
    setRecipients(mode === 'replace' ? list : [...recipients, ...list])
    setPreviewId(list[0]?.id ?? null)
    notify('success', `Added ${list.length} certificates${numbered ? `, ${numbered} numbered automatically` : ''}.`)
  }

  const loadSample = () => {
    const list = sampleRecipients(preset)
    if (!list.length) {
      notify('info', 'This design has no sample data.')
      return
    }
    setRecipients(list)
    setPreviewId(list[0].id)
    notify('info', `Loaded ${list.length} sample rows.`)
  }

  const fillMissing = () => {
    if (!numberField) return
    const result = fillMissingNumbers(recipients, numberField)
    setRecipients(result.recipients)
    notify('success', `Assigned ${result.filled} ${result.filled === 1 ? 'number' : 'numbers'}.`)
  }

  const renumber = async () => {
    if (!numberField) return
    const existing = recipients.filter((r) => (r.values[numberField] ?? '').trim()).length
    const ok = await confirm({
      title: 'Renumber all certificates?',
      message: (
        <>
          All {recipients.length} rows get a new 8-character code.{' '}
          {existing > 0 && <strong>{existing} existing numbers, including any you pasted, will be replaced.</strong>}
        </>
      ),
      confirmLabel: 'Renumber all',
    })
    if (!ok) return
    setRecipients(renumberAll(recipients, numberField))
    notify('success', `Renumbered ${recipients.length} certificates.`)
  }

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Remove all rows?',
      message: `This removes ${recipients.length} rows from ${preset.name}.`,
      confirmLabel: 'Remove all',
    })
    if (ok) setRecipients([])
  }

  const downloadSampleCsv = () => downloadBlob(sampleCsvBlob(preset), `${preset.id}-sample.csv`)

  const previewCertificate = useCallback(
    (id: string) => {
      setPreviewId(id)
      setSection('generator')
    },
    [setPreviewId],
  )

  // Export
  const page = template.image ? pdfPageSize({ config: templateConfig(preset), template: template.image }) : null
  const pixels = template.image ? exportPixelSize(template.image) : null
  const pageLabel = page ? `${Math.round(page.width)} × ${Math.round(page.height)} mm landscape` : '…'
  const pixelLabel = pixels ? `${pixels.width} × ${pixels.height} px` : '…'
  const previewErrors = previewRecipient ? (issues.get(previewRecipient.id) ?? []).filter((i) => i.level === 'error') : []

  const placeholderValues = certificateValues(preset, null, dateFormat)

  return (
    <>
      <DashboardLayout
        section={section}
        onSectionChange={setSection}
        counts={{ recipients: recipients.length, history: history.length, presets: presets.length }}
        header={
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            Design
            <SelectInput className="w-56" value={preset.id} onChange={(e) => setActiveId(e.target.value)}>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </label>
        }
        aside={
          section === 'generator' && (
            <>
              <TextPropertiesPanel
                preset={preset}
                elements={preset.elements}
                selected={selected}
                config={templateConfig(preset)}
                recipient={previewRecipient}
                placeholder={selected ? (placeholderValues[selected.id] ?? '') : ''}
                onSelect={setSelectedId}
                onChange={updateElement}
                onResetPosition={resetPosition}
                onRecipientChange={updateRecipient}
                onAddRecipient={addRecipient}
              />
              <ExportPanel
                preset={preset}
                current={previewRecipient}
                currentBlocked={previewErrors[0]?.message ?? null}
                total={recipients.length}
                invalidCount={issueCounts.errors}
                job={exporter.job}
                batchFormat={batchFormat}
                pageLabel={pageLabel}
                pixelLabel={pixelLabel}
                onBatchFormatChange={setBatchFormat}
                onExportPdf={() => previewRecipient && exporter.exportSingle('pdf', previewRecipient, previewIndex)}
                onExportPng={() => previewRecipient && exporter.exportSingle('png', previewRecipient, previewIndex)}
                onExportZip={() =>
                  exporter.exportZip(recipients, `${preset.id}-${todayIso()}.zip`, batchFormat)
                }
                onCancel={exporter.cancel}
                onReview={() => setSection('recipients')}
              />
            </>
          )
        }
      >
        {section === 'generator' && (
          <CertificateWorkspace
            preset={preset}
            scene={scene}
            templateError={template.error}
            reference={reference.image}
            view={view}
            onViewChange={updateView}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onElementChange={updateElement}
            onResetLayout={resetLayout}
            recipients={recipients}
            previewRecipient={previewRecipient}
            previewIssues={previewRecipient ? (issues.get(previewRecipient.id) ?? []) : []}
            onPreview={setPreviewId}
            onManageRecipients={() => setSection('recipients')}
          />
        )}
        {section === 'presets' && (
          <PresetSettings
            presets={presets}
            active={preset}
            modified={modified}
            onActivate={setActiveId}
            onChange={updatePreset}
            onFieldChange={updateField}
            onDuplicate={duplicatePreset}
            onDelete={deletePreset}
            onReset={resetPreset}
            onExport={exportPreset}
            onImport={(file) => void importPreset(file)}
          />
        )}
        {section === 'template' && (
          <TemplateSettings
            preset={preset}
            template={template.image}
            pageLabel={pageLabel}
            pixelLabel={pixelLabel}
            dateFormat={dateFormat}
            hideQr={hideQr}
            onDateFormatChange={setDateFormat}
            onHideQrChange={setHideQr}
            onResetLayout={resetLayout}
            numbering={
              numberField ? (
                <CertificateNumberSettings
                  recipientCount={recipients.length}
                  missingCount={recipients.filter((r) => !(r.values[numberField] ?? '').trim()).length}
                  onFillMissing={fillMissing}
                  onRenumberAll={renumber}
                />
              ) : null
            }
          />
        )}
        {section === 'recipients' && (
          <RecipientData
            preset={preset}
            recipients={recipients}
            duplicates={duplicates}
            errorCount={issueCounts.errors}
            warningCount={issueCounts.warnings}
            previewId={previewRecipient?.id ?? null}
            onChange={updateRecipient}
            onRemove={removeRecipient}
            onPreview={previewCertificate}
            onAdd={() => addRecipient()}
            onImport={() => setImporterOpen(true)}
            onSampleCsv={downloadSampleCsv}
            onLoadSample={loadSample}
            onFillMissing={fillMissing}
            onClearAll={clearAll}
          />
        )}
        {section === 'history' && <ExportHistory records={history} onClear={() => setHistory([])} />}
      </DashboardLayout>

      <CSVImporter
        open={importerOpen}
        preset={preset}
        existing={recipients}
        onClose={() => setImporterOpen(false)}
        onImport={importRecipients}
        onSampleCsv={downloadSampleCsv}
      />
      <ConfirmDialog options={confirmOptions} onResolve={resolveConfirm} />
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
