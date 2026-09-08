import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Separator } from '@renderer/components/ui/separator'
import { Switch } from '@renderer/components/ui/switch'
import { LANGUAGES, type AppSettings, type TrayItem } from '@shared/types/settings'
import { PROVIDER_IDS, type ProviderId } from '@shared/types/usage'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { SectionTitle, SettingRow } from './SettingRow'

const LANGUAGE_LABELS: Record<(typeof LANGUAGES)[number], string> = {
  en: 'English',
  vi: 'Tiếng Việt'
}
type TrayChoice = TrayItem['window'] | 'none'

export function GeneralSettings(): React.JSX.Element {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)

  const trayChoice = (provider: ProviderId): TrayChoice =>
    settings.tray.items.find((item) => item.provider === provider)?.window ?? 'none'

  const setTrayChoice = (provider: ProviderId, choice: TrayChoice): void => {
    const others = settings.tray.items.filter((item) => item.provider !== provider)
    const items = choice === 'none' ? others : [...others, { provider, window: choice }]
    items.sort((a, b) => PROVIDER_IDS.indexOf(a.provider) - PROVIDER_IDS.indexOf(b.provider))
    void update({ tray: { items } })
  }

  return (
    <div className="divide-border divide-y">
      <SettingRow label={t('general.language')} hint={t('general.languageHint')}>
        <Select
          value={settings.language}
          onValueChange={(v) => void update({ language: v as AppSettings['language'] })}
        >
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label={t('general.theme')}>
        <Select
          value={settings.theme}
          onValueChange={(v) => void update({ theme: v as AppSettings['theme'] })}
        >
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['system', 'light', 'dark'] as const).map((theme) => (
              <SelectItem key={theme} value={theme}>
                {t(`general.themeOptions.${theme}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label={t('general.displayMode')} hint={t('general.displayModeHint')}>
        <Select
          value={settings.displayMode}
          onValueChange={(v) => void update({ displayMode: v as AppSettings['displayMode'] })}
        >
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="remaining">{t('general.displayModeOptions.remaining')}</SelectItem>
            <SelectItem value="used">{t('general.displayModeOptions.used')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label={t('general.layout')} hint={t('general.layoutHint')}>
        <Select
          value={settings.layout}
          onValueChange={(v) => void update({ layout: v as AppSettings['layout'] })}
        >
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['auto', 'stack', 'grid'] as const).map((layout) => (
              <SelectItem key={layout} value={layout}>
                {t(`general.layoutOptions.${layout}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label={t('general.alwaysOnTop')} hint={t('general.alwaysOnTopHint')}>
        <Switch
          checked={settings.alwaysOnTop}
          onCheckedChange={(v) => void update({ alwaysOnTop: v })}
        />
      </SettingRow>

      <div className="pt-3">
        <SectionTitle>{t('general.tray')}</SectionTitle>
        <SettingRow label={t('general.trayEnabled')}>
          <Switch
            checked={settings.tray.enabled}
            onCheckedChange={(v) => void update({ tray: { enabled: v } })}
          />
        </SettingRow>
        <Separator />
        {PROVIDER_IDS.map((provider) => (
          <SettingRow
            key={provider}
            label={t('general.trayItemLabel', {
              provider: tc(`provider.${provider}`),
              window: ''
            }).trim()}
            className="py-2"
          >
            <Select
              value={trayChoice(provider)}
              onValueChange={(v) => setTrayChoice(provider, v as TrayChoice)}
              disabled={!settings.tray.enabled}
            >
              <SelectTrigger className="w-40" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session">{tc('window.session')}</SelectItem>
                <SelectItem value="weekly">{tc('window.weekly')}</SelectItem>
                <SelectItem value="none">{t('general.trayHidden')}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        ))}
      </div>
    </div>
  )
}
