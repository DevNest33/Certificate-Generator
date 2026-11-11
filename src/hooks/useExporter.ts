import { useCallback, useRef, useState } from 'react'
import type { CertificateScene } from '../lib/drawCertificate'
import { certificateFileName, downloadBlob, formatBytes, uniqueFileName } from '../lib/download'
import { renderPdf, renderPng, renderZip } from '../lib/exporter'
import { newId, recipientLabel } from '../lib/recipients'
import type { BatchFormat, ExportKind, ExportRecord, Preset, Recipient } from '../types'
import type { ToastTone } from './useToasts'

export interface ExportJob {
  kind: ExportKind
  done: number
  total: number
  phase: 'rendering' | 'packaging'
}

interface Options {
  preset: Preset
  sceneFor: (recipient: Recipient) => CertificateScene | null
  notify: (tone: ToastTone, message: string) => void
  onRecord: (record: ExportRecord) => void
}

export function useExporter({ preset, sceneFor, notify, onRecord }: Options) {
  const [job, setJob] = useState<ExportJob | null>(null)
  // A ref, not state, so a double click cannot start a second job before React re-renders.
  const busy = useRef(false)
  const abort = useRef<AbortController | null>(null)

  const titleFor = useCallback(
    (recipient: Recipient) => `${preset.name} - ${recipientLabel(preset, recipient)}`,
    [preset],
  )

  const run = useCallback(
    async (kind: ExportKind, total: number, fileName: string, work: (signal: AbortSignal) => Promise<Blob>) => {
      if (busy.current) return
      busy.current = true
      const controller = new AbortController()
      abort.current = controller
      setJob({ kind, done: 0, total, phase: 'rendering' })
      const record = { id: newId(), at: Date.now(), kind, fileName, count: total, presetName: preset.name }
      try {
        await document.fonts?.ready
        const blob = await work(controller.signal)
        downloadBlob(blob, fileName)
        onRecord({ ...record, bytes: blob.size, status: 'success' })
        notify('success', `Downloaded ${fileName} (${formatBytes(blob.size)}).`)
      } catch (error) {
        if (controller.signal.aborted) {
          onRecord({ ...record, bytes: 0, status: 'cancelled' })
          notify('info', 'Export cancelled.')
        } else {
          const message = error instanceof Error ? error.message : String(error)
          onRecord({ ...record, bytes: 0, status: 'error', message })
          notify('error', `Export failed: ${message}`)
        }
      } finally {
        busy.current = false
        abort.current = null
        setJob(null)
      }
    },
    [notify, onRecord, preset.name],
  )

  const exportSingle = useCallback(
    (kind: 'pdf' | 'png', recipient: Recipient, index: number) => {
      const scene = sceneFor(recipient)
      if (!scene) return
      const fileName = certificateFileName(preset, recipient, index, kind)
      void run(kind, 1, fileName, async () => (kind === 'pdf' ? renderPdf(scene, titleFor(recipient)) : renderPng(scene)))
    },
    [preset, run, sceneFor, titleFor],
  )

  const exportZip = useCallback(
    (recipients: Recipient[], zipName: string, format: BatchFormat) => {
      const used = new Set<string>()
      const fileNames = recipients.map((r, i) => uniqueFileName(certificateFileName(preset, r, i, format), used))
      void run('zip', recipients.length, zipName, async (signal) =>
        renderZip(
          recipients.length,
          (i) => {
            const scene = sceneFor(recipients[i])
            if (!scene) throw new Error('The template is not loaded.')
            return { scene, fileName: fileNames[i], title: titleFor(recipients[i]) }
          },
          format,
          (done) =>
            setJob({
              kind: 'zip',
              done,
              total: recipients.length,
              phase: done === recipients.length ? 'packaging' : 'rendering',
            }),
          signal,
        ),
      )
    },
    [preset, run, sceneFor, titleFor],
  )

  const cancel = useCallback(() => abort.current?.abort(), [])

  return { job, exportSingle, exportZip, cancel }
}
