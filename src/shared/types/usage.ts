/**
 * Provider-agnostic usage model shared by main, preload and renderer.
 * Every provider maps its own API shape onto these types in its mapper.
 */

export const PROVIDER_IDS = ['claude', 'codex'] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]

/** Session = rolling 5 hours, weekly = rolling 7 days, extra = anything provider specific. */
export type UsageWindowKind = 'session' | 'weekly' | 'extra'

export interface UsageWindow {
  kind: UsageWindowKind
  /** Stable id within a provider, e.g. `five_hour` or `primary`. */
  id: string
  /** Human label for `extra` windows only; session and weekly are translated by the UI. */
  label?: string
  /** 0 to 100, may exceed 100 for spend limits. */
  usedPercent: number
  /** Epoch milliseconds, null when the provider did not report it. */
  resetsAt: number | null
  /** Window length in seconds when known. */
  windowSeconds?: number
}

export interface UsageSnapshot {
  provider: ProviderId
  /** Epoch milliseconds when the data was produced by the source. */
  fetchedAt: number
  windows: UsageWindow[]
  planType?: string
}

export type ProviderStatus =
  'idle' | 'ok' | 'stale' | 'not_configured' | 'auth_expired' | 'rate_limited' | 'error'

export interface ProviderState {
  provider: ProviderId
  status: ProviderStatus
  /** Last good snapshot, kept through transient errors. */
  snapshot: UsageSnapshot | null
  /** i18n key under the `errors` namespace; renderer translates it. */
  errorKey?: string
  /** Raw technical detail for tooltips and logs, never shown as primary text. */
  lastError?: string
  updatedAt: number
}

export type UsageState = Record<ProviderId, ProviderState>

export function createIdleState(provider: ProviderId): ProviderState {
  return { provider, status: 'idle', snapshot: null, updatedAt: Date.now() }
}
