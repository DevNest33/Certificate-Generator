import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useElementSize } from '../hooks/useElementSize'
import type { CertificateScene } from '../lib/drawCertificate'
import { centerHorizontally, realign } from '../lib/layout'
import { stepZoom } from '../lib/zoom'
import type { EditorView, FieldId, Recipient, TextElement, ValidationIssue } from '../types'
import { CertificateCanvas } from './CertificateCanvas'
import { EditorToolbar } from './EditorToolbar'
import { RecipientPicker } from './RecipientPicker'

const PADDING = 32

interface Props {
  scene: CertificateScene | null
  templateError: string | null
  reference: HTMLImageElement | null
  view: EditorView
  onViewChange: (patch: Partial<EditorView>) => void
  selectedId: FieldId | null
  onSelect: (id: FieldId | null) => void
  onElementChange: (id: FieldId, patch: Partial<TextElement>) => void
  onResetLayout: () => void
  recipients: Recipient[]
  previewRecipient: Recipient | null
  previewIssues: ValidationIssue[]
  onPreview: (id: string) => void
  onManageRecipients: () => void
}

export function CertificateWorkspace({
  scene,
  templateError,
  reference,
  view,
  onViewChange,
  selectedId,
  onSelect,
  onElementChange,
  onResetLayout,
  recipients,
  previewRecipient,
  previewIssues,
  onPreview,
  onManageRecipients,
}: Props) {
  const viewport = useRef<HTMLDivElement>(null)
  const size = useElementSize(viewport)
  const selected = scene?.elements.find((el) => el.id === selectedId) ?? null

  const aspect = scene ? scene.template.naturalWidth / scene.template.naturalHeight : 1024 / 724
  const fitWidth = Math.max(240, Math.min(size.width - PADDING * 2, (size.height - PADDING * 2) * aspect))
  const width = Math.round(fitWidth * view.zoom)
  const height = Math.round(width / aspect)

  // Ctrl/Cmd + wheel zooms. Needs a non-passive listener to stop the browser from zooming the page.
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const next = stepZoom(view.zoom, e.deltaY < 0 ? 1 : -1)
      if (next !== view.zoom) onViewChange({ zoom: next })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [view.zoom, onViewChange])

  // Arrow keys nudge the selected field by one template pixel, Shift+arrow by ten. Escape deselects.
  useEffect(() => {
    if (!selected || !scene) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'Escape') {
        onSelect(null)
        return
      }
      if (selected.locked) return
      const step = e.shiftKey ? 10 : 1
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      if (!dx && !dy) return
      e.preventDefault()
      onElementChange(selected.id, {
        x: selected.x + dx / scene.config.designWidth,
        y: selected.y + dy / scene.config.designHeight,
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, scene, onElementChange, onSelect])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <EditorToolbar
        view={view}
        onViewChange={onViewChange}
        selected={selected}
        onAlign={(align) => selected && onElementChange(selected.id, realign(selected, align))}
        onCenterOnPage={() => selected && onElementChange(selected.id, centerHorizontally(selected))}
        onToggleLock={() => selected && onElementChange(selected.id, { locked: !selected.locked })}
        onResetLayout={onResetLayout}
      />
      <div ref={viewport} className="min-h-0 flex-1 overflow-auto bg-slate-200/70">
        <div className="flex min-h-full min-w-max p-8">
          <div className="m-auto">
            {scene ? (
              <div className="bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12),0_8px_24px_rgba(15,23,42,0.08)]" style={{ width, height }}>
                <CertificateCanvas
                  scene={scene}
                  reference={view.showReference ? reference : null}
                  width={width}
                  height={height}
                  selectedId={selectedId}
                  showGrid={view.showGrid}
                  showBounds={view.showBounds}
                  onSelect={onSelect}
                  onChange={onElementChange}
                />
              </div>
            ) : templateError ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-700">
                <TriangleAlert className="size-4" />
                {templateError}. Check that public/certificate-template.png exists.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="size-4 animate-spin" /> Loading template…
              </div>
            )}
          </div>
        </div>
      </div>
      <RecipientPicker
        recipients={recipients}
        current={previewRecipient}
        issues={previewIssues}
        onPick={onPreview}
        onManage={onManageRecipients}
      />
    </div>
  )
}
