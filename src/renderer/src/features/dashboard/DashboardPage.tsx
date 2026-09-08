import { PROVIDER_IDS, type ProviderId } from '@shared/types/usage'
import type { AppSettings } from '@shared/types/settings'
import { cn } from '@renderer/lib/utils'
import { useNow } from '@renderer/hooks/useCountdown'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { useUsageStore } from '@renderer/stores/usage-store'
import { ProviderCard } from './ProviderCard'

export interface DashboardPageProps {
  onSetup(provider: ProviderId): void
}

const LAYOUT_CLASS: Record<AppSettings['layout'], string> = {
  auto: '@3xl:grid-cols-2',
  stack: 'grid-cols-1',
  grid: 'grid-cols-2'
}

/**
 * Provider cards in one or two columns. `auto` switches at about 800px of
 * container width so the breakpoint follows the window slice, not the screen.
 */
export function DashboardPage({ onSetup }: DashboardPageProps): React.JSX.Element {
  const state = useUsageStore((s) => s.state)
  const settings = useSettingsStore((s) => s.settings)
  const now = useNow()
  const enabled = PROVIDER_IDS.filter((id) => settings[id].enabled)

  return (
    <div className="@container h-full overflow-y-auto px-4 pt-1 pb-6">
      <div className={cn('grid items-start gap-3', LAYOUT_CLASS[settings.layout])}>
        {enabled.map((id) => (
          <ProviderCard
            key={id}
            state={state[id]}
            displayMode={settings.displayMode}
            now={now}
            onSetup={onSetup}
          />
        ))}
      </div>
    </div>
  )
}
