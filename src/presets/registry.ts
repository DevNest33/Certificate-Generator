import { newId } from '../lib/recipients'
import type { Preset, TemplateConfig } from '../types'
import { legacyDetailedPreset, legacyPreset } from './legacy'
import { participationPreset } from './participation'

/** Designs that ship with the app, newest first. */
export const BUILT_IN_PRESETS: Preset[] = [participationPreset, legacyPreset, legacyDetailedPreset]

/**
 * Resolves a preset's artwork path. Paths are relative to the public folder so they
 * work under a sub-path deployment; a blob or data URL is a design being trialled
 * before its file is committed, and is used as-is.
 */
export function assetUrl(path: string): string {
  if (!path) return ''
  if (/^(blob:|data:|https?:)/i.test(path)) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

/** The subset of a preset the renderer and the PDF page sizing need. */
export function templateConfig(preset: Preset): TemplateConfig {
  return {
    designWidth: preset.designWidth,
    designHeight: preset.designHeight,
    qrArea: preset.qrArea,
    qrPatchSource: preset.qrPatchSource,
    pageWidthMm: preset.pageWidthMm,
  }
}

/** True when the design carries a QR-like graphic that can be hidden. */
export function hasQr(preset: Preset): boolean {
  return !!preset.qrArea && !!preset.qrPatchSource
}

function isPreset(value: unknown): value is Preset {
  const p = value as Preset
  return (
    !!p &&
    typeof p === 'object' &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    Array.isArray(p.fields) &&
    Array.isArray(p.elements)
  )
}

/** Drops anything that is not a usable preset, so one bad entry cannot blank the app. */
export function revivePresets(stored: unknown): Preset[] {
  if (!Array.isArray(stored)) return []
  return stored.filter(isPreset).map((p) => ({
    ...p,
    staticLines: p.staticLines ?? [],
    fields: p.fields ?? [],
    elements: p.elements ?? [],
    fileNameTemplate: p.fileNameTemplate || '{recipientName}',
  }))
}

/**
 * The presets to show: every built-in, with a stored edit replacing it where one exists,
 * followed by the presets the user created. A stored copy of a built-in keeps `builtIn`
 * so the editor can offer "reset" rather than "delete".
 */
export function mergePresets(stored: Preset[]): Preset[] {
  const overrides = new Map(stored.map((p) => [p.id, p]))
  const builtIn = BUILT_IN_PRESETS.map((base) => {
    const saved = overrides.get(base.id)
    if (!saved) return base
    // A saved edit may predate a field being removed from the shipped design; drop those.
    const fieldIds = new Set(base.fields.map((f) => f.id))
    return {
      ...saved,
      fields: saved.fields.filter((f) => fieldIds.has(f.id)),
      elements: saved.elements.filter((el) => fieldIds.has(el.id)),
      builtIn: true,
    }
  })
  const builtInIds = new Set(BUILT_IN_PRESETS.map((p) => p.id))
  const custom = stored.filter((p) => !builtInIds.has(p.id)).map((p) => ({ ...p, builtIn: false }))
  return [...builtIn, ...custom]
}

export function isModified(stored: Preset[], id: string): boolean {
  return stored.some((p) => p.id === id)
}

/** A deep copy under a new id, so edits to it never touch the original. */
export function clonePreset(preset: Preset, name: string): Preset {
  return {
    ...structuredClone(preset),
    id: `${preset.id}-${newId().slice(0, 8)}`,
    name,
    builtIn: false,
  }
}

export function presetFileName(preset: Preset): string {
  return `${preset.id || 'preset'}.json`
}

export function presetBlob(preset: Preset): Blob {
  const { builtIn: _builtIn, ...rest } = preset
  return new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' })
}
