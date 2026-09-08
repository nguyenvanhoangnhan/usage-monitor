import { create } from 'zustand'
import { DEFAULT_SETTINGS, type AppSettings, type SettingsPatch } from '@shared/types/settings'
import { setRendererLanguage } from '@renderer/i18n'

interface SettingsStore {
  settings: AppSettings
  loaded: boolean
  apply(settings: AppSettings): void
  update(patch: SettingsPatch): Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  apply: (settings) => {
    set({ settings, loaded: true })
    void setRendererLanguage(settings.language)
    applyTheme(settings.theme)
  },
  update: async (patch) => {
    const next = await window.api.updateSettings(patch)
    useSettingsStore.getState().apply(next)
  }
}))

/** Loads settings from main and subscribes to changes made elsewhere (tray, other views). */
export async function connectSettingsStore(): Promise<() => void> {
  const store = useSettingsStore.getState()
  store.apply(await window.api.getSettings())
  return window.api.onSettingsChanged((settings) => useSettingsStore.getState().apply(settings))
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
let followSystem = false

darkQuery.addEventListener('change', () => {
  if (followSystem) setDarkClass(darkQuery.matches)
})

function applyTheme(theme: AppSettings['theme']): void {
  followSystem = theme === 'system'
  setDarkClass(theme === 'dark' || (theme === 'system' && darkQuery.matches))
}

function setDarkClass(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark)
}
