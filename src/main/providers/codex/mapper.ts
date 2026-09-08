import type { UsageSnapshot, UsageWindow, UsageWindowKind } from '@shared/types/usage'
import { kindFromWindowSeconds } from '@shared/usage/windows'
import type { CodexRateLimit, CodexUsageResponse, CodexWindow } from './schema'

/**
 * Converts the Codex usage payload into the shared snapshot. Windows are
 * classified by length, never by their primary/secondary position.
 */
export function mapCodexUsage(response: CodexUsageResponse, now = Date.now()): UsageSnapshot {
  const windows: UsageWindow[] = []
  const seen = new Set<UsageWindowKind>()

  for (const w of rateLimitWindows(response.rate_limit, '')) {
    const kind = w.kind !== 'extra' && seen.has(w.kind) ? 'extra' : w.kind
    seen.add(kind)
    windows.push({ ...w, kind, resetsAt: resolveResetsAt(w.raw, now) })
  }

  for (const extra of response.additional_rate_limits ?? []) {
    const label = extra.limit_name ?? extra.name ?? extra.model ?? 'extra'
    for (const w of rateLimitWindows(extra.rate_limit, `${label}:`)) {
      windows.push({
        ...w,
        kind: 'extra',
        label: `${label} ${w.kind === 'session' ? '5h' : w.kind === 'weekly' ? '7d' : ''}`.trim(),
        resetsAt: resolveResetsAt(w.raw, now)
      })
    }
  }

  return {
    provider: 'codex',
    fetchedAt: now,
    windows,
    planType: response.plan_type ?? undefined
  }
}

interface RawWindow extends Omit<UsageWindow, 'resetsAt'> {
  raw: CodexWindow
}

function rateLimitWindows(limit: CodexRateLimit | null | undefined, idPrefix: string): RawWindow[] {
  if (!limit) return []
  const out: RawWindow[] = []
  const entries: Array<[string, CodexWindow | null | undefined]> = [
    ['primary', limit.primary_window],
    ['secondary', limit.secondary_window]
  ]
  for (const [id, raw] of entries) {
    if (!raw) continue
    out.push({
      id: `${idPrefix}${id}`,
      kind: kindFromWindowSeconds(raw.limit_window_seconds),
      usedPercent: raw.used_percent,
      windowSeconds: raw.limit_window_seconds,
      raw
    })
  }
  return out
}

/** `reset_at` is epoch seconds; `reset_after_seconds` is relative to the fetch time. */
function resolveResetsAt(raw: CodexWindow, now: number): number | null {
  if (typeof raw.reset_at === 'number') return raw.reset_at * 1000
  if (typeof raw.reset_after_seconds === 'number') return now + raw.reset_after_seconds * 1000
  return null
}
