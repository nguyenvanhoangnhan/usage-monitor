import i18next, { type i18n } from 'i18next'
import { DEFAULT_NAMESPACE, NAMESPACES, resources } from '@shared/i18n/resources'
import type { Language } from '@shared/types/settings'

/** Separate i18next instance for the main process (tray menu, dialogs). */
export const mainI18n: i18n = i18next.createInstance()

export async function initMainI18n(language: Language): Promise<void> {
  await mainI18n.init({
    lng: language,
    fallbackLng: 'en',
    ns: [...NAMESPACES],
    defaultNS: DEFAULT_NAMESPACE,
    resources,
    interpolation: { escapeValue: false }
  })
}

export async function setMainLanguage(language: Language): Promise<void> {
  if (mainI18n.language !== language) {
    await mainI18n.changeLanguage(language)
  }
}
