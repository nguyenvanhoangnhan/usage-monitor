/** Single source of truth for how a percentage maps to a visual level. */

export type UsageLevel = 'normal' | 'warn' | 'critical'

export const THRESHOLDS = { warn: 60, critical: 85 } as const

export function usageLevel(usedPercent: number): UsageLevel {
  if (usedPercent >= THRESHOLDS.critical) return 'critical'
  if (usedPercent >= THRESHOLDS.warn) return 'warn'
  return 'normal'
}

/** Clamp for rendering; spend limits can legitimately exceed 100. */
export function clampPercent(value: number, max = 100): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), max)
}

export function remainingPercent(usedPercent: number): number {
  return clampPercent(100 - usedPercent)
}
