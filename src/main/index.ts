import { app, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { IPC } from '@shared/ipc-channels'
import { resolveLanguage } from '@shared/i18n/resources'
import trayIcon from '../../resources/trayTemplate.png?asset'
import { registerIpcHandlers } from './app/ipc'
import { SettingsStore } from './app/settings-store'
import { TrayController } from './app/tray'
import { MainWindowController } from './app/window'
import { initMainI18n, setMainLanguage } from './i18n'
import { ProviderRegistry } from './providers/registry'

const settingsPath = join(app.getPath('userData'), 'settings.json')
const settings = new SettingsStore(settingsPath)
const windowCtl = new MainWindowController({
  onBoundsChanged: (bounds) => settings.update({ windowBounds: bounds })
})

let registry: ProviderRegistry
let tray: TrayController

async function bootstrap(): Promise<void> {
  electronApp.setAppUserModelId('dev.nhan.usage-monitor')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  if (settings.fresh) {
    settings.update({ language: resolveLanguage(app.getLocale()) })
  }
  await initMainI18n(settings.get().language)
  if (is.dev) console.log(`[dev] settings file: ${settingsPath}`, JSON.stringify(settings.get()))
  nativeTheme.themeSource = settings.get().theme

  registry = new ProviderRegistry(settings.get(), {
    userAgent: `usage-monitor/${app.getVersion()}`
  })
  tray = new TrayController(trayIcon, {
    openWindow: () => windowCtl.show(settings.get()),
    openSettings: () => {
      windowCtl.show(settings.get())
      windowCtl.send(IPC.appOpenSettings, undefined)
    },
    refresh: () => void registry.refresh(),
    toggleAlwaysOnTop: (value) => settings.update({ alwaysOnTop: value }),
    quit: () => {
      windowCtl.markQuitting()
      app.quit()
    }
  })

  registry.on('state', (state) => {
    windowCtl.send(IPC.usageState, state)
    tray.update(state, settings.get())
  })
  settings.on('change', (next, previous) => {
    windowCtl.send(IPC.settingsChanged, next)
    if (next.language !== previous.language) {
      void setMainLanguage(next.language).then(() => tray.update(registry.getState(), next))
    }
    if (next.alwaysOnTop !== previous.alwaysOnTop) windowCtl.setAlwaysOnTop(next.alwaysOnTop)
    if (next.theme !== previous.theme) nativeTheme.themeSource = next.theme
    void registry.applySettings(next)
    tray.update(registry.getState(), next)
  })

  registerIpcHandlers({ registry, settings })
  windowCtl.create(settings.get())
  tray.update(registry.getState(), settings.get())
  await registry.applySettings(settings.get())
}

app.whenReady().then(bootstrap)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) windowCtl.create(settings.get())
  else windowCtl.show(settings.get())
})

app.on('before-quit', () => {
  windowCtl.markQuitting()
  registry?.stopAll()
  tray?.destroy()
})

// Keep running in the tray when the window is closed; quitting is explicit.
app.on('window-all-closed', () => {})
