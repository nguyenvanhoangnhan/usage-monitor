import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckCircle, Copy, FolderOpen, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'
import { formatRelativeTime } from '@renderer/lib/format'
import type { ClaudeSetupStatus } from '@shared/types/setup'
import { useNow } from '@renderer/hooks/useCountdown'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { useUsageStore } from '@renderer/stores/usage-store'
import { SectionTitle, SettingRow } from './SettingRow'

const STALE_CHOICES = [5, 10, 15, 30, 60] as const

export function ClaudeSetupCard(): React.JSX.Element {
  const { t, i18n } = useTranslation('settings')
  const { t: tc } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const claudeState = useUsageStore((s) => s.state.claude)
  const now = useNow(5000)
  const [status, setStatus] = useState<ClaudeSetupStatus | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [installing, setInstalling] = useState(false)

  const load = useCallback(() => window.api.getClaudeSetupStatus().then(setStatus), [])
  useEffect(() => {
    void load()
  }, [load, claudeState.updatedAt])

  const install = async (): Promise<void> => {
    setInstalling(true)
    try {
      const result = await window.api.installClaudeStatusline()
      if (result.ok) {
        toast.success(
          result.backupPath
            ? t('claude.install.success', { backup: result.backupPath })
            : t('claude.install.successNoBackup')
        )
      } else {
        toast.error(tc(`errors:${result.errorKey ?? 'generic'}`), { description: result.detail })
      }
      await load()
    } finally {
      setInstalling(false)
      setConfirmOpen(false)
    }
  }

  const snippet = status
    ? JSON.stringify({ statusLine: { type: 'command', command: status.scriptPath } }, null, 2)
    : ''

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-[13px] leading-relaxed">{t('claude.intro')}</p>

      <div className="divide-border divide-y">
        <SettingRow label={t('claude.enabled')}>
          <Switch
            checked={settings.claude.enabled}
            onCheckedChange={(v) => void update({ claude: { enabled: v } })}
          />
        </SettingRow>
        <SettingRow label={t('claude.staleAfter')}>
          <Select
            value={String(settings.claude.staleAfterMinutes)}
            onValueChange={(v) => void update({ claude: { staleAfterMinutes: Number(v) } })}
          >
            <SelectTrigger className="w-40" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STALE_CHOICES.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {t('claude.staleAfterUnit', { count: m })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </div>

      <SectionTitle>{t('claude.title')}</SectionTitle>
      {status && (
        <div className="bg-surface space-y-3 rounded-lg p-3">
          <StatusLine ok={status.installed}>
            {status.installed ? t('claude.status.installed') : t('claude.status.notInstalled')}
          </StatusLine>
          {status.existingCommand && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t('claude.status.existingCommand')}
              <code className="bg-background ml-1 rounded px-1 py-0.5 text-[11px] break-all">
                {status.existingCommand}
              </code>
            </p>
          )}
          <StatusLine ok={status.dataFileExists} tone={status.dataFileExists ? 'ok' : 'muted'}>
            {status.dataFileUpdatedAt
              ? t('claude.status.dataFileUpdated', {
                  ago: formatRelativeTime(status.dataFileUpdatedAt, now, i18n.language)
                })
              : t('claude.status.dataFileMissing')}
          </StatusLine>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={installing}>
              {status.installed ? t('claude.install.reinstall') : t('claude.install.button')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void window.api.openPath(status.dataFilePath)}
            >
              <FolderOpen size={14} />
              {tc('action.openFolder')}
            </Button>
          </div>

          <PathList
            rows={[
              [t('claude.paths.settings'), status.settingsPath],
              [t('claude.paths.script'), status.scriptPath],
              [t('claude.paths.data'), status.dataFilePath]
            ]}
          />
        </div>
      )}

      <SectionTitle>{t('claude.manual.title')}</SectionTitle>
      <p className="text-muted-foreground text-xs">
        {t('claude.manual.body', { settings: status?.settingsPath ?? '' })}
      </p>
      <div className="relative">
        <pre className="bg-surface overflow-x-auto rounded-lg p-3 text-[11px] leading-relaxed select-text">
          {snippet}
        </pre>
        <CopyButton text={snippet} />
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">{t('claude.install.confirmTitle')}</DialogTitle>
            <DialogDescription className="break-all">
              {t('claude.install.confirmBody', {
                script: status?.scriptPath ?? '',
                settings: status?.settingsPath ?? ''
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={installing}>
              {tc('action.cancel')}
            </Button>
            <Button onClick={() => void install()} disabled={installing}>
              {tc('action.install')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function StatusLine({
  ok,
  tone,
  children
}: {
  ok: boolean
  tone?: 'ok' | 'muted' | 'error'
  children: React.ReactNode
}): React.JSX.Element {
  const resolved = tone ?? (ok ? 'ok' : 'error')
  const Icon = ok ? CheckCircle : WarningCircle
  return (
    <div
      className={cn(
        'flex items-start gap-2 text-xs',
        resolved === 'ok' && 'text-ok',
        resolved === 'error' && 'text-critical',
        resolved === 'muted' && 'text-muted-foreground'
      )}
    >
      <Icon size={16} className="mt-px shrink-0" weight="fill" />
      <span className="text-foreground leading-relaxed">{children}</span>
    </div>
  )
}

export function PathList({ rows }: { rows: Array<[string, string]> }): React.JSX.Element {
  return (
    <dl className="space-y-1.5 text-[11px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-mono break-all select-text">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function CopyButton({ text }: { text: string }): React.JSX.Element {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Button
      size="sm"
      variant="ghost"
      className="absolute top-1.5 right-1.5 h-7 text-xs"
      onClick={() => void copy()}
    >
      <Copy size={12} />
      {copied ? t('action.copied') : t('action.copy')}
    </Button>
  )
}
