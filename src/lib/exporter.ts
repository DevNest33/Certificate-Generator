import { drawCertificate, type CertificateScene } from './drawCertificate'

/** Export resolution relative to the template's own pixel size. */
export const EXPORT_SCALE = 2
const JPEG_QUALITY = 0.92

export function exportPixelSize(template: HTMLImageElement) {
  return { width: template.naturalWidth * EXPORT_SCALE, height: template.naturalHeight * EXPORT_SCALE }
}

/** Landscape page with the template's aspect ratio (A4 width, so this template prints as A4). */
export function pdfPageSize(scene: Pick<CertificateScene, 'config' | 'template'>) {
  const width = scene.config.pageWidthMm
  return { width, height: (width * scene.template.naturalHeight) / scene.template.naturalWidth }
}

function renderToCanvas(scene: CertificateScene): HTMLCanvasElement {
  const { width, height } = exportPixelSize(scene.template)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('The browser could not create a canvas for the export.')
  drawCertificate(ctx, scene, width, height)
  return canvas
}

function encode(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The browser could not encode the certificate image.'))),
      type,
      quality,
    )
  })
}

/** Frees the canvas memory now instead of waiting for garbage collection. */
function release(canvas: HTMLCanvasElement) {
  canvas.width = 0
  canvas.height = 0
}

export async function renderPng(scene: CertificateScene): Promise<Blob> {
  const canvas = renderToCanvas(scene)
  try {
    return await encode(canvas, 'image/png')
  } finally {
    release(canvas)
  }
}

export async function renderPdf(scene: CertificateScene, title: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const canvas = renderToCanvas(scene)
  try {
    const jpeg = new Uint8Array(await (await encode(canvas, 'image/jpeg', JPEG_QUALITY)).arrayBuffer())
    const page = pdfPageSize(scene)
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [page.width, page.height], compress: true })
    doc.setProperties({ title, creator: 'Certificate Generator' })
    doc.addImage(jpeg, 'JPEG', 0, 0, page.width, page.height, undefined, 'NONE')
    return doc.output('blob')
  } finally {
    release(canvas)
  }
}

export interface BatchItem {
  scene: CertificateScene
  fileName: string
  title: string
}

/** Lets the browser paint and handle input between certificates. Unlike timers, this is not throttled in background tabs. */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      resolve()
    }
    channel.port2.postMessage(null)
  })
}

/** Renders one PDF per item, one at a time, and bundles them into a ZIP. */
export async function renderZip(
  count: number,
  itemAt: (index: number) => BatchItem,
  onProgress: (done: number) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (let i = 0; i < count; i++) {
    signal.throwIfAborted()
    const item = itemAt(i)
    zip.file(item.fileName, await renderPdf(item.scene, item.title))
    onProgress(i + 1)
    await yieldToBrowser()
  }
  signal.throwIfAborted()
  // PDFs already hold compressed JPEG data, so storing them uncompressed is faster and barely larger.
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
