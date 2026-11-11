import { fontStack } from '../lib/fonts'
import { CAP_CENTER, LINE_HEIGHT } from '../lib/layout'
import type { LaidOutText, StaticLine, TextAlign, TextElement } from '../types'

/**
 * Authoring shape for a line of text, measured in the template's own design pixels.
 * Presets are easier to write and check against the artwork this way; `place` converts
 * to the normalized geometry the editor and renderer use.
 */
export interface PlaceSpec {
  /** Left edge, center or right edge of the box, depending on `align`. */
  anchorX: number
  /** Baseline the first line should sit on. */
  baseline: number
  width: number
  height: number
  align: TextAlign
  font: string
  fontSize: number
  fontWeight: number
  color: string
  /** How many lines this field draws. The baseline is the first line. */
  lines?: number
  letterSpacing?: number
  wrap?: boolean
  shrinkToFit?: boolean
}

/** Converters bound to one template's design size. */
export function designer(designWidth: number, designHeight: number) {
  function place(spec: PlaceSpec): LaidOutText {
    const extra = (((spec.lines ?? 1) - 1) * spec.fontSize * LINE_HEIGHT) / 2
    const top = spec.baseline + extra - spec.height / 2 - CAP_CENTER * spec.fontSize
    return {
      id: 'text',
      x: spec.anchorX / designWidth,
      y: top / designHeight,
      width: spec.width / designWidth,
      height: spec.height / designHeight,
      align: spec.align,
      fontFamily: fontStack(spec.font),
      fontSize: spec.fontSize,
      fontWeight: spec.fontWeight,
      color: spec.color,
      letterSpacing: spec.letterSpacing ?? 0,
      shrinkToFit: spec.shrinkToFit ?? true,
      wrap: spec.wrap ?? false,
    }
  }

  const element = (spec: PlaceSpec & { id: string; name: string }): TextElement => ({
    ...place(spec),
    id: spec.id,
    name: spec.name,
    locked: false,
  })

  const staticLine = (spec: PlaceSpec & { id: string; text: string }): StaticLine => ({
    ...place(spec),
    id: spec.id,
    text: spec.text,
  })

  return { place, element, staticLine }
}
