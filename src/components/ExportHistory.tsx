import { FileArchive, FileDown, ImageDown, RotateCcwClock } from 'lucide-react'
import { formatBytes } from '../lib/download'
import type { ExportRecord } from '../types'
import { Badge, Button } from './ui'

const icons = { pdf: FileDown, png: ImageDown, zip: FileArchive }

export function ExportHistory({ records, onClear }: { records: ExportRecord[]; onClear: () => void }) {
  if (!records.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
          <RotateCcwClock className="size-6 text-slate-500" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">No exports yet</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          PDFs, PNGs and ZIP files you download in this session are listed here.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-500">Kept for this browser session only. Files are generated locally.</p>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear history
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">File</th>
                <th className="px-4 py-2 font-medium">Certificates</th>
                <th className="px-4 py-2 font-medium">Size</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => {
                const Icon = icons[r.kind]
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <Icon className="size-4 text-slate-400" /> {r.fileName}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 tabular-nums">{r.count}</td>
                    <td className="px-4 py-2.5 text-slate-600 tabular-nums">{r.bytes ? formatBytes(r.bytes) : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600 tabular-nums">{new Date(r.at).toLocaleTimeString()}</td>
                    <td className="px-4 py-2.5">
                      {r.status === 'success' ? (
                        <Badge tone="green">Downloaded</Badge>
                      ) : r.status === 'cancelled' ? (
                        <Badge>Cancelled</Badge>
                      ) : (
                        <span title={r.message}>
                          <Badge tone="red">Failed</Badge>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
