import type { UsageSnapshot, UsageWindow, UsageWindowKind } from '../types/usage'

export const SESSION_WINDOW_MAX_SECONDS = 24 * 60 * 60

/** Classify a window by its length: anything up to a day is a session window. */
export function kindFromWindowSeconds(seconds: number | undefined): UsageWindowKind {
  if (seconds === undefined) return 'extra'
  return seconds <= SESSION_WINDOW_MAX_SECONDS ? 'session' : 'weekly'
}

export function findWindow(
  snapshot: UsageSnapshot | null,
  kind: Exclude<UsageWindowKind, 'extra'>
): UsageWindow | undefined {
  return snapshot?.windows.find((w) => w.kind === kind)
}

export function extraWindows(snapshot: UsageSnapshot | null): UsageWindow[] {
  return snapshot?.windows.filter((w) => w.kind === 'extra') ?? []
}

/** True once the reset time has passed, meaning the reported percentage is no longer current. */
export function hasWindowReset(window: UsageWindow, now = Date.now()): boolean {
  return window.resetsAt !== null && window.resetsAt <= now
}

/** Effective percentage for display: zero after the window has reset. */
export function effectivePercent(window: UsageWindow, now = Date.now()): number {
  return hasWindowReset(window, now) ? 0 : window.usedPercent
}
