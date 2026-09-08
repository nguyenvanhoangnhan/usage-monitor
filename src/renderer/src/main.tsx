import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initRendererI18n } from './i18n'
import { connectSettingsStore } from './stores/settings-store'
import { connectUsageStore } from './stores/usage-store'

/** Settings and language must be known before the first paint to avoid a flash of English. */
async function bootstrap(): Promise<void> {
  const initial = await window.api.getSettings()
  await initRendererI18n(initial.language)
  await connectSettingsStore()
  await connectUsageStore()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void bootstrap()
