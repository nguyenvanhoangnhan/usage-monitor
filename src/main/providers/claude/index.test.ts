import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ClaudeProvider } from './index'
import type { ClaudePaths } from './paths'

function tempPaths(): ClaudePaths {
  const root = mkdtempSync(join(tmpdir(), 'usage-monitor-claude-provider-'))
  return {
    settingsPath: join(root, 'claude', 'settings.json'),
    scriptPath: join(root, 'config', 'claude-statusline.sh'),
    dataFilePath: join(root, 'config', 'claude-statusline.json'),
    hookMetaPath: join(root, 'config', 'claude-hook.json')
  }
}

describe('ClaudeProvider freshness', () => {
  it('marks a snapshot older than one minute as cached before it becomes stale', async () => {
    const paths = tempPaths()
    mkdirSync(join(paths.dataFilePath, '..'), { recursive: true })
    writeFileSync(
      paths.dataFilePath,
      JSON.stringify({
        rate_limits: {
          five_hour: { used_percentage: 91, resets_at: 1_788_851_400 },
          seven_day: { used_percentage: 64, resets_at: 1_788_930_000 }
        }
      })
    )
    const old = new Date(Date.now() - 61_000)
    utimesSync(paths.dataFilePath, old, old)

    const provider = new ClaudeProvider({ staleAfterMinutes: 10, paths })
    try {
      await provider.start()
      expect(provider.getState().status).toBe('cached')
    } finally {
      provider.stop()
    }
  })
})
