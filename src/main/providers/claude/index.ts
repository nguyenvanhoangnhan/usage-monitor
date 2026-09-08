import { readFile, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { watch, type FSWatcher } from 'chokidar'
import type { ClaudeInstallStatus } from './types'
import { BaseProvider } from '../base-provider'
import { getClaudeSetupStatus, installClaudeStatusline } from './install'
import { mapClaudeStatusline } from './mapper'
import { resolveClaudePaths, type ClaudePaths } from './paths'
import { claudeStatuslinePayloadSchema } from './schema'

export interface ClaudeProviderOptions {
  staleAfterMinutes: number
  paths?: ClaudePaths
}

const STALE_CHECK_MS = 30_000
const LIVE_MAX_AGE_MS = 60_000

/**
 * Reads the JSON that the installed statusline script writes on every Claude
 * Code tick. No network, no credentials: the file is the only input.
 */
export class ClaudeProvider extends BaseProvider {
  readonly paths: ClaudePaths
  private watcher: FSWatcher | null = null
  private staleTimer: NodeJS.Timeout | null = null
  private installed = false

  constructor(private options: ClaudeProviderOptions) {
    super('claude')
    this.paths = options.paths ?? resolveClaudePaths()
  }

  async start(): Promise<void> {
    await this.refresh()
    this.watcher = watch([dirname(this.paths.dataFilePath), this.paths.settingsPath], {
      ignoreInitial: true,
      depth: 0,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 }
    })
    this.watcher.on('all', (_event, path) => {
      if (path === this.paths.dataFilePath) void this.readDataFile()
      else if (path === this.paths.settingsPath) void this.refresh()
    })
    this.staleTimer = setInterval(() => this.checkStale(), STALE_CHECK_MS)
  }

  stop(): void {
    void this.watcher?.close()
    this.watcher = null
    if (this.staleTimer) clearInterval(this.staleTimer)
    this.staleTimer = null
  }

  async refresh(): Promise<void> {
    const setup = await getClaudeSetupStatus(this.paths)
    this.installed = setup.installed
    await this.readDataFile()
  }

  setStaleAfter(minutes: number): void {
    this.options = { ...this.options, staleAfterMinutes: minutes }
    this.checkStale()
  }

  getSetupStatus(): Promise<ClaudeInstallStatus> {
    return getClaudeSetupStatus(this.paths)
  }

  async install(): ReturnType<typeof installClaudeStatusline> {
    const result = await installClaudeStatusline(this.paths)
    await this.refresh()
    return result
  }

  private async readDataFile(): Promise<void> {
    let raw: string
    let mtime: number
    try {
      const [content, info] = await Promise.all([
        readFile(this.paths.dataFilePath, 'utf8'),
        stat(this.paths.dataFilePath)
      ])
      raw = content
      mtime = info.mtimeMs
    } catch {
      this.setStatus({
        status: this.installed ? 'idle' : 'not_configured',
        snapshot: null,
        errorKey: this.installed ? 'claude.waitingForData' : 'claude.notConfigured'
      })
      return
    }

    let payload: unknown
    try {
      payload = JSON.parse(raw)
    } catch (error) {
      this.setStatus({ status: 'error', errorKey: 'claude.invalidFile', lastError: String(error) })
      return
    }
    const parsed = claudeStatuslinePayloadSchema.safeParse(payload)
    if (!parsed.success) {
      this.setStatus({
        status: 'error',
        errorKey: 'claude.invalidFile',
        lastError: parsed.error.message
      })
      return
    }

    const snapshot = mapClaudeStatusline(parsed.data, mtime)
    if (!snapshot) {
      this.setStatus({ status: 'idle', errorKey: 'claude.waitingForData' })
      return
    }
    this.setSnapshot(snapshot)
    this.checkStale()
  }

  private checkStale(): void {
    const state = this.getState()
    if (!state.snapshot) return
    if (state.status !== 'ok' && state.status !== 'cached' && state.status !== 'stale') return

    const ageMs = Date.now() - state.snapshot.fetchedAt
    const isStale = ageMs > this.options.staleAfterMinutes * 60_000
    const nextStatus = isStale ? 'stale' : ageMs > LIVE_MAX_AGE_MS ? 'cached' : 'ok'
    if (state.status === nextStatus) return

    this.setStatus({
      status: nextStatus,
      errorKey: nextStatus === 'stale' ? 'claude.stale' : undefined
    })
  }
}
