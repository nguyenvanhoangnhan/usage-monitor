import enCommon from './locales/en/common.json'
import enDashboard from './locales/en/dashboard.json'
import enSettings from './locales/en/settings.json'
import enTray from './locales/en/tray.json'
import enErrors from './locales/en/errors.json'
import viCommon from './locales/vi/common.json'
import viDashboard from './locales/vi/dashboard.json'
import viSettings from './locales/vi/settings.json'
import viTray from './locales/vi/tray.json'
import viErrors from './locales/vi/errors.json'
import type { Language } from '../types/settings'

export const NAMESPACES = ['common', 'dashboard', 'settings', 'tray', 'errors'] as const
export type Namespace = (typeof NAMESPACES)[number]
export const DEFAULT_NAMESPACE: Namespace = 'common'

/** English is the reference shape; other locales must provide the same keys. */
export type LocaleResources = {
  common: typeof enCommon
  dashboard: typeof enDashboard
  settings: typeof enSettings
  tray: typeof enTray
  errors: typeof enErrors
}

export const resources: Record<Language, LocaleResources> = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    settings: enSettings,
    tray: enTray,
    errors: enErrors
  },
  vi: {
    common: viCommon,
    dashboard: viDashboard,
    settings: viSettings,
    tray: viTray,
    errors: viErrors
  }
}

/** Maps a BCP 47 tag from the OS to a supported language. */
export function resolveLanguage(tag: string | undefined): Language {
  return tag?.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}
