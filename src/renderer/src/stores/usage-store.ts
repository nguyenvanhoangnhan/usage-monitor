import { create } from 'zustand'
import { createIdleState, type ProviderId, type UsageState } from '@shared/types/usage'

interface UsageStore {
  state: UsageState
  refreshing: boolean
  setState(state: UsageState): void
  refresh(provider?: ProviderId): Promise<void>
}

/** Mirror of the main-process usage state, fed by IPC push. */
export const useUsageStore = create<UsageStore>((set) => ({
  state: { claude: createIdleState('claude'), codex: createIdleState('codex') },
  refreshing: false,
  setState: (state) => set({ state }),
  refresh: async (provider) => {
    set({ refreshing: true })
    try {
      await window.api.refreshUsage(provider)
    } finally {
      set({ refreshing: false })
    }
  }
}))

/** Loads the initial state and keeps the store in sync. Returns an unsubscribe. */
export async function connectUsageStore(): Promise<() => void> {
  const store = useUsageStore.getState()
  store.setState(await window.api.getUsageState())
  return window.api.onUsageState((state) => useUsageStore.getState().setState(state))
}
