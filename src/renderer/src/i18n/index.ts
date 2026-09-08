import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_NAMESPACE, NAMESPACES, resources } from '@shared/i18n/resources'
import type { Language } from '@shared/types/settings'

// Keys are intentionally untyped: error keys arrive from main at runtime (`errors:${key}`).

export async function initRendererI18n(language: Language): Promise<void> {
  await i18next.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    ns: [...NAMESPACES],
    defaultNS: DEFAULT_NAMESPACE,
    resources,
    interpolation: { escapeValue: false }
  })
}

export async function setRendererLanguage(language: Language): Promise<void> {
  if (i18next.isInitialized && i18next.language !== language) await i18next.changeLanguage(language)
}

export { i18next }
