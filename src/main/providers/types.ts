import type { ProviderId, ProviderState } from '@shared/types/usage'

/**
 * A usage source. Providers own their polling or file watching and publish
 * a full `ProviderState` whenever anything changes.
 */
export interface UsageProvider {
  readonly id: ProviderId
  start(): Promise<void>
  stop(): void
  /** Force a re-read or re-fetch regardless of schedule. */
  refresh(): Promise<void>
  getState(): ProviderState
  onState(listener: (state: ProviderState) => void): () => void
}
