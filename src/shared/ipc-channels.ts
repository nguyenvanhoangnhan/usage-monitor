import type { ProviderId, UsageState } from './types/usage'
import type { AppSettings, SettingsPatch } from './types/settings'
import type {
  AppInfo,
  ClaudeInstallResult,
  ClaudeSetupStatus,
  CodexSetupStatus
} from './types/setup'

/** Channel names. Main pushes `*.changed`/`state`; everything else is invoke/handle. */
export const IPC = {
  usageState: 'usage:state',
  usageGetState: 'usage:getState',
  usageRefresh: 'usage:refresh',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  settingsChanged: 'settings:changed',
  claudeGetSetupStatus: 'claude:getSetupStatus',
  claudeInstallStatusline: 'claude:installStatusline',
  codexGetSetupStatus: 'codex:getSetupStatus',
  appOpenExternal: 'app:openExternal',
  appGetInfo: 'app:getInfo',
  appOpenPath: 'app:openPath',
  appOpenSettings: 'app:openSettings'
} as const

/**
 * Surface exposed to the renderer through the preload bridge.
 * Kept here so preload implementation and renderer consumer share one contract.
 */
export interface UsageMonitorApi {
  getUsageState(): Promise<UsageState>
  refreshUsage(provider?: ProviderId): Promise<void>
  onUsageState(listener: (state: UsageState) => void): () => void

  getSettings(): Promise<AppSettings>
  updateSettings(patch: SettingsPatch): Promise<AppSettings>
  onSettingsChanged(listener: (settings: AppSettings) => void): () => void
  /** Fired when the tray menu asks the window to show the settings screen. */
  onOpenSettings(listener: () => void): () => void

  getClaudeSetupStatus(): Promise<ClaudeSetupStatus>
  installClaudeStatusline(): Promise<ClaudeInstallResult>
  getCodexSetupStatus(): Promise<CodexSetupStatus>

  openExternal(url: string): Promise<void>
  openPath(path: string): Promise<void>
  getAppInfo(): Promise<AppInfo>
}
