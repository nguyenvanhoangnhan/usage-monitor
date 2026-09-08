import { useTranslation } from 'react-i18next'
import {
  ArrowClockwise,
  ArrowLeft,
  GearSix,
  PushPin,
  PushPinSlash,
  Rows,
  SquaresFour
} from '@phosphor-icons/react'
import { Button } from '@renderer/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { cn } from '@renderer/lib/utils'
import { PROVIDER_IDS, type ProviderStatus } from '@shared/types/usage'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { useUsageStore } from '@renderer/stores/usage-store'

export type View = 'dashboard' | 'settings'

export interface AppShellProps {
  view: View
  onChangeView(view: View): void
  children: React.ReactNode
}

/** Draggable titlebar plus the content area. The traffic lights sit in the left padding. */
export function AppShell({ view, onChangeView, children }: AppShellProps): React.JSX.Element {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const refreshing = useUsageStore((s) => s.refreshing)
  const refresh = useUsageStore((s) => s.refresh)
  const gridActive = settings.layout === 'grid'

  return (
    <div className="bg-background flex h-full flex-col">
      <header className="app-drag flex h-13 shrink-0 items-center gap-2 pr-4 pl-[86px]">
        <h1 className="font-serif text-[17px] tracking-[-0.01em]">
          {view === 'settings' ? t('settings:title') : t('appName')}
        </h1>
        <StatusDots />
        <div className="app-no-drag ml-auto flex items-center gap-0.5">
          <IconButton
            label={t('action.refreshAll')}
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            <ArrowClockwise size={16} className={cn(refreshing && 'animate-spin')} />
          </IconButton>
          {view === 'dashboard' && (
            <IconButton
              label={gridActive ? t('action.layoutStack') : t('action.layoutGrid')}
              onClick={() => void update({ layout: gridActive ? 'stack' : 'grid' })}
            >
              {gridActive ? <Rows size={16} /> : <SquaresFour size={16} />}
            </IconButton>
          )}
          <IconButton
            label={settings.alwaysOnTop ? t('action.unpin') : t('action.pin')}
            onClick={() => void update({ alwaysOnTop: !settings.alwaysOnTop })}
            active={settings.alwaysOnTop}
          >
            {settings.alwaysOnTop ? <PushPinSlash size={16} /> : <PushPin size={16} />}
          </IconButton>
          <IconButton
            label={view === 'settings' ? t('action.back') : t('action.settings')}
            onClick={() => onChangeView(view === 'settings' ? 'dashboard' : 'settings')}
          >
            {view === 'settings' ? <ArrowLeft size={16} /> : <GearSix size={16} />}
          </IconButton>
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  )
}

const DOT_TONE: Record<ProviderStatus, string> = {
  idle: 'bg-muted-foreground/40',
  ok: 'bg-ok',
  stale: 'bg-warn',
  not_configured: 'bg-muted-foreground/40',
  auth_expired: 'bg-critical',
  rate_limited: 'bg-warn',
  error: 'bg-critical'
}

function StatusDots(): React.JSX.Element {
  const { t } = useTranslation()
  const state = useUsageStore((s) => s.state)
  const settings = useSettingsStore((s) => s.settings)
  return (
    <div className="flex items-center gap-1.5 pl-1">
      {PROVIDER_IDS.filter((id) => settings[id].enabled).map((id) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <span className={cn('block size-2 rounded-full', DOT_TONE[state[id].status])} />
          </TooltipTrigger>
          <TooltipContent>
            {t(`provider.${id}`)}: {t(`status.${state[id].status}`)}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children
}: {
  label: string
  onClick(): void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'size-8 text-muted-foreground hover:text-foreground',
            active && 'text-primary'
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
