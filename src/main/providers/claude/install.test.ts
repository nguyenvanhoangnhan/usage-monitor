import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getClaudeSetupStatus, installClaudeStatusline } from './install'
import type { ClaudePaths } from './paths'

function tempPaths(): ClaudePaths {
  const root = mkdtempSync(join(tmpdir(), 'usage-monitor-claude-'))
  return {
    settingsPath: join(root, 'claude', 'settings.json'),
    scriptPath: join(root, 'config', 'claude-statusline.sh'),
    dataFilePath: join(root, 'config', 'claude-statusline.json'),
    hookMetaPath: join(root, 'config', 'claude-hook.json')
  }
}

describe('installClaudeStatusline', () => {
  it('creates settings.json when missing and marks the hook installed', async () => {
    const paths = tempPaths()
    const result = await installClaudeStatusline(paths)
    expect(result).toEqual({ ok: true, backupPath: undefined })

    const settings = JSON.parse(readFileSync(paths.settingsPath, 'utf8'))
    expect(settings.statusLine).toEqual({ type: 'command', command: paths.scriptPath })
    expect(statSync(paths.scriptPath).mode & 0o111).not.toBe(0)

    const status = await getClaudeSetupStatus(paths)
    expect(status.installed).toBe(true)
    expect(status.existingCommand).toBeNull()
    expect(status.dataFileExists).toBe(false)
  })

  it('backs up existing settings, preserves other keys and chains the old command', async () => {
    const paths = tempPaths()
    const { mkdirSync } = await import('node:fs')
    mkdirSync(join(paths.settingsPath, '..'), { recursive: true })
    writeFileSync(
      paths.settingsPath,
      JSON.stringify({
        model: 'opus',
        statusLine: { type: 'command', command: 'echo old', padding: 0 }
      })
    )

    const before = await getClaudeSetupStatus(paths)
    expect(before.installed).toBe(false)
    expect(before.existingCommand).toBe('echo old')

    const result = await installClaudeStatusline(paths)
    expect(result.ok).toBe(true)
    expect(result.backupPath).toMatch(/settings\.json\.bak-/)
    expect(readdirSync(join(paths.settingsPath, '..')).some((f) => f.includes('.bak-'))).toBe(true)

    const settings = JSON.parse(readFileSync(paths.settingsPath, 'utf8'))
    expect(settings.model).toBe('opus')
    expect(settings.statusLine).toEqual({ type: 'command', command: paths.scriptPath, padding: 0 })
    expect(readFileSync(paths.scriptPath, 'utf8')).toContain(`CHAIN_COMMAND='echo old'`)

    const after = await getClaudeSetupStatus(paths)
    expect(after.installed).toBe(true)
    expect(after.existingCommand).toBe('echo old')
  })

  it('keeps the chained command across a reinstall', async () => {
    const paths = tempPaths()
    const { mkdirSync } = await import('node:fs')
    mkdirSync(join(paths.settingsPath, '..'), { recursive: true })
    writeFileSync(paths.settingsPath, JSON.stringify({ statusLine: { command: 'echo old' } }))
    await installClaudeStatusline(paths)
    await installClaudeStatusline(paths)
    expect(readFileSync(paths.scriptPath, 'utf8')).toContain(`CHAIN_COMMAND='echo old'`)
  })

  it('refuses to touch a settings file that is not valid JSON', async () => {
    const paths = tempPaths()
    const { mkdirSync } = await import('node:fs')
    mkdirSync(join(paths.settingsPath, '..'), { recursive: true })
    writeFileSync(paths.settingsPath, '{ not json')
    const result = await installClaudeStatusline(paths)
    expect(result).toMatchObject({ ok: false, errorKey: 'claude.settingsInvalidJson' })
    expect(readFileSync(paths.settingsPath, 'utf8')).toBe('{ not json')
  })
})
