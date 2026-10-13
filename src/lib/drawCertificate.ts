import { STATIC_LINES } from '../defaultLayout'
import type { FieldValues, TemplateConfig, TextElement } from '../types'
import { graphemes, layoutText, type TextRun } from './layout'

export interface CertificateScene {
  template: HTMLImageElement
  config: TemplateConfig
  elements: TextElement[]
  values: FieldValues
  hideQr: boolean
}

/**
 * The only certificate renderer. The editor preview calls it inside a Konva shape and the PNG/PDF
 * exporters call it on an offscreen canvas, so positions are identical everywhere.
 */
export function drawCertificate(ctx: CanvasRenderingContext2D, scene: CertificateScene, width: number, height: number) {
  const { template, config } = scene
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(template, 0, 0, width, height)

  if (scene.hideQr) {
    const { qrArea: area, qrPatchSource: source } = config
    const iw = template.naturalWidth
    const ih = template.naturalHeight
    ctx.drawImage(
      template,
      source.x * iw,
      source.y * ih,
      area.width * iw,
      area.height * ih,
      area.x * width,
      area.y * height,
      area.width * width,
      area.height * height,
    )
  }

  for (const line of STATIC_LINES) {
    drawTextRun(ctx, layoutText(line, line.text, width, height, config.designWidth))
  }
  for (const el of scene.elements) {
    drawTextRun(ctx, layoutText(el, scene.values[el.id] ?? '', width, height, config.designWidth))
  }
  ctx.restore()
}

function drawTextRun(ctx: CanvasRenderingContext2D, run: TextRun) {
  if (!run.text) return
  ctx.font = run.font
  ctx.fillStyle = run.color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  for (const line of run.lines) {
    if (!line.text) continue
    if (!run.letterSpacing) {
      ctx.fillText(line.text, line.x, line.baseline)
      continue
    }
    let prefix = ''
    graphemes(line.text).forEach((glyph, i) => {
      ctx.fillText(glyph, line.x + ctx.measureText(prefix).width + i * run.letterSpacing, line.baseline)
      prefix += glyph
    })
  }
}
