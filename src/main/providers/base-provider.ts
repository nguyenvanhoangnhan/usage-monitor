import { EventEmitter } from 'node:events'
import {
  createIdleState,
  type ProviderId,
  type ProviderState,
  type ProviderStatus,
  type UsageSnapshot
} from '@shared/types/usage'
import type { UsageProvider } from './types'

interface StatusUpdate {
  status: ProviderStatus
  snapshot?: UsageSnapshot | null
  errorKey?: string
  lastError?: string
}

/** Shared state bookkeeping so concrete providers only implement data access. */
export abstract class BaseProvider implements UsageProvider {
  private state: ProviderState
  private readonly emitter = new EventEmitter<{ state: [ProviderState] }>()

  constructor(readonly id: ProviderId) {
    this.state = createIdleState(id)
  }

  abstract start(): Promise<void>
  abstract stop(): void
  abstract refresh(): Promise<void>

  getState(): ProviderState {
    return this.state
  }

  onState(listener: (state: ProviderState) => void): () => void {
    this.emitter.on('state', listener)
    return () => this.emitter.off('state', listener)
  }

  /** Replace status fields; the snapshot is kept unless explicitly passed. */
  protected setStatus(update: StatusUpdate): void {
    this.state = {
      provider: this.id,
      status: update.status,
      snapshot: update.snapshot === undefined ? this.state.snapshot : update.snapshot,
      errorKey: update.errorKey,
      lastError: update.lastError,
      updatedAt: Date.now()
    }
    this.emitter.emit('state', this.state)
  }

  protected setSnapshot(snapshot: UsageSnapshot): void {
    this.setStatus({ status: 'ok', snapshot })
  }
}
