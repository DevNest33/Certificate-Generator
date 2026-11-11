/** Field ids are declared by each preset, so they are plain strings rather than a fixed union. */
export type FieldId = string

export type TextAlign = 'left' | 'center' | 'right'

/**
 * A text box drawn on top of the template.
 * Geometry is normalized: `x` and `width` are fractions of the template width,
 * `y` and `height` are fractions of the template height.
 */
export interface TextElement {
  id: FieldId
  name: string
  /** Horizontal anchor of the box: its left edge, center or right edge depending on `align`. */
  x: number
  /** Top edge of the box. */
  y: number
  width: number
  height: number
  align: TextAlign
  /** CSS font-family list, e.g. `"Segoe UI", Arial, sans-serif`. */
  fontFamily: string
  /** Pixels at the template's design width. */
  fontSize: number
  fontWeight: number
  color: string
  /** Pixels at the template's design width. */
  letterSpacing: number
  /** Reduce the font size when the text is wider than the box. */
  shrinkToFit: boolean
  /** Break long text onto more lines at the box width instead of shrinking it. */
  wrap?: boolean
  locked: boolean
}

/** Geometry and style shared by drawn fields and the fixed lines printed on every certificate. */
export type LaidOutText = Pick<
  TextElement,
  'x' | 'y' | 'width' | 'height' | 'align' | 'fontFamily' | 'fontSize' | 'fontWeight' | 'color' | 'letterSpacing' | 'shrinkToFit' | 'wrap'
> & { id: string }

/** A line that is part of the design and prints unchanged on every certificate. */
export interface StaticLine extends LaidOutText {
  text: string
}

export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export interface TemplateConfig {
  /** Pixel size the template artwork was designed at. Font sizes are expressed at this width. */
  designWidth: number
  designHeight: number
  /** Area covered by a decorative QR-like graphic, when the design has one. */
  qrArea?: NormalizedRect
  /** Top-left corner of a blank area of the same size, copied over the QR graphic when it is hidden. */
  qrPatchSource?: { x: number; y: number }
  /** PDF page width in millimetres. The page height follows the template aspect ratio. */
  pageWidthMm: number
}

/** Where a field's text comes from. */
export type FieldSource =
  /** Supplied per certificate, from the pasted or imported data. */
  | 'variable'
  /** Typed once into the preset and printed on every certificate from it. */
  | 'fixed'
  /** Built from `pattern`, interpolating `{fieldId}` placeholders. */
  | 'template'

/** How a field's raw value is turned into printed text. */
export type FieldKind = 'text' | 'date' | 'duration'

/**
 * What a field is, independent of where it is drawn.
 * A field with no matching element only feeds `template` patterns.
 */
export interface FieldSpec {
  id: FieldId
  name: string
  source: FieldSource
  kind: FieldKind
  /** `fixed` only: the value printed on every certificate. */
  value?: string
  /** `template` only: text with `{fieldId}` placeholders. */
  pattern?: string
  /** Blank values are an error rather than a warning. */
  required?: boolean
  /** Two certificates in a batch may not share this value. */
  unique?: boolean
  /** Printed before the value, for designs whose artwork does not include the label. */
  drawnLabel?: string
  /** Shown in the editor when no certificate is selected. */
  placeholder?: string
  /** Extra CSV header names recognised for this field, normalized. */
  aliases?: string[]
}

/** One certificate design: its artwork, what data it takes and where that data is drawn. */
export interface Preset extends TemplateConfig {
  id: string
  name: string
  /** Path under the public folder, or a blob URL for a design being trialled. */
  template: string
  referenceSrc?: string
  fields: FieldSpec[]
  elements: TextElement[]
  staticLines: StaticLine[]
  /** Export file name, with `{fieldId}` placeholders. */
  fileNameTemplate: string
  /** Demo rows shown by "Load sample data". */
  samples?: Record<FieldId, string>[]
  /** True for presets that ship with the app; these can be reset rather than deleted. */
  builtIn?: boolean
}

/** One certificate's worth of data. Keys are the preset's field ids. */
export interface Recipient {
  id: string
  values: Record<FieldId, string>
}

export type FieldValues = Record<FieldId, string>

export type DateFormat = 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'D MMMM YYYY' | 'MMMM D, YYYY'

export interface ValidationIssue {
  field: FieldId
  level: 'error' | 'warning'
  message: string
}

export type ExportKind = 'pdf' | 'png' | 'zip'

export type BatchFormat = 'png' | 'pdf'

export interface ExportRecord {
  id: string
  at: number
  kind: ExportKind
  fileName: string
  count: number
  bytes: number
  status: 'success' | 'error' | 'cancelled'
  message?: string
  presetName?: string
}

export type Section = 'generator' | 'presets' | 'template' | 'recipients' | 'history'

export interface EditorView {
  /** 1 = fit the certificate to the workspace. */
  zoom: number
  showGrid: boolean
  showBounds: boolean
  showReference: boolean
}
