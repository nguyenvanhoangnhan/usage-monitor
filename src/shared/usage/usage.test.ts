import { describe, expect, it } from 'vitest'
import { clampPercent, remainingPercent, usageLevel } from './thresholds'
import { effectivePercent, findWindow, hasWindowReset, kindFromWindowSeconds } from './windows'
import type { UsageSnapshot } from '../types/usage'

describe('thresholds', () => {
  it('maps percentages to levels', () => {
    expect(usageLevel(0)).toBe('normal')
    expect(usageLevel(59.9)).toBe('normal')
    expect(usageLevel(60)).toBe('warn')
    expect(usageLevel(85)).toBe('critical')
    expect(usageLevel(140)).toBe('critical')
  })
  it('clamps and inverts', () => {
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(150)).toBe(100)
    expect(clampPercent(Number.NaN)).toBe(0)
    expect(remainingPercent(30)).toBe(70)
    expect(remainingPercent(130)).toBe(0)
  })
})

describe('windows', () => {
  const snapshot: UsageSnapshot = {
    provider: 'codex',
    fetchedAt: 0,
    windows: [
      { kind: 'session', id: 'p', usedPercent: 40, resetsAt: 10_000 },
      { kind: 'weekly', id: 's', usedPercent: 70, resetsAt: null }
    ]
  }

  it('classifies by window length', () => {
    expect(kindFromWindowSeconds(18000)).toBe('session')
    expect(kindFromWindowSeconds(86400)).toBe('session')
    expect(kindFromWindowSeconds(604800)).toBe('weekly')
    expect(kindFromWindowSeconds(undefined)).toBe('extra')
  })

  it('finds windows and detects resets', () => {
    const session = findWindow(snapshot, 'session')!
    expect(hasWindowReset(session, 5_000)).toBe(false)
    expect(hasWindowReset(session, 10_000)).toBe(true)
    expect(effectivePercent(session, 5_000)).toBe(40)
    expect(effectivePercent(session, 20_000)).toBe(0)
    expect(hasWindowReset(findWindow(snapshot, 'weekly')!, 1e15)).toBe(false)
    expect(findWindow(null, 'session')).toBeUndefined()
  })
})
