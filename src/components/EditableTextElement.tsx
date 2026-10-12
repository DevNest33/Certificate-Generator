import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useState } from 'react'
import { Group, Label, Rect, Tag, Text } from 'react-konva'
import { anchorFromLeft, elementBox, type PixelBox } from '../lib/layout'
import type { FieldId, TextAlign, TextElement } from '../types'

const SNAP_DISTANCE = 6
const LABEL_FONT = '"Segoe UI", system-ui, sans-serif'
const LABEL_FONT_SIZE = 10
const LABEL_PADDING = 3
const LABEL_HEIGHT = LABEL_FONT_SIZE + LABEL_PADDING * 2
/** Clears the transformer's side handles. */
const LABEL_GAP = 8

let labelMeasure: CanvasRenderingContext2D | null = null

function labelWidth(text: string): number {
  labelMeasure ??= document.createElement('canvas').getContext('2d')
  if (!labelMeasure) return text.length * 6 + LABEL_PADDING * 2
  labelMeasure.font = `${LABEL_FONT_SIZE}px ${LABEL_FONT}`
  return labelMeasure.measureText(text).width + LABEL_PADDING * 2
}

/**
 * The fields sit close together, so a tag above a box would cover the line above it.
 * Prefer the empty margin beside the box.
 */
function labelPosition(box: PixelBox, align: TextAlign, text: string, stageWidth: number) {
  const width = labelWidth(text)
  const middle = box.top + (box.height - LABEL_HEIGHT) / 2
  const right = box.left + box.width + LABEL_GAP
  if (right + width <= stageWidth) return { x: right, y: middle }
  if (align !== 'left' && box.left - LABEL_GAP - width >= 0) return { x: box.left - LABEL_GAP - width, y: middle }
  return { x: box.left, y: box.top > LABEL_HEIGHT + 2 ? box.top - LABEL_HEIGHT - 1 : box.top + box.height + 2 }
}

interface Props {
  element: TextElement
  stageWidth: number
  stageHeight: number
  selected: boolean
  showBounds: boolean
  snap: boolean
  registerNode: (id: FieldId, node: Konva.Rect | null) => void
  onSelect: (id: FieldId) => void
  onChange: (id: FieldId, patch: Partial<TextElement>) => void
  onGuide: (x: number | null) => void
}

function setCursor(e: KonvaEventObject<MouseEvent>, cursor: string) {
  const container = e.target.getStage()?.container()
  if (container) container.style.cursor = cursor
}

/** Editor-only hit area, outline and label for one text field. The text itself is drawn by drawCertificate. */
export function EditableTextElement({
  element: el,
  stageWidth: w,
  stageHeight: h,
  selected,
  showBounds,
  snap,
  registerNode,
  onSelect,
  onChange,
  onGuide,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const box = elementBox(el, w, h)

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    let x = Math.min(Math.max(node.x(), 0), w - box.width)
    const y = Math.min(Math.max(node.y(), 0), h - box.height)
    let guide: number | null = null
    if (snap && Math.abs(x + box.width / 2 - w / 2) < SNAP_DISTANCE) {
      x = w / 2 - box.width / 2
      guide = w / 2
    }
    node.position({ x, y })
    onGuide(guide)
    onChange(el.id, { x: anchorFromLeft(x, box.width, el.align, w), y: y / h })
  }

  const handleTransform = (e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Rect
    const width = Math.max(12, node.width() * node.scaleX())
    const height = Math.max(8, node.height() * node.scaleY())
    node.setAttrs({ width, height, scaleX: 1, scaleY: 1 })
    onChange(el.id, {
      x: anchorFromLeft(node.x(), width, el.align, w),
      y: node.y() / h,
      width: width / w,
      height: height / h,
    })
  }

  const outlined = selected || hovered || showBounds
  const labelVisible = selected || showBounds
  const labelText = el.locked ? `${el.name} (locked)` : el.name
  const label = labelPosition(box, el.align, labelText, w)

  return (
    <Group>
      <Rect
        ref={(node) => registerNode(el.id, node)}
        x={box.left}
        y={box.top}
        width={box.width}
        height={box.height}
        fill="rgba(0,0,0,0)"
        stroke={outlined ? (selected ? '#2563eb' : hovered ? '#60a5fa' : 'rgba(37,99,235,0.45)') : undefined}
        strokeWidth={selected ? 1.5 : 1}
        dash={selected || hovered ? undefined : [4, 3]}
        strokeScaleEnabled={false}
        draggable={!el.locked}
        onMouseDown={() => onSelect(el.id)}
        onTap={() => onSelect(el.id)}
        onDragStart={() => onSelect(el.id)}
        onDragMove={handleDragMove}
        onDragEnd={() => onGuide(null)}
        onTransform={handleTransform}
        onMouseEnter={(e) => {
          setHovered(true)
          setCursor(e, el.locked ? 'pointer' : 'move')
        }}
        onMouseLeave={(e) => {
          setHovered(false)
          setCursor(e, '')
        }}
      />
      {labelVisible && (
        <Label x={label.x} y={label.y} listening={false}>
          <Tag fill={selected ? '#2563eb' : 'rgba(30,64,175,0.75)'} cornerRadius={3} />
          <Text
            text={labelText}
            fontSize={LABEL_FONT_SIZE}
            fontFamily={LABEL_FONT}
            fill="#ffffff"
            padding={LABEL_PADDING}
          />
        </Label>
      )}
    </Group>
  )
}
