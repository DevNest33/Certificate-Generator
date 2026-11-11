import type { LaidOutText, TextAlign, TextElement } from '../types'

export type { LaidOutText }

/**
 * Distance from the baseline to the vertical middle of capital letters, as a fraction of the font size.
 * Text is placed so its capitals are centered in the box, which keeps the baseline stable for any content.
 */
export const CAP_CENTER = 0.35

/** Distance from one baseline to the next when a field contains more than one line. */
export const LINE_HEIGHT = 1.35

export interface PixelBox {
  left: number
  top: number
  width: number
  height: number
}

export interface TextLine {
  text: string
  x: number
  baseline: number
}

export interface TextRun {
  id: string
  text: string
  font: string
  color: string
  fontSize: number
  letterSpacing: number
  /** Left edge of the first line. */
  x: number
  baseline: number
  width: number
  lines: TextLine[]
  box: PixelBox
}

export function anchorFraction(align: TextAlign): number {
  return align === 'left' ? 0 : align === 'center' ? 0.5 : 1
}

/** The element's box in pixels on a certificate rendered at `width` × `height`. */
export function elementBox(el: Pick<LaidOutText, 'x' | 'y' | 'width' | 'height' | 'align'>, width: number, height: number): PixelBox {
  const boxWidth = el.width * width
  return {
    left: el.x * width - boxWidth * anchorFraction(el.align),
    top: el.y * height,
    width: boxWidth,
    height: el.height * height,
  }
}

/** Normalized anchor for a box whose left edge sits at `left` pixels. */
export function anchorFromLeft(left: number, boxWidth: number, align: TextAlign, width: number): number {
  return (left + boxWidth * anchorFraction(align)) / width
}

/** Changes text alignment while keeping the box where it is. */
export function realign(el: TextElement, align: TextAlign): Pick<TextElement, 'x' | 'align'> {
  const left = el.x - el.width * anchorFraction(el.align)
  return { align, x: left + el.width * anchorFraction(align) }
}

/** Moves the box so it is centered horizontally on the certificate. */
export function centerHorizontally(el: TextElement): Pick<TextElement, 'x'> {
  return { x: 0.5 - el.width / 2 + el.width * anchorFraction(el.align) }
}

export function cssFont(el: Pick<TextElement, 'fontWeight' | 'fontFamily'>, size: number): string {
  return `${el.fontWeight} ${size}px ${el.fontFamily}`
}

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

export function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text)
}

export function measureRun(ctx: CanvasRenderingContext2D, text: string, letterSpacing: number): number {
  const width = ctx.measureText(text).width
  return letterSpacing ? width + letterSpacing * Math.max(0, graphemes(text).length - 1) : width
}

let measureCtx: CanvasRenderingContext2D | null = null

function measurer(): CanvasRenderingContext2D {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  if (!measureCtx) throw new Error('This browser does not support canvas text rendering.')
  return measureCtx
}

/**
 * Greedy word wrap at the box width. A single word that is still too wide is left alone;
 * shrink-to-fit deals with it afterwards.
 */
function wrapToWidth(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  letterSpacing: number,
  available: number,
): string[] {
  const wrapped: string[] = []
  for (const line of lines) {
    const words = line.split(/\s+/).filter(Boolean)
    if (!words.length) {
      wrapped.push('')
      continue
    }
    let current = words[0]
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`
      if (measureRun(ctx, candidate, letterSpacing) <= available) current = candidate
      else {
        wrapped.push(current)
        current = word
      }
    }
    wrapped.push(current)
  }
  return wrapped
}

/**
 * Positions one text element on a certificate rendered at `width` × `height`.
 * Wrapping and shrink-to-fit are computed at the template's design size, so every
 * render size breaks and shrinks text identically.
 */
export function layoutText(el: LaidOutText, text: string, width: number, height: number, designWidth: number): TextRun {
  const ctx = measurer()
  const scale = width / designWidth
  const box = elementBox(el, width, height)
  const available = el.width * designWidth

  let rawLines = text ? text.split('\n') : []
  if (rawLines.length && el.wrap) {
    ctx.font = cssFont(el, el.fontSize)
    rawLines = wrapToWidth(ctx, rawLines, el.letterSpacing, available)
  }

  let fit = 1
  if (rawLines.length && el.shrinkToFit) {
    ctx.font = cssFont(el, el.fontSize)
    const natural = Math.max(...rawLines.map((line) => measureRun(ctx, line, el.letterSpacing)))
    if (natural > available) fit = available / natural
  }

  const fontSize = el.fontSize * fit * scale
  const letterSpacing = el.letterSpacing * fit * scale
  const font = cssFont(el, fontSize)
  ctx.font = font
  const lineHeight = fontSize * LINE_HEIGHT
  const firstBaseline =
    box.top + box.height / 2 - ((rawLines.length - 1) * lineHeight) / 2 + CAP_CENTER * fontSize
  const lines = rawLines.map((line, index) => {
    const lineWidth = line ? measureRun(ctx, line, letterSpacing) : 0
    return {
      text: line,
      x: box.left + (box.width - lineWidth) * anchorFraction(el.align),
      baseline: firstBaseline + index * lineHeight,
    }
  })

  return {
    id: el.id,
    text,
    font,
    color: el.color,
    fontSize,
    letterSpacing,
    x: lines[0]?.x ?? box.left,
    baseline: firstBaseline,
    width: lines.reduce((widest, line) => Math.max(widest, measureRun(ctx, line.text, letterSpacing)), 0),
    lines,
    box,
  }
}
