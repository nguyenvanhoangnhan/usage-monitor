import type { UsageMonitorApi } from '@shared/ipc-channels'

declare global {
  interface Window {
    api: UsageMonitorApi
  }
}
