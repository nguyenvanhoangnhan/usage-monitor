import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SettingsStore } from './settings-store'

function tempFile(name = 'settings.json'): string {
  return join(mkdtempSync(join(tmpdir(), 'usage-monitor-settings-')), name)
}

describe('SettingsStore', () => {
  it('starts fresh with defaults when the file is missing', () => {
    const store = new SettingsStore(tempFile())
    expect(store.fresh).toBe(true)
    expect(store.get().codex.pollIntervalSeconds).toBe(60)
    expect(store.get().tray.items).toHaveLength(2)
  })

  it('merges nested patches and persists atomically', () => {
    const path = tempFile()
    const store = new SettingsStore(path)
    store.update({ codex: { pollIntervalSeconds: 120 } })
    expect(store.get().codex.enabled).toBe(true)
    expect(JSON.parse(readFileSync(path, 'utf8')).codex.pollIntervalSeconds).toBe(120)
  })

  it('rejects invalid patches and keeps the previous value', () => {
    const store = new SettingsStore(tempFile())
    store.update({ codex: { pollIntervalSeconds: 1 } })
    expect(store.get().codex.pollIntervalSeconds).toBe(60)
  })

  it('fills in missing keys from a partial file and is not fresh', () => {
    const path = tempFile()
    writeFileSync(path, JSON.stringify({ language: 'vi' }))
    const store = new SettingsStore(path)
    expect(store.fresh).toBe(false)
    expect(store.get().language).toBe('vi')
    expect(store.get().claude.staleAfterMinutes).toBe(10)
  })

  it('emits change events with previous and next', () => {
    const store = new SettingsStore(tempFile())
    const seen: string[] = []
    store.on('change', (next, prev) => seen.push(`${prev.language}->${next.language}`))
    store.update({ language: 'vi' })
    expect(seen).toEqual(['en->vi'])
  })
})
