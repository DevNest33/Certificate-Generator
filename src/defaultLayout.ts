import { fontStack } from './lib/fonts'
import { CAP_CENTER, LINE_HEIGHT, type LaidOutText } from './lib/layout'
import type { FieldId, TemplateConfig, TextAlign, TextElement } from './types'

/** Pixel size of public/certificate-template.png. Defaults below are measured in these pixels. */
const DESIGN_WIDTH = 1024
const DESIGN_HEIGHT = 724

export const TEMPLATE: TemplateConfig = {
  src: `${import.meta.env.BASE_URL}certificate-template.png`,
  referenceSrc: `${import.meta.env.BASE_URL}certificate-reference.png`,
  designWidth: DESIGN_WIDTH,
  designHeight: DESIGN_HEIGHT,
  qrArea: { x: 643 / DESIGN_WIDTH, y: 528 / DESIGN_HEIGHT, width: 127 / DESIGN_WIDTH, height: 127 / DESIGN_HEIGHT },
  qrPatchSource: { x: 830 / DESIGN_WIDTH, y: 350 / DESIGN_HEIGHT },
  pageWidthMm: 297,
}

interface PlaceSpec {
  /** Left edge, center or right edge of the box, depending on `align`. */
  anchorX: number
  /** Baseline the text should sit on. */
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
}

function place(spec: PlaceSpec): LaidOutText {
  const extra = (((spec.lines ?? 1) - 1) * spec.fontSize * LINE_HEIGHT) / 2
  const top = spec.baseline + extra - spec.height / 2 - CAP_CENTER * spec.fontSize
  return {
    id: 'text',
    x: spec.anchorX / DESIGN_WIDTH,
    y: top / DESIGN_HEIGHT,
    width: spec.width / DESIGN_WIDTH,
    height: spec.height / DESIGN_HEIGHT,
    align: spec.align,
    fontFamily: fontStack(spec.font),
    fontSize: spec.fontSize,
    fontWeight: spec.fontWeight,
    color: spec.color,
    letterSpacing: 0,
    shrinkToFit: true,
  }
}

function element(spec: PlaceSpec & { id: FieldId; name: string }): TextElement {
  return { ...place(spec), id: spec.id, name: spec.name, locked: false }
}

export interface StaticLine extends LaidOutText {
  text: string
}

/**
 * Lines printed on every certificate. They are not recipient fields.
 * Baselines are on the blank template, which sits 5px higher than the filled reference.
 */
export const STATIC_LINES: StaticLine[] = [
  {
    ...place({
      anchorX: 512,
      baseline: 333,
      width: 720,
      height: 32,
      align: 'center',
      font: 'Segoe UI',
      fontSize: 24,
      fontWeight: 400,
      color: '#1a1a1a',
    }),
    id: 'intro',
    text: 'for successfully completing a Course about',
  },
  {
    ...place({
      anchorX: 512,
      baseline: 454,
      width: 420,
      height: 32,
      align: 'center',
      font: 'Segoe UI',
      fontSize: 27,
      fontWeight: 400,
      color: '#808080',
    }),
    id: 'certifiedLabel',
    text: 'Certified No.',
  },
]

/**
 * Initial field layout, measured against the filled reference (1024×724) and shifted up 5px
 * so the gaps match the blank template's header. The issue date stays on the printed rule.
 * Font sizes are the ones whose rendered width matches that reference line.
 */
export const DEFAULT_ELEMENTS: TextElement[] = [
  element({
    id: 'recipientName',
    name: 'Recipient Name',
    anchorX: 512,
    baseline: 279,
    width: 700,
    height: 40,
    align: 'center',
    font: 'Arial',
    fontSize: 30,
    fontWeight: 400,
    color: '#5c3030',
  }),
  element({
    id: 'courseName',
    name: 'Course Name',
    anchorX: 512,
    baseline: 384,
    width: 760,
    height: 36,
    align: 'center',
    font: 'Segoe UI',
    fontSize: 26,
    fontWeight: 700,
    color: '#d24f1f',
  }),
  element({
    id: 'courseStartDate',
    name: 'Course Start Date',
    anchorX: 512,
    baseline: 415,
    width: 700,
    height: 20,
    align: 'center',
    font: 'Segoe UI',
    fontSize: 16,
    fontWeight: 400,
    color: '#222222',
  }),
  element({
    id: 'certificateNumber',
    name: 'Certificate Number',
    anchorX: 512,
    baseline: 489,
    width: 420,
    height: 30,
    align: 'center',
    font: 'Segoe UI',
    fontSize: 26,
    fontWeight: 400,
    color: '#1a1a1a',
  }),
  element({
    id: 'courseDuration',
    name: 'Course Duration',
    anchorX: 512,
    baseline: 512,
    width: 700,
    height: 18,
    align: 'center',
    font: 'Segoe UI',
    fontSize: 15,
    fontWeight: 700,
    color: '#286090',
  }),
  element({
    id: 'issueDate',
    name: 'Issue Date',
    anchorX: 908,
    baseline: 590,
    width: 160,
    height: 26,
    align: 'center',
    font: 'Segoe UI',
    fontSize: 22,
    fontWeight: 400,
    color: '#1a1a1a',
  }),
]
