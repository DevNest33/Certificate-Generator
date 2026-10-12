export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

/** Next zoom level in `direction` (1 = in, -1 = out), clamped to the available steps. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const index = ZOOM_STEPS.indexOf(zoom)
  const current = index === -1 ? ZOOM_STEPS.indexOf(1) : index
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, current + direction))]
}
