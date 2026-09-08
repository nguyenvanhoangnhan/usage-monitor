import { EventEmitter } from 'node:events'
import {
  createIdleState,
  PROVIDER_IDS,
  type ProviderId,
  type ProviderState,
  type UsageState
} from '@shared/types/usage'
import type { AppSettings } from '@shared/types/settings'
import { ClaudeProvider } from './claude'
import { CodexProvider } from './codex'

export interface ProviderRegistryOptions {
  userAgent: string
}

/**
 * Owns the concrete providers, keeps the aggregated `UsageState` and
 * starts/stops providers as settings change.
 */
export class ProviderRegistry extends EventEmitter<{ state: [UsageState] }> {
  readonly claude: ClaudeProvider
  readonly codex: CodexProvider
  private state: UsageState
  private running: Record<ProviderId, boolean> = { claude: false, codex: false }

  constructor(settings: AppSettings, options: ProviderRegistryOptions) {
    super()
    this.claude = new ClaudeProvider({ staleAfterMinutes: settings.claude.staleAfterMinutes })
    this.codex = new CodexProvider({
      pollIntervalSeconds: settings.codex.pollIntervalSeconds,
      userAgent: options.userAgent
    })
    this.state = {
      claude: createIdleState('claude'),
      codex: createIdleState('codex')
    }
    this.claude.onState((s) => this.publish(s))
    this.codex.onState((s) => this.publish(s))
  }

  getState(): UsageState {
    return this.state
  }

  async applySettings(settings: AppSettings): Promise<void> {
    this.claude.setStaleAfter(settings.claude.staleAfterMinutes)
    this.codex.setPollInterval(settings.codex.pollIntervalSeconds)
    await Promise.all([
      this.toggle('claude', settings.claude.enabled),
      this.toggle('codex', settings.codex.enabled)
    ])
  }

  async refresh(provider?: ProviderId): Promise<void> {
    const ids = provider ? [provider] : [...PROVIDER_IDS]
    await Promise.all(ids.filter((id) => this.running[id]).map((id) => this.get(id).refresh()))
  }

  stopAll(): void {
    for (const id of PROVIDER_IDS) {
      if (this.running[id]) this.get(id).stop()
      this.running[id] = false
    }
  }

  private get(id: ProviderId): ClaudeProvider | CodexProvider {
    return id === 'claude' ? this.claude : this.codex
  }

  private async toggle(id: ProviderId, enabled: boolean): Promise<void> {
    if (enabled && !this.running[id]) {
      this.running[id] = true
      await this.get(id).start()
    } else if (!enabled && this.running[id]) {
      this.get(id).stop()
      this.running[id] = false
      this.publish(createIdleState(id))
    }
  }

  private publish(providerState: ProviderState): void {
    this.state = { ...this.state, [providerState.provider]: providerState }
    this.emit('state', this.state)
  }
}
