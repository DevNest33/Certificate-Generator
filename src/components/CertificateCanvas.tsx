import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Image as KonvaImage, Layer, Line, Shape, Stage, Transformer } from 'react-konva'
import { drawCertificate, type CertificateScene } from '../lib/drawCertificate'
import type { FieldId, TextElement } from '../types'
import { EditableTextElement } from './EditableTextElement'

interface Props {
  scene: CertificateScene
  reference: HTMLImageElement | null
  width: number
  height: number
  selectedId: FieldId | null
  showGrid: boolean
  showBounds: boolean
  onSelect: (id: FieldId | null) => void
  onChange: (id: FieldId, patch: Partial<TextElement>) => void
}

const GRID_COLUMNS = 20

export function CertificateCanvas({
  scene,
  reference,
  width,
  height,
  selectedId,
  showGrid,
  showBounds,
  onSelect,
  onChange,
}: Props) {
  const nodes = useRef(new Map<FieldId, Konva.Rect>())
  const transformer = useRef<Konva.Transformer>(null)
  const [guideX, setGuideX] = useState<number | null>(null)
  const selected = scene.elements.find((el) => el.id === selectedId) ?? null

  const registerNode = useCallback((id: FieldId, node: Konva.Rect | null) => {
    if (node) nodes.current.set(id, node)
    else nodes.current.delete(id)
  }, [])

  useEffect(() => {
    const tr = transformer.current
    if (!tr) return
    const node = selected && !selected.locked ? nodes.current.get(selected.id) : undefined
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  }, [selected, width, height])

  const deselectOnEmpty = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) onSelect(null)
  }

  const step = width / GRID_COLUMNS
  const gridLines: number[][] = []
  if (showGrid) {
    for (let x = step; x < width; x += step) gridLines.push([x, 0, x, height])
    for (let y = step; y < height; y += step) gridLines.push([0, y, width, y])
  }

  return (
    <Stage width={width} height={height} onMouseDown={deselectOnEmpty} onTouchStart={deselectOnEmpty}>
      <Layer listening={false}>
        <Shape sceneFunc={(context) => drawCertificate(context._context, scene, width, height)} />
        {reference && <KonvaImage image={reference} width={width} height={height} opacity={0.45} />}
      </Layer>
      <Layer>
        {showGrid && (
          <>
            {gridLines.map((points, i) => (
              <Line key={i} points={points} stroke="rgba(37,99,235,0.12)" strokeWidth={1} listening={false} />
            ))}
            <Line points={[width / 2, 0, width / 2, height]} stroke="rgba(37,99,235,0.35)" listening={false} />
            <Line points={[0, height / 2, width, height / 2]} stroke="rgba(37,99,235,0.35)" listening={false} />
          </>
        )}
        {guideX !== null && (
          <Line points={[guideX, 0, guideX, height]} stroke="#db2777" strokeWidth={1} dash={[5, 4]} listening={false} />
        )}
        {scene.elements.map((el) => (
          <EditableTextElement
            key={el.id}
            element={el}
            stageWidth={width}
            stageHeight={height}
            selected={el.id === selectedId}
            showBounds={showBounds}
            snap={showGrid}
            registerNode={registerNode}
            onSelect={onSelect}
            onChange={onChange}
            onGuide={setGuideX}
          />
        ))}
        <Transformer
          ref={transformer}
          rotateEnabled={false}
          flipEnabled={false}
          keepRatio={false}
          ignoreStroke
          enabledAnchors={['middle-left', 'middle-right', 'top-center', 'bottom-center']}
          anchorSize={8}
          anchorCornerRadius={2}
          anchorStroke="#2563eb"
          borderStroke="#2563eb"
          borderStrokeWidth={0}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 12 || newBox.height < 8 ? oldBox : newBox)}
        />
      </Layer>
    </Stage>
  )
}
