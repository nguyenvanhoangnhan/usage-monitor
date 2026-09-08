import type { UsageSnapshot, UsageWindow } from '@shared/types/usage'
import type { ClaudeStatuslinePayload } from './schema'

const FIVE_HOURS = 5 * 60 * 60
const SEVEN_DAYS = 7 * 24 * 60 * 60

/**
 * Builds a snapshot from a statusline payload. Returns null when the payload
 * carries no rate limit block yet (first response of a session not received).
 */
export function mapClaudeStatusline(
  payload: ClaudeStatuslinePayload,
  fetchedAt: number
): UsageSnapshot | null {
  const limits = payload.rate_limits
  if (!limits) return null

  const windows: UsageWindow[] = []
  if (limits.five_hour) {
    windows.push({
      kind: 'session',
      id: 'five_hour',
      usedPercent: limits.five_hour.used_percentage,
      resetsAt: toMillis(limits.five_hour.resets_at),
      windowSeconds: FIVE_HOURS
    })
  }
  if (limits.seven_day) {
    windows.push({
      kind: 'weekly',
      id: 'seven_day',
      usedPercent: limits.seven_day.used_percentage,
      resetsAt: toMillis(limits.seven_day.resets_at),
      windowSeconds: SEVEN_DAYS
    })
  }
  if (limits.spend_limit) {
    windows.push({
      kind: 'extra',
      id: 'spend_limit',
      label: 'Spend limit',
      usedPercent: limits.spend_limit.used_percentage,
      resetsAt: toMillis(limits.spend_limit.resets_at)
    })
  }
  if (windows.length === 0) return null

  return { provider: 'claude', fetchedAt, windows }
}

function toMillis(seconds: number | null | undefined): number | null {
  return typeof seconds === 'number' ? seconds * 1000 : null
}
