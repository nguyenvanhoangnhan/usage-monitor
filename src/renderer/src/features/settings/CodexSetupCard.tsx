import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowClockwise } from '@phosphor-icons/react'
import { Button } from '@renderer/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'
import type { CodexSetupStatus } from '@shared/types/setup'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { useUsageStore } from '@renderer/stores/usage-store'
import { PathList, StatusLine } from './ClaudeSetupCard'
import { SectionTitle, SettingRow } from './SettingRow'

const POLL_CHOICES = [30, 60, 120, 300, 600] as const

export function CodexSetupCard(): React.JSX.Element {
  const { t, i18n } = useTranslation('settings')
  const { t: tc } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const codexState = useUsageStore((s) => s.state.codex)
  const refreshing = useUsageStore((s) => s.refreshing)
  const refresh = useUsageStore((s) => s.refresh)
  const [status, setStatus] = useState<CodexSetupStatus | null>(null)

  const load = useCallback(() => window.api.getCodexSetupStatus().then(setStatus), [])
  useEffect(() => {
    void load()
  }, [load, codexState.updatedAt])

  const statusText = (s: CodexSetupStatus): { ok: boolean; text: string } => {
    if (!s.exists) return { ok: false, text: t('codex.status.missing') }
    if (!s.hasAccessToken) return { ok: false, text: t('codex.status.noToken') }
    if (!s.hasAccountId) return { ok: false, text: t('codex.status.noAccount') }
    return { ok: true, text: t('codex.status.found') }
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-[13px] leading-relaxed">{t('codex.intro')}</p>

      <div className="divide-border divide-y">
        <SettingRow label={t('codex.enabled')}>
          <Switch
            checked={settings.codex.enabled}
            onCheckedChange={(v) => void update({ codex: { enabled: v } })}
          />
        </SettingRow>
        <SettingRow label={t('codex.pollInterval')}>
          <Select
            value={String(settings.codex.pollIntervalSeconds)}
            onValueChange={(v) => void update({ codex: { pollIntervalSeconds: Number(v) } })}
          >
            <SelectTrigger className="w-40" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POLL_CHOICES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {t('codex.pollIntervalUnit', { count: s })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </div>

      <SectionTitle>{t('codex.title')}</SectionTitle>
      {status && (
        <div className="bg-surface space-y-3 rounded-lg p-3">
          <StatusLine ok={statusText(status).ok}>{statusText(status).text}</StatusLine>
          {status.lastRefresh && (
            <p className="text-muted-foreground text-xs">
              {t('codex.status.lastRefresh', {
                time: formatIso(status.lastRefresh, i18n.language)
              })}
            </p>
          )}
          {codexState.snapshot?.planType && (
            <p className="text-xs">{tc('plan', { plan: codexState.snapshot.planType })}</p>
          )}
          {codexState.errorKey && (
            <p className="text-critical text-xs leading-relaxed" title={codexState.lastError}>
              {tc(`errors:${codexState.errorKey}`)}
            </p>
          )}
          <Button size="sm" onClick={() => void refresh('codex')} disabled={refreshing}>
            <ArrowClockwise size={14} className={cn(refreshing && 'animate-spin')} />
            {t('codex.refresh')}
          </Button>
          <PathList rows={[[t('codex.paths.auth'), status.authPath]]} />
        </div>
      )}
    </div>
  )
}

function formatIso(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
