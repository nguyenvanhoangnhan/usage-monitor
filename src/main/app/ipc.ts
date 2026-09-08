import { app, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { ProviderId } from '@shared/types/usage'
import type { SettingsPatch } from '@shared/types/settings'
import type { AppInfo } from '@shared/types/setup'
import type { ProviderRegistry } from '../providers/registry'
import type { SettingsStore } from './settings-store'

export interface IpcDependencies {
  registry: ProviderRegistry
  settings: SettingsStore
}

/** Registers every invoke handler. Push channels are emitted from the bootstrap wiring. */
export function registerIpcHandlers({ registry, settings }: IpcDependencies): void {
  ipcMain.handle(IPC.usageGetState, () => registry.getState())
  ipcMain.handle(IPC.usageRefresh, (_e, provider?: ProviderId) => registry.refresh(provider))

  ipcMain.handle(IPC.settingsGet, () => settings.get())
  ipcMain.handle(IPC.settingsUpdate, (_e, patch: SettingsPatch) => settings.update(patch))

  ipcMain.handle(IPC.claudeGetSetupStatus, () => registry.claude.getSetupStatus())
  ipcMain.handle(IPC.claudeInstallStatusline, () => registry.claude.install())
  ipcMain.handle(IPC.codexGetSetupStatus, () => registry.codex.getSetupStatus())

  ipcMain.handle(IPC.appOpenExternal, (_e, url: string) => {
    if (/^https?:\/\//.test(url)) return shell.openExternal(url)
    return Promise.resolve()
  })
  ipcMain.handle(IPC.appOpenPath, (_e, path: string) => {
    shell.showItemInFolder(path)
  })
  ipcMain.handle(IPC.appGetInfo, (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform
  }))
}
