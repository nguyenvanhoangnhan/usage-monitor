import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { cn } from '@renderer/lib/utils'
import {
  formatClock,
  formatDuration,
  formatPercent,
  formatRelativeTime
} from '@renderer/lib/format'
import type { ProviderId, ProviderState, ProviderStatus, UsageWindow } from '@shared/types/usage'
import type { AppSettings } from '@shared/types/settings'
import { remainingPercent, usageLevel } from '@shared/usage/thresholds'
import { effectivePercent, extraWindows, findWindow, hasWindowReset } from '@shared/usage/windows'
import { EmptyState } from './EmptyState'
import { UsageGauge } from './UsageGauge'

export interface ProviderCardProps {
  state: ProviderState
  displayMode: AppSettings['displayMode']
  now: number
  onSetup(provider: ProviderId): void
}

/**
 * One provider, laid out like the usage page on claude.ai: a serif title with
 * a status line, then one row per window (label, big number, bar, caption).
 */
export function ProviderCard({
  state,
  displayMode,
  now,
  onSetup
}: ProviderCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { provider, snapshot, status } = state
  const session = findWindow(snapshot, 'session')
  const weekly = findWindow(snapshot, 'weekly')
  const extras = extraWindows(snapshot)
  const showEmpty = !snapshot && (status === 'not_configured' || status === 'auth_expired')

  return (
    <article className="bg-card border-border rounded-xl border px-5 pt-4 pb-5 shadow-[var(--shadow-card)]">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-[21px] leading-none">{t(`provider.${provider}`)}</h2>
        <StatusText state={state} />
      </header>

      {showEmpty ? (
        <EmptyState provider={provider} onAction={() => onSetup(provider)} />
      ) : (
        <>
          <div className="mt-5 space-y-5">
            <WindowRow
              title={t('window.sessionTitle')}
              hint={t('window.sessionHint')}
              window={session}
              displayMode={displayMode}
              now={now}
            />
            <WindowRow
              title={t('window.weeklyTitle')}
              hint={t('window.weeklyHint')}
              window={weekly}
              displayMode={displayMode}
              now={now}
            />
            {extras.map((w) => (
              <WindowRow
                key={w.id}
                title={w.label ?? w.id}
                window={w}
                displayMode={displayMode}
                now={now}
                compact
              />
            ))}
          </div>
          <footer className="text-muted-foreground mt-5 flex items-baseline justify-between gap-3 text-xs">
            <span>
              {snapshot
                ? t('updated', { ago: formatRelativeTime(snapshot.fetchedAt, now, i18n.language) })
                : t('dashboard:noData')}
            </span>
            <Hint state={state} />
          </footer>
        </>
      )}
    </article>
  )
}

const STATUS_DOT: Record<ProviderStatus, string> = {
  idle: 'bg-muted-foreground/40',
  ok: 'bg-ok',
  cached: 'bg-warn',
  stale: 'bg-warn',
  not_configured: 'bg-muted-foreground/40',
  auth_expired: 'bg-critical',
  rate_limited: 'bg-warn',
  error: 'bg-critical'
}

/** `● Live · plus`; the error text sits in a tooltip so the header stays one line. */
function StatusText({ state }: { state: ProviderState }): React.JSX.Element {
  const { t } = useTranslation()
  const { snapshot, status } = state
  const text = (
    <span
      className={cn(
        'text-muted-foreground flex items-center gap-1.5 text-xs whitespace-nowrap',
        (status === 'error' || status === 'auth_expired') && 'text-critical'
      )}
    >
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} />
      <span>
        {t(`status.${status}`)}
        {snapshot?.planType && (
          <span className="text-muted-foreground/70"> · {snapshot.planType}</span>
        )}
      </span>
    </span>
  )
  if (!state.errorKey) return text
  return (
    <Tooltip>
      <TooltipTrigger asChild>{text}</TooltipTrigger>
      <TooltipContent className="max-w-64">{t(`errors:${state.errorKey}`)}</TooltipContent>
    </Tooltip>
  )
}

interface WindowRowProps {
  title: string
  hint?: string
  window: UsageWindow | undefined
  displayMode: AppSettings['displayMode']
  now: number
  compact?: boolean
}

/**
 * Label and headline number on one line, gauge below, then the inverse number
 * and the reset time as a caption. Missing windows render dimmed with a dash.
 */
function WindowRow({
  title,
  hint,
  window,
  displayMode,
  now,
  compact
}: WindowRowProps): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const used = window ? effectivePercent(window, now) : null
  const remaining = used === null ? null : remainingPercent(used)
  const headline = used === null ? null : displayMode === 'remaining' ? remaining : used
  const caption = used === null ? null : displayMode === 'remaining' ? used : remaining
  const level = used === null ? 'normal' : usageLevel(used)

  return (
    <div className={cn(used === null && 'opacity-50')}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn('font-medium', compact ? 'text-xs' : 'text-[13px]')}>{title}</span>
        <span className="tabular whitespace-nowrap">
          <span
            className={cn(
              'font-semibold',
              compact ? 'text-[13px]' : 'text-[15px]',
              level === 'critical' && 'text-critical'
            )}
          >
            {headline === null ? '—' : formatPercent(headline)}
          </span>
          {headline !== null && (
            <span className="text-muted-foreground ml-1 text-xs">
              {displayMode === 'remaining' ? t('leftLabel') : t('usedLabel')}
            </span>
          )}
        </span>
      </div>
      <UsageGauge
        className={cn('mt-2', compact ? 'h-1' : 'h-1.5')}
        usedPercent={used ?? 0}
        fillPercent={headline ?? 0}
      />
      <div className="text-muted-foreground mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
        <span className="tabular">
          {caption === null
            ? hint
            : displayMode === 'remaining'
              ? t('percentUsed', { value: Math.round(caption) })
              : t('percentLeft', { value: Math.round(caption) })}
        </span>
        {window && <ResetText window={window} now={now} locale={i18n.language} />}
      </div>
    </div>
  )
}

function ResetText({
  window,
  now,
  locale
}: {
  window: UsageWindow
  now: number
  locale: string
}): React.JSX.Element | null {
  const { t } = useTranslation()
  if (window.resetsAt === null) return null
  if (hasWindowReset(window, now)) return <span>{t('resetDone')}</span>
  return (
    <span className="tabular whitespace-nowrap">
      {t('resetsInAt', {
        duration: formatDuration(window.resetsAt - now, t),
        time: formatClock(window.resetsAt, now, locale)
      })}
    </span>
  )
}

/** Short note when the numbers need context (cached, stale, waiting, error). */
function Hint({ state }: { state: ProviderState }): React.JSX.Element | null {
  const { t } = useTranslation()
  const { provider, status, snapshot, errorKey } = state
  let text: string | null = null
  let tone: 'muted' | 'error' = 'muted'
  if (status === 'cached' && provider === 'claude') text = t('dashboard:cached.claude')
  else if (status === 'stale' && provider === 'claude') text = t('dashboard:stale.claude')
  else if (status === 'idle' && provider === 'claude' && !snapshot)
    text = t('dashboard:waiting.claude')
  else if (errorKey && status !== 'stale' && status !== 'idle') {
    text = t(`errors:${errorKey}`)
    tone = 'error'
  }
  if (!text) return null
  return (
    <span
      title={state.lastError}
      className={cn(
        'text-right leading-snug',
        tone === 'error' ? 'text-critical' : 'text-muted-foreground'
      )}
    >
      {text}
    </span>
  )
}
