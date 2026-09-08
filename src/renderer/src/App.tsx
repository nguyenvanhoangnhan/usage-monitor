import { useEffect, useState } from 'react'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { Toaster } from '@renderer/components/ui/sonner'
import { AppShell, type View } from '@renderer/components/layout/AppShell'
import { DashboardPage } from '@renderer/features/dashboard/DashboardPage'
import { SettingsPage, type SettingsTab } from '@renderer/features/settings/SettingsPage'
import type { ProviderId } from '@shared/types/usage'

export default function App(): React.JSX.Element {
  const [view, setView] = useState<View>('dashboard')
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')

  useEffect(
    () =>
      window.api.onOpenSettings(() => {
        setSettingsTab('general')
        setView('settings')
      }),
    []
  )

  const openSetup = (provider: ProviderId): void => {
    setSettingsTab(provider)
    setView('settings')
  }

  return (
    <TooltipProvider delayDuration={300}>
      <AppShell view={view} onChangeView={setView}>
        {view === 'dashboard' ? (
          <DashboardPage onSetup={openSetup} />
        ) : (
          <SettingsPage tab={settingsTab} onTabChange={setSettingsTab} />
        )}
      </AppShell>
      <Toaster position="bottom-center" />
    </TooltipProvider>
  )
}
