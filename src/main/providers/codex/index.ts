import { stat } from 'node:fs/promises'
import { watch, type FSWatcher } from 'chokidar'
import type { CodexSetupStatus } from '@shared/types/setup'
import { BaseProvider } from '../base-provider'
import { PollScheduler, type PollOutcome } from '../scheduler'
import { codexAuthPath, readCodexAuth } from './auth'
import { fetchCodexUsage, type CodexFetchFailure } from './api'
import { mapCodexUsage } from './mapper'

export interface CodexProviderOptions {
  pollIntervalSeconds: number
  userAgent: string
  authPath?: string
}

const MAX_BACKOFF_MS = 15 * 60_000

const FAILURE_TO_STATE: Record<
  CodexFetchFailure,
  { status: 'auth_expired' | 'rate_limited' | 'error'; errorKey: string }
> = {
  auth_expired: { status: 'auth_expired', errorKey: 'codex.authExpired' },
  forbidden: { status: 'error', errorKey: 'codex.forbidden' },
  rate_limited: { status: 'rate_limited', errorKey: 'codex.rateLimited' },
  server: { status: 'error', errorKey: 'generic' },
  network: { status: 'error', errorKey: 'network' },
  timeout: { status: 'error', errorKey: 'timeout' },
  invalid: { status: 'error', errorKey: 'invalidResponse' }
}

/**
 * Polls the Codex usage endpoint with the CLI's own credentials.
 * The credential file is watched so a CLI-side refresh is picked up immediately.
 */
export class CodexProvider extends BaseProvider {
  private readonly authPath: string
  private readonly scheduler: PollScheduler
  private watcher: FSWatcher | null = null

  constructor(private options: CodexProviderOptions) {
    super('codex')
    this.authPath = options.authPath ?? codexAuthPath()
    this.scheduler = new PollScheduler(() => this.poll(), {
      intervalMs: options.pollIntervalSeconds * 1000,
      maxBackoffMs: MAX_BACKOFF_MS
    })
  }

  async start(): Promise<void> {
    this.watcher = watch(this.authPath, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
    })
    this.watcher.on('all', () => void this.scheduler.triggerNow())
    this.scheduler.start()
  }

  stop(): void {
    this.scheduler.stop()
    void this.watcher?.close()
    this.watcher = null
  }

  async refresh(): Promise<void> {
    await this.scheduler.triggerNow()
  }

  setPollInterval(seconds: number): void {
    this.options = { ...this.options, pollIntervalSeconds: seconds }
    this.scheduler.setInterval(seconds * 1000)
  }

  async getSetupStatus(): Promise<CodexSetupStatus> {
    const auth = await readCodexAuth(this.authPath)
    let exists = true
    try {
      await stat(this.authPath)
    } catch {
      exists = false
    }
    return {
      authPath: this.authPath,
      exists,
      hasAccessToken: auth.ok,
      hasAccountId: auth.ok && auth.credentials.accountId !== null,
      lastRefresh: auth.ok ? auth.credentials.lastRefresh : null
    }
  }

  private async poll(): Promise<PollOutcome> {
    const auth = await readCodexAuth(this.authPath)
    if (!auth.ok) {
      this.setStatus({ status: 'not_configured', errorKey: auth.errorKey, lastError: auth.detail })
      return 'ok'
    }

    const result = await fetchCodexUsage(auth.credentials, { userAgent: this.options.userAgent })
    if (!result.ok) {
      const mapped = FAILURE_TO_STATE[result.failure]
      this.setStatus({ status: mapped.status, errorKey: mapped.errorKey, lastError: result.detail })
      return result.failure === 'rate_limited' || result.failure === 'server' ? 'backoff' : 'ok'
    }

    this.setSnapshot(mapCodexUsage(result.data))
    return 'ok'
  }
}
