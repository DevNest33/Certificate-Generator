import {
  AlignCenterVertical,
  Eye,
  Grid3x3,
  Lock,
  LockOpen,
  RotateCcw,
  SquareDashed,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { stepZoom, ZOOM_STEPS } from '../lib/zoom'
import type { EditorView, TextAlign, TextElement } from '../types'
import { Button, IconButton } from './ui'

interface Props {
  view: EditorView
  onViewChange: (patch: Partial<EditorView>) => void
  selected: TextElement | null
  onAlign: (align: TextAlign) => void
  onCenterOnPage: () => void
  onToggleLock: () => void
  onResetLayout: () => void
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" />
}

export function EditorToolbar({ view, onViewChange, selected, onAlign, onCenterOnPage, onToggleLock, onResetLayout }: Props) {
  const minZoom = view.zoom <= ZOOM_STEPS[0]
  const maxZoom = view.zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]
  const noSelection = !selected
  const positionLocked = !selected || selected.locked

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-3 py-1.5">
      <IconButton
        label="Zoom out"
        icon={ZoomOut}
        disabled={minZoom}
        onClick={() => onViewChange({ zoom: stepZoom(view.zoom, -1) })}
        tooltipAlign="start"
      />
      <button
        type="button"
        title="Fit to workspace"
        onClick={() => onViewChange({ zoom: 1 })}
        className="h-8 w-14 rounded-md text-xs font-medium text-slate-600 tabular-nums hover:bg-slate-100"
      >
        {Math.round(view.zoom * 100)}%
      </button>
      <IconButton
        label="Zoom in"
        icon={ZoomIn}
        disabled={maxZoom}
        onClick={() => onViewChange({ zoom: stepZoom(view.zoom, 1) })}
      />
      <Divider />
      <IconButton
        label="Grid and center guide (snaps fields to the horizontal center)"
        icon={Grid3x3}
        active={view.showGrid}
        onClick={() => onViewChange({ showGrid: !view.showGrid })}
      />
      <IconButton
        label="Show field names and boundaries"
        icon={SquareDashed}
        active={view.showBounds}
        onClick={() => onViewChange({ showBounds: !view.showBounds })}
      />
      <IconButton
        label="Overlay the reference certificate (editor only, never exported)"
        icon={Eye}
        active={view.showReference}
        onClick={() => onViewChange({ showReference: !view.showReference })}
      />
      <Divider />
      <IconButton
        label="Align text left"
        icon={TextAlignStart}
        disabled={noSelection}
        active={selected?.align === 'left'}
        onClick={() => onAlign('left')}
      />
      <IconButton
        label="Center text"
        icon={TextAlignCenter}
        disabled={noSelection}
        active={selected?.align === 'center'}
        onClick={() => onAlign('center')}
      />
      <IconButton
        label="Align text right"
        icon={TextAlignEnd}
        disabled={noSelection}
        active={selected?.align === 'right'}
        onClick={() => onAlign('right')}
      />
      <IconButton
        label="Center the field horizontally on the certificate"
        icon={AlignCenterVertical}
        disabled={positionLocked}
        onClick={onCenterOnPage}
      />
      <IconButton
        label={selected?.locked ? 'Unlock position' : 'Lock position'}
        icon={selected?.locked ? Lock : LockOpen}
        disabled={noSelection}
        active={selected?.locked}
        onClick={onToggleLock}
      />
      <div className="ml-auto">
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={onResetLayout}>
          Reset layout
        </Button>
      </div>
    </div>
  )
}
