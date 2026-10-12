export interface FontOption {
  label: string
  value: string
}

/** System font stacks only, so nothing is fetched from the network. Each stack ends in a generic fallback. */
export const FONT_OPTIONS: FontOption[] = [
  { label: 'Segoe UI', value: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Carlito, "Segoe UI", sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Garamond', value: 'Garamond, "EB Garamond", Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
]

export const FONT_WEIGHTS = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra bold' },
  { value: 900, label: 'Black' },
]

export function fontStack(label: string): string {
  const option = FONT_OPTIONS.find((f) => f.label === label)
  if (!option) throw new Error(`Unknown font "${label}"`)
  return option.value
}

const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'])

export function fontFamilies(stack: string): string[] {
  return stack
    .split(',')
    .map((family) => family.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

let probe: CanvasRenderingContext2D | null = null
const installed = new Map<string, boolean>()

/** Detects a local font by checking whether it changes text width compared with generic fallbacks. */
export function isFontInstalled(family: string): boolean {
  if (GENERIC_FAMILIES.has(family.toLowerCase())) return true
  const cached = installed.get(family)
  if (cached !== undefined) return cached
  probe ??= document.createElement('canvas').getContext('2d')
  if (!probe) return true
  const ctx = probe
  const sample = 'mmmmmmmmmmlli1WQ@#'
  const result = ['monospace', 'serif', 'sans-serif'].some((generic) => {
    ctx.font = `72px ${generic}`
    const fallbackWidth = ctx.measureText(sample).width
    ctx.font = `72px "${family}", ${generic}`
    return ctx.measureText(sample).width !== fallbackWidth
  })
  installed.set(family, result)
  return result
}

/** The family the browser will actually use for a stack. */
export function renderedFontFamily(stack: string): string {
  return fontFamilies(stack).find(isFontInstalled) ?? 'sans-serif'
}
