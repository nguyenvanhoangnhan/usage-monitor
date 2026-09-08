import { describe, expect, it } from 'vitest'
import { claudeStatuslinePayloadSchema } from './schema'
import { mapClaudeStatusline } from './mapper'
import { buildStatuslineScript, shellQuote } from './statusline-script'

const MTIME = 1_700_000_000_000

describe('mapClaudeStatusline', () => {
  it('maps five_hour and seven_day with epoch-second resets', () => {
    const payload = claudeStatuslinePayloadSchema.parse({
      session_id: 's',
      model: { id: 'claude', display_name: 'Claude' },
      rate_limits: {
        five_hour: { used_percentage: 42, resets_at: 1738425600 },
        seven_day: { used_percentage: 17, resets_at: 1738857600 }
      },
      context_window: { used_percentage: 30 }
    })
    const snapshot = mapClaudeStatusline(payload, MTIME)
    expect(snapshot?.fetchedAt).toBe(MTIME)
    expect(snapshot?.windows).toEqual([
      {
        kind: 'session',
        id: 'five_hour',
        usedPercent: 42,
        resetsAt: 1738425600000,
        windowSeconds: 18000
      },
      {
        kind: 'weekly',
        id: 'seven_day',
        usedPercent: 17,
        resetsAt: 1738857600000,
        windowSeconds: 604800
      }
    ])
  })

  it('tolerates an independently missing window', () => {
    const payload = claudeStatuslinePayloadSchema.parse({
      rate_limits: { seven_day: { used_percentage: 5 } }
    })
    const snapshot = mapClaudeStatusline(payload, MTIME)
    expect(snapshot?.windows.map((w) => w.kind)).toEqual(['weekly'])
    expect(snapshot?.windows[0].resetsAt).toBeNull()
  })

  it('exposes spend_limit as an extra window', () => {
    const payload = claudeStatuslinePayloadSchema.parse({
      rate_limits: { spend_limit: { used_percentage: 120, resets_at: 1 } }
    })
    expect(mapClaudeStatusline(payload, MTIME)?.windows[0]).toMatchObject({
      kind: 'extra',
      usedPercent: 120
    })
  })

  it('returns null before the first API response (no rate_limits)', () => {
    const payload = claudeStatuslinePayloadSchema.parse({ session_id: 's', model: { id: 'x' } })
    expect(mapClaudeStatusline(payload, MTIME)).toBeNull()
  })
})

describe('statusline script', () => {
  it('quotes paths safely for sh', () => {
    expect(shellQuote("/Users/o'brien/x")).toBe(`'/Users/o'\\''brien/x'`)
  })

  it('embeds the data path and an optional chained command', () => {
    const script = buildStatuslineScript({
      dataFilePath: '/tmp/data.json',
      chainCommand: 'echo hi'
    })
    expect(script.startsWith('#!/bin/sh')).toBe(true)
    expect(script).toContain(`DATA_FILE='/tmp/data.json'`)
    expect(script).toContain(`CHAIN_COMMAND='echo hi'`)
  })

  it('leaves the chain empty when none was configured', () => {
    expect(buildStatuslineScript({ dataFilePath: '/tmp/data.json' })).toContain(`CHAIN_COMMAND=''`)
  })
})
