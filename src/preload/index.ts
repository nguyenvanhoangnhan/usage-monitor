import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type UsageMonitorApi } from '@shared/ipc-channels'
import type { UsageState } from '@shared/types/usage'
import type { AppSettings } from '@shared/types/settings'

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

/** Typed bridge; the renderer never sees `ipcRenderer` itself. */
const api: UsageMonitorApi = {
  getUsageState: () => ipcRenderer.invoke(IPC.usageGetState),
  refreshUsage: (provider) => ipcRenderer.invoke(IPC.usageRefresh, provider),
  onUsageState: (listener) => subscribe<UsageState>(IPC.usageState, listener),

  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  updateSettings: (patch) => ipcRenderer.invoke(IPC.settingsUpdate, patch),
  onSettingsChanged: (listener) => subscribe<AppSettings>(IPC.settingsChanged, listener),
  onOpenSettings: (listener) => subscribe<void>(IPC.appOpenSettings, listener),

  getClaudeSetupStatus: () => ipcRenderer.invoke(IPC.claudeGetSetupStatus),
  installClaudeStatusline: () => ipcRenderer.invoke(IPC.claudeInstallStatusline),
  getCodexSetupStatus: () => ipcRenderer.invoke(IPC.codexGetSetupStatus),

  openExternal: (url) => ipcRenderer.invoke(IPC.appOpenExternal, url),
  openPath: (path) => ipcRenderer.invoke(IPC.appOpenPath, path),
  getAppInfo: () => ipcRenderer.invoke(IPC.appGetInfo)
}

contextBridge.exposeInMainWorld('api', api)
