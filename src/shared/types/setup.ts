/** Diagnostics shown on the Settings screen for each provider's data source. */

export interface ClaudeSetupStatus {
  settingsPath: string
  scriptPath: string
  dataFilePath: string
  /** True when `~/.claude/settings.json` statusLine points at our script. */
  installed: boolean
  /** A statusline command that was already configured and is not ours. */
  existingCommand: string | null
  dataFileExists: boolean
  /** Epoch ms of the data file's last write, null when missing. */
  dataFileUpdatedAt: number | null
}

export interface ClaudeInstallResult {
  ok: boolean
  backupPath?: string
  /** i18n key under `errors` when `ok` is false. */
  errorKey?: string
  detail?: string
}

export interface CodexSetupStatus {
  authPath: string
  exists: boolean
  hasAccessToken: boolean
  hasAccountId: boolean
  /** `last_refresh` from auth.json as written by the CLI. */
  lastRefresh: string | null
}

export interface AppInfo {
  version: string
  platform: NodeJS.Platform
}
