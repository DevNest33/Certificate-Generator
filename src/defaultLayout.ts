import { fontStack } from './lib/fonts'
import { CAP_CENTER, LINE_HEIGHT } from './lib/layout'
import type { FieldId, TemplateConfig, TextAlign, TextElement } from './types'

/** Pixel size of public/certificate-template.png. Defaults below are measured in these pixels. */
const DESIGN_WIDTH = 1024
const DESIGN_HEIGHT = 724

export const TEMPLATE: TemplateConfig = {
  src: `${import.meta.env.BASE_URL}certificate-template.png`,
  referenceSrc: `${import.meta.env.BASE_URL}certificate-reference.png`,
  designWidth: DESIGN_WIDTH,
  designHeight: DESIGN_HEIGHT,
  qrArea: { x: 630 / DESIGN_WIDTH, y: 516 / DESIGN_HEIGHT, width: 130 / DESIGN_WIDTH, height: 130 / DESIGN_HEIGHT },
  qrPatchSource: { x: 830 / DESIGN_WIDTH, y: 350 / DESIGN_HEIGHT },
  pageWidthMm: 297,
}

interface ElementSpec {
  id: FieldId
  name: string
  /** Left edge, center or right edge of the box, depending on `align`. */
  anchorX: number
  /** Baseline the text should sit on, e.g. the baseline of a printed label. */
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

function element(spec: ElementSpec): TextElement {
  const extra = (((spec.lines ?? 1) - 1) * spec.fontSize * LINE_HEIGHT) / 2
  const top = spec.baseline + extra - spec.height / 2 - CAP_CENTER * spec.fontSize
  return {
    id: spec.id,
    name: spec.name,
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
    locked: false,
  }
}

/**
 * Initial field layout, measured on the line-free template (1024×724).
 * The background prints neither the metadata labels nor the old underlines, so the name, the course
 * and the three metadata lines are each centered. Start date, certificate number and duration include
 * their labels in the drawn text.
 */
export const DEFAULT_ELEMENTS: TextElement[] = [
  element({
    id: 'recipientName',
    name: 'Recipient Name',
    anchorX: 512,
    baseline: 286,
    width: 640,
    height: 48,
    align: 'center',
    font: 'Arial',
    fontSize: 30,
    fontWeight: 400,
    color: '#5a2728',
  }),
  element({
    id: 'courseName',
    name: 'Course Name',
    anchorX: 512,
    baseline: 402,
    width: 700,
    height: 40,
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
    baseline: 436,
    width: 700,
    height: 26,
    align: 'center',
    font: 'Segoe UI',
    fontSize: 16,
    fontWeight: 400,
    color: '#222326',
  }),
  element({
    id: 'certificateNumber',
    name: 'Certificate Number',
    anchorX: 512,
    baseline: 464,
    width: 700,
    height: 52,
    lines: 2,
    align: 'center',
    font: 'Segoe UI',
    fontSize: 17,
    fontWeight: 400,
    color: '#7a7a7b',
  }),
  element({
    id: 'courseDuration',
    name: 'Course Duration',
    anchorX: 512,
    baseline: 510,
    width: 700,
    height: 26,
    align: 'center',
    font: 'Segoe UI',
    fontSize: 16,
    fontWeight: 700,
    color: '#0e3981',
  }),
  element({
    id: 'issueDate',
    name: 'Issue Date',
    anchorX: 904.5,
    baseline: 592,
    width: 154,
    height: 28,
    align: 'center',
    font: 'Segoe UI',
    fontSize: 18,
    fontWeight: 400,
    color: '#1d1e22',
  }),
]
