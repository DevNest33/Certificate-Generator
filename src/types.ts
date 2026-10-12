export type FieldId =
  | 'recipientName'
  | 'courseName'
  | 'courseStartDate'
  | 'certificateNumber'
  | 'courseDuration'
  | 'issueDate'

export type TextAlign = 'left' | 'center' | 'right'

/**
 * A variable text field drawn on top of the template.
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
  locked: boolean
}

export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export interface TemplateConfig {
  src: string
  referenceSrc: string
  /** Pixel size the template artwork was designed at. Font sizes are expressed at this width. */
  designWidth: number
  designHeight: number
  /** Area covered by the decorative QR-like graphic. */
  qrArea: NormalizedRect
  /** Top-left corner of a blank area of the same size, copied over the QR graphic when it is hidden. */
  qrPatchSource: { x: number; y: number }
  /** PDF page width in millimetres. The page height follows the template aspect ratio. */
  pageWidthMm: number
}

export interface Recipient {
  id: string
  recipientName: string
  courseName: string
  /** ISO `YYYY-MM-DD`. Empty when unknown. */
  courseStartDate: string
  certificateNumber: string
  courseDuration: string
  /** ISO `YYYY-MM-DD`. `null` means the recipient uses the global issue date. */
  issueDateOverride: string | null
}

export type RecipientTextKey = 'recipientName' | 'courseName' | 'courseStartDate' | 'certificateNumber' | 'courseDuration'

export type FieldValues = Record<FieldId, string>

export type DateFormat = 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'D MMMM YYYY' | 'MMMM D, YYYY'

export interface ValidationIssue {
  field: FieldId
  level: 'error' | 'warning'
  message: string
}

export type ExportKind = 'pdf' | 'png' | 'zip'

export interface ExportRecord {
  id: string
  at: number
  kind: ExportKind
  fileName: string
  count: number
  bytes: number
  status: 'success' | 'error' | 'cancelled'
  message?: string
}

export type Section = 'generator' | 'template' | 'recipients' | 'history'

export interface EditorView {
  /** 1 = fit the certificate to the workspace. */
  zoom: number
  showGrid: boolean
  showBounds: boolean
  showReference: boolean
}
