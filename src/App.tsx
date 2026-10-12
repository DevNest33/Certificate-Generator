import { useCallback, useMemo, useState } from 'react'
import { CertificateNumberSettings } from './components/CertificateNumberSettings'
import { CertificateWorkspace } from './components/CertificateWorkspace'
import { CSVImporter } from './components/CSVImporter'
import { DashboardLayout } from './components/DashboardLayout'
import { ExportHistory } from './components/ExportHistory'
import { ExportPanel } from './components/ExportPanel'
import { GlobalDateSettings } from './components/GlobalDateSettings'
import { RecipientData } from './components/RecipientData'
import { TemplateSettings } from './components/TemplateSettings'
import { TextPropertiesPanel } from './components/TextPropertiesPanel'
import { ConfirmDialog, Toaster } from './components/ui'
import { DEFAULT_ELEMENTS, TEMPLATE } from './defaultLayout'
import { useConfirm } from './hooks/useConfirm'
import { useExporter } from './hooks/useExporter'
import { useLoadedImage } from './hooks/useLoadedImage'
import { useSessionState } from './hooks/useSessionState'
import { useToasts } from './hooks/useToasts'
import { sampleCsvBlob } from './lib/csv'
import { isValidIsoDate, todayIso } from './lib/dates'
import { downloadBlob } from './lib/download'
import type { CertificateScene } from './lib/drawCertificate'
import { exportPixelSize, pdfPageSize } from './lib/exporter'
import { fillMissingNumbers, nextFreeNumber, renumberAll } from './lib/numbering'
import {
  certificateValues,
  countIssues,
  createRecipient,
  duplicateNumbers,
  SAMPLE_RECIPIENTS,
  validateAll,
} from './lib/recipients'
import type {
  DateFormat,
  EditorView,
  ExportRecord,
  FieldId,
  Recipient,
  Section,
  TextElement,
} from './types'

/**
 * Restores a stored layout, filling in any properties missing from older sessions.
 * Layouts saved against the previous template are left-aligned value slots, so they are discarded.
 */
function reviveLayout(stored: unknown): TextElement[] {
  if (!Array.isArray(stored)) return DEFAULT_ELEMENTS
  const startDate = stored.find((s) => s?.id === 'courseStartDate')
  const certificateNumber = stored.find((s) => s?.id === 'certificateNumber')
  // Left-aligned slots belong to the labeled template. A short box is the one-line number.
  if (startDate?.align === 'left' || (certificateNumber?.height ?? 0) < 0.055) return DEFAULT_ELEMENTS
  return DEFAULT_ELEMENTS.map((d) => ({ ...d, ...(stored.find((s) => s?.id === d.id) ?? {}) }))
}

const DEFAULT_VIEW: EditorView = { zoom: 1, showGrid: false, showBounds: true, showReference: false }

