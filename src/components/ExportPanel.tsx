import { CircleAlert, FileArchive, FileDown, ImageDown, ShieldCheck } from 'lucide-react'
import type { ExportJob } from '../hooks/useExporter'
import type { Recipient } from '../types'
import { Button } from './ui'

interface Props {
  current: Recipient | null
  currentBlocked: string | null
  total: number
  invalidCount: number
  globalDateMissing: boolean
  job: ExportJob | null
  pageLabel: string
  pixelLabel: string
  onExportPdf: () => void
  onExportPng: () => void
  onExportZip: () => void
  onCancel: () => void
  onReview: () => void
}

export function ExportPanel({
  current,
  currentBlocked,
  total,
  invalidCount,
  globalDateMissing,
  job,
  pageLabel,
  pixelLabel,
  onExportPdf,
  onExportPng,
  onExportZip,
  onCancel,
  onReview,
}: Props) {
  const busy = job !== null
  const batchBlocked = total === 0 || invalidCount > 0 || globalDateMissing
  const percent = job ? Math.round((job.done / job.total) * 100) : 0

  return (
    <div className="space-y-4 px-4 py-4">
      <h3 className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Export</h3>

      <div className="space-y-2">
        <p className="truncate text-xs text-slate-500">
          Current: <span className="font-medium text-slate-700">{current?.recipientName || (current ? '(no name)' : 'none')}</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            icon={FileDown}
            disabled={!current || busy || !!currentBlocked}
            loading={busy && job?.kind === 'pdf'}
            onClick={onExportPdf}
          >
            PDF
          </Button>
          <Button
            variant="secondary"
            icon={ImageDown}
            disabled={!current || busy || !!currentBlocked}
            loading={busy && job?.kind === 'png'}
            onClick={onExportPng}
          >
            PNG
          </Button>
        </div>
        {currentBlocked && <p className="text-xs text-red-600">{currentBlocked}</p>}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <Button
          variant="primary"
          icon={FileArchive}
          className="w-full"
          disabled={batchBlocked || busy}
          loading={busy && job?.kind === 'zip'}
          onClick={onExportZip}
        >
          Download all as ZIP{total ? ` (${total})` : ''}
        </Button>
        <p className="text-xs text-slate-500">One PDF per recipient, bundled in a single ZIP file.</p>

        {job?.kind === 'zip' && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3" role="status">
            <div className="flex items-center justify-between text-xs font-medium text-blue-900">
              <span>{job.phase === 'packaging' ? 'Packaging ZIP…' : `Generating ${job.done} of ${job.total}`}</span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${percent}%` }} />
            </div>
            <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={onCancel} disabled={job.phase === 'packaging'}>
              Cancel
            </Button>
          </div>
        )}

        {!busy && total > 0 && (invalidCount > 0 || globalDateMissing) && (
          <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <CircleAlert className="mt-px size-3.5 shrink-0" />
            <div>
              {globalDateMissing
                ? 'Set the global issue date before exporting.'
                : `${invalidCount} ${invalidCount === 1 ? 'recipient has' : 'recipients have'} errors to fix before exporting all.`}{' '}
              {!globalDateMissing && (
                <button type="button" className="font-medium underline" onClick={onReview}>
                  Review
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <p>
          PDF page: {pageLabel} · {pixelLabel}
        </p>
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-600" /> Generated in this browser. Nothing is uploaded.
        </p>
      </div>
    </div>
  )
}
