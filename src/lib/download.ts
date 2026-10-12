import type { Recipient } from '../types'

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Strips characters that are not allowed in Windows, macOS or Linux file names. */
export function safeFileName(value: string, fallback: string): string {
  const cleaned = Array.from(value.normalize('NFKC'))
    .filter((ch) => ch.charCodeAt(0) >= 32 && !'<>:"/\\|?*'.includes(ch))
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
  return cleaned || fallback
}

export function certificateFileName(recipient: Recipient, index: number, extension: string): string {
  const number = safeFileName(recipient.certificateNumber, String(index + 1).padStart(3, '0'))
  const name = safeFileName(recipient.recipientName, 'recipient')
  return `${number}_${name}.${extension}`
}

/** Appends -2, -3, … so two entries in a ZIP never share a name. */
export function uniqueFileName(fileName: string, used: Set<string>): string {
  const dot = fileName.lastIndexOf('.')
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName
  const extension = dot > 0 ? fileName.slice(dot) : ''
  let candidate = fileName
  for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${stem}-${n}${extension}`
  used.add(candidate.toLowerCase())
  return candidate
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
