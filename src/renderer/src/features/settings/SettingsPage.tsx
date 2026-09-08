import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import type { AppInfo } from '@shared/types/setup'
import { ClaudeSetupCard } from './ClaudeSetupCard'
import { CodexSetupCard } from './CodexSetupCard'
import { GeneralSettings } from './GeneralSettings'

export type SettingsTab = 'general' | 'claude' | 'codex'

export interface SettingsPageProps {
  tab: SettingsTab
  onTabChange(tab: SettingsTab): void
}

/** Tab state lives in the parent so the tray and the dashboard can deep-link into a provider tab. */
export function SettingsPage({ tab, onTabChange }: SettingsPageProps): React.JSX.Element {
  const { t } = useTranslation('settings')
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void window.api.getAppInfo().then(setInfo)
  }, [])

  return (
    <div className="@container flex h-full flex-col overflow-hidden px-4 pb-3">
      <Tabs
        value={tab}
        onValueChange={(v) => onTabChange(v as SettingsTab)}
        className="min-h-0 flex-1"
      >
        <TabsList className="w-full">
          {(['general', 'claude', 'codex'] as const).map((key) => (
            <TabsTrigger key={key} value={key} className="flex-1">
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto pt-2 pr-1">
          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>
          <TabsContent value="claude">
            <ClaudeSetupCard />
          </TabsContent>
          <TabsContent value="codex">
            <CodexSetupCard />
          </TabsContent>
        </div>
      </Tabs>
      {info && (
        <p className="text-muted-foreground pt-2 text-center text-[11px]">
          {t('about.version', { version: info.version })}
        </p>
      )}
    </div>
  )
}