export default function App() {
  const [elements, setElements] = useSessionState<TextElement[]>('certgen.v3.layout', DEFAULT_ELEMENTS, reviveLayout)
  const [recipients, setRecipients] = useSessionState<Recipient[]>('certgen.v1.recipients', [])
  const [globalIssueDate, setGlobalIssueDate] = useSessionState('certgen.v1.issueDate', todayIso)
  const [dateFormat, setDateFormat] = useSessionState<DateFormat>('certgen.v1.dateFormat', 'YYYY-MM-DD')
  const [hideQr, setHideQr] = useSessionState('certgen.v1.hideQr', false)
  const [view, setView] = useSessionState<EditorView>('certgen.v1.view', DEFAULT_VIEW)
  const [previewId, setPreviewId] = useSessionState<string | null>('certgen.v1.previewId', null)
  const [section, setSection] = useState<Section>('generator')
  const [selectedId, setSelectedId] = useState<FieldId | null>(null)
  const [importerOpen, setImporterOpen] = useState(false)
  const [history, setHistory] = useState<ExportRecord[]>([])

  const { toasts, notify, dismiss } = useToasts()
  const { confirm, options: confirmOptions, resolve: resolveConfirm } = useConfirm()
  const template = useLoadedImage(TEMPLATE.src)
  const reference = useLoadedImage(view.showReference ? TEMPLATE.referenceSrc : null)

  const issues = useMemo(() => validateAll(recipients, globalIssueDate), [recipients, globalIssueDate])
  const duplicates = useMemo(() => duplicateNumbers(recipients), [recipients])
  const issueCounts = useMemo(() => countIssues(issues), [issues])

  const previewRecipient = recipients.find((r) => r.id === previewId) ?? recipients[0] ?? null
  const previewIndex = previewRecipient ? recipients.indexOf(previewRecipient) : -1
  const selected = elements.find((el) => el.id === selectedId) ?? null

  const sceneFor = useCallback(
    (recipient: Recipient | null): CertificateScene | null =>
      template.image && {
        template: template.image,
        config: TEMPLATE,
        elements,
        values: certificateValues(recipient, globalIssueDate, dateFormat),
        hideQr,
      },
    [template.image, elements, globalIssueDate, dateFormat, hideQr],
  )
  const scene = useMemo(() => sceneFor(previewRecipient), [sceneFor, previewRecipient])

  const onRecord = useCallback((record: ExportRecord) => setHistory((list) => [record, ...list]), [])
  const exporter = useExporter({ sceneFor, notify, onRecord })

  // Layout
  const updateElement = useCallback(
    (id: FieldId, patch: Partial<TextElement>) =>
      setElements((list) => list.map((el) => (el.id === id ? { ...el, ...patch } : el))),
    [setElements],
  )

  const resetPosition = (id: FieldId) => {
    const d = DEFAULT_ELEMENTS.find((el) => el.id === id)
    if (d) updateElement(id, { x: d.x, y: d.y, width: d.width, height: d.height, align: d.align })
  }

  const resetLayout = async () => {
    const ok = await confirm({
      title: 'Reset layout?',
      message: 'All six text fields go back to their original positions, sizes and styles. Recipient data is not affected.',
      confirmLabel: 'Reset layout',
    })
    if (!ok) return
    setElements(DEFAULT_ELEMENTS)
    notify('success', 'Layout reset to the original positions.')
  }

  const updateView = useCallback((patch: Partial<EditorView>) => setView((v) => ({ ...v, ...patch })), [setView])

  // Recipients
  const updateRecipient = useCallback(
    (id: string, patch: Partial<Recipient>) =>
      setRecipients((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    [setRecipients],
  )

  const removeRecipient = useCallback(
    (id: string) => setRecipients((list) => list.filter((r) => r.id !== id)),
    [setRecipients],
  )

  const addRecipient = (values: Partial<Omit<Recipient, 'id'>> = {}) => {
    const last = recipients[recipients.length - 1]
    const recipient = createRecipient({
      certificateNumber: nextFreeNumber(recipients),
      courseName: last?.courseName ?? '',
      courseStartDate: last?.courseStartDate ?? '',
      courseDuration: last?.courseDuration ?? '',
      ...values,
    })
    setRecipients([...recipients, recipient])
    setPreviewId(recipient.id)
  }

  const importRecipients = (list: Recipient[], mode: 'append' | 'replace', numbered: number) => {
    setRecipients(mode === 'replace' ? list : [...recipients, ...list])
    setPreviewId(list[0]?.id ?? null)
    notify('success', `Imported ${list.length} recipients${numbered ? `, ${numbered} numbered automatically` : ''}.`)
  }

  const loadSample = () => {
    const { recipients: list } = fillMissingNumbers(SAMPLE_RECIPIENTS.map((r) => createRecipient(r)))
    setRecipients(list)
    setPreviewId(list[0].id)
    notify('info', `Loaded ${list.length} sample recipients.`)
  }

  const fillMissing = () => {
    const result = fillMissingNumbers(recipients)
    setRecipients(result.recipients)
    notify('success', `Assigned ${result.filled} certificate ${result.filled === 1 ? 'number' : 'numbers'}.`)
  }

  const renumber = async () => {
    const existing = recipients.filter((r) => r.certificateNumber.trim()).length
    const ok = await confirm({
      title: 'Renumber all certificates?',
      message: (
        <>
          All {recipients.length} recipients get a new 8-character code.{' '}
          {existing > 0 && (
            <strong>{existing} existing numbers, including any typed in or imported, will be replaced.</strong>
          )}
        </>
      ),
      confirmLabel: 'Renumber all',
    })
    if (!ok) return
    setRecipients(renumberAll(recipients))
    notify('success', `Renumbered ${recipients.length} certificates.`)
  }

  const applyGlobalDateToAll = () => {
    setRecipients((list) => list.map((r) => ({ ...r, issueDateOverride: null })))
    notify('success', 'Every recipient now uses the global issue date.')
  }

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Remove all recipients?',
      message: `This removes ${recipients.length} recipients from this session.`,
      confirmLabel: 'Remove all',
    })
    if (ok) setRecipients([])
  }

  const downloadSampleCsv = () => downloadBlob(sampleCsvBlob(), 'certificate-recipients-sample.csv')

  const previewCertificate = useCallback(
    (id: string) => {
      setPreviewId(id)
      setSection('generator')
    },
    [setPreviewId],
  )

  // Export
  const page = template.image ? pdfPageSize({ config: TEMPLATE, template: template.image }) : null
  const pixels = template.image ? exportPixelSize(template.image) : null
  const pageLabel = page ? `${Math.round(page.width)} × ${Math.round(page.height)} mm landscape` : '…'
  const pixelLabel = pixels ? `${pixels.width} × ${pixels.height} px` : '…'
  const previewErrors = previewRecipient ? (issues.get(previewRecipient.id) ?? []).filter((i) => i.level === 'error') : []
  const globalDateMissing =
    !isValidIsoDate(globalIssueDate) && recipients.some((r) => r.issueDateOverride === null)
  const overrides = recipients.filter((r) => r.issueDateOverride !== null).length

  const placeholderValues = certificateValues(null, globalIssueDate, dateFormat)

  return (
    <>
      <DashboardLayout
        section={section}
        onSectionChange={setSection}
        counts={{ recipients: recipients.length, history: history.length }}
        header={
          <GlobalDateSettings
            value={globalIssueDate}
            total={recipients.length}
            overrides={overrides}
            onChange={setGlobalIssueDate}
          />
        }
        aside={
          section === 'generator' && (
            <>
              <TextPropertiesPanel
                elements={elements}
                selected={selected}
                config={TEMPLATE}
                recipient={previewRecipient}
                placeholder={selected ? placeholderValues[selected.id] : ''}
                globalIssueDate={globalIssueDate}
                dateFormat={dateFormat}
                onSelect={setSelectedId}
                onChange={updateElement}
                onResetPosition={resetPosition}
                onRecipientChange={updateRecipient}
                onAddRecipient={addRecipient}
              />
              <ExportPanel
                current={previewRecipient}
                currentBlocked={previewErrors[0]?.message ?? null}
                total={recipients.length}
                invalidCount={issueCounts.errors}
                globalDateMissing={globalDateMissing}
                job={exporter.job}
                pageLabel={pageLabel}
                pixelLabel={pixelLabel}
                onExportPdf={() => previewRecipient && exporter.exportSingle('pdf', previewRecipient, previewIndex)}
                onExportPng={() => previewRecipient && exporter.exportSingle('png', previewRecipient, previewIndex)}
                onExportZip={() => exporter.exportZip(recipients, `certificates-${globalIssueDate || todayIso()}.zip`)}
                onCancel={exporter.cancel}
                onReview={() => setSection('recipients')}
              />
            </>
          )
        }
      >
        {section === 'generator' && (
          <CertificateWorkspace
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
        {section === 'template' && (
          <TemplateSettings
            config={TEMPLATE}
            template={template.image}
            pageLabel={pageLabel}
            pixelLabel={pixelLabel}
            dateFormat={dateFormat}
            globalIssueDate={globalIssueDate}
            hideQr={hideQr}
            onDateFormatChange={setDateFormat}
            onHideQrChange={setHideQr}
            onResetLayout={resetLayout}
            numbering={
              <CertificateNumberSettings
                recipientCount={recipients.length}
                missingCount={recipients.filter((r) => !r.certificateNumber.trim()).length}
                onFillMissing={fillMissing}
                onRenumberAll={renumber}
              />
            }
          />
        )}
        {section === 'recipients' && (
          <RecipientData
            recipients={recipients}
            duplicates={duplicates}
            errorCount={issueCounts.errors}
            warningCount={issueCounts.warnings}
            globalIssueDate={globalIssueDate}
            dateFormat={dateFormat}
            previewId={previewRecipient?.id ?? null}
            onChange={updateRecipient}
            onRemove={removeRecipient}
            onPreview={previewCertificate}
            onAdd={() => addRecipient()}
            onImport={() => setImporterOpen(true)}
            onSampleCsv={downloadSampleCsv}
            onLoadSample={loadSample}
            onFillMissing={fillMissing}
            onUseGlobalForAll={applyGlobalDateToAll}
            onClearAll={clearAll}
          />
        )}
        {section === 'history' && <ExportHistory records={history} onClear={() => setHistory([])} />}
      </DashboardLayout>

      <CSVImporter
        open={importerOpen}
        existing={recipients}
        globalIssueDate={globalIssueDate}
        onClose={() => setImporterOpen(false)}
        onImport={importRecipients}
        onSampleCsv={downloadSampleCsv}
      />
      <ConfirmDialog options={confirmOptions} onResolve={resolveConfirm} />
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
