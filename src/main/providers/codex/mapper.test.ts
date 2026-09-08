import { describe, expect, it } from 'vitest'
import { codexUsageSchema } from './schema'
import { mapCodexUsage } from './mapper'

const NOW = 1_700_000_000_000

const sample = {
  plan_type: 'plus',
  rate_limit: {
    allowed: true,
    limit_reached: false,
    primary_window: {
      used_percent: 20,
      limit_window_seconds: 18000,
      reset_after_seconds: 14400,
      reset_at: 1704081600
    },
    secondary_window: {
      used_percent: 50,
      limit_window_seconds: 604800,
      reset_after_seconds: 432000,
      reset_at: 1704499200
    }
  },
  additional_rate_limits: [
    {
      limit_name: 'gpt-5.3-codex-spark',
      rate_limit: {
        primary_window: { used_percent: 5, limit_window_seconds: 18000, reset_after_seconds: 100 }
      }
    }
  ],
  credits: { balance: 3 }
}

describe('mapCodexUsage', () => {
  it('classifies windows by length and converts reset_at to milliseconds', () => {
    const parsed = codexUsageSchema.parse(sample)
    const snapshot = mapCodexUsage(parsed, NOW)

    expect(snapshot.provider).toBe('codex')
    expect(snapshot.planType).toBe('plus')
    const session = snapshot.windows.find((w) => w.kind === 'session')
    const weekly = snapshot.windows.find((w) => w.kind === 'weekly')
    expect(session).toMatchObject({ id: 'primary', usedPercent: 20, resetsAt: 1704081600 * 1000 })
    expect(weekly).toMatchObject({ id: 'secondary', usedPercent: 50, resetsAt: 1704499200 * 1000 })
  })

  it('does not rely on primary/secondary order', () => {
    const swapped = {
      rate_limit: {
        primary_window: { used_percent: 1, limit_window_seconds: 604800 },
        secondary_window: { used_percent: 2, limit_window_seconds: 18000 }
      }
    }
    const snapshot = mapCodexUsage(codexUsageSchema.parse(swapped), NOW)
    expect(snapshot.windows.find((w) => w.kind === 'weekly')?.usedPercent).toBe(1)
    expect(snapshot.windows.find((w) => w.kind === 'session')?.usedPercent).toBe(2)
  })

  it('maps additional limits to extra windows with a label and relative reset', () => {
    const snapshot = mapCodexUsage(codexUsageSchema.parse(sample), NOW)
    const extra = snapshot.windows.filter((w) => w.kind === 'extra')
    expect(extra).toHaveLength(1)
    expect(extra[0].label).toBe('gpt-5.3-codex-spark 5h')
    expect(extra[0].resetsAt).toBe(NOW + 100_000)
  })

  it('demotes a duplicate window kind to extra', () => {
    const twoWeekly = {
      rate_limit: {
        primary_window: { used_percent: 1, limit_window_seconds: 604800 },
        secondary_window: { used_percent: 2, limit_window_seconds: 604800 }
      }
    }
    const snapshot = mapCodexUsage(codexUsageSchema.parse(twoWeekly), NOW)
    expect(snapshot.windows.map((w) => w.kind)).toEqual(['weekly', 'extra'])
  })

  it('returns no windows when rate_limit is missing', () => {
    const snapshot = mapCodexUsage(codexUsageSchema.parse({ plan_type: 'free' }), NOW)
    expect(snapshot.windows).toEqual([])
  })
})
