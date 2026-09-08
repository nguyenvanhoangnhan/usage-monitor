import { Menu, Tray, nativeImage, type MenuItemConstructorOptions } from 'electron'
import type { AppSettings } from '@shared/types/settings'
import { PROVIDER_IDS, type ProviderId, type UsageState } from '@shared/types/usage'
import { effectivePercent, findWindow } from '@shared/usage/windows'
import { remainingPercent } from '@shared/usage/thresholds'
import { mainI18n } from '../i18n'
import { formatDuration } from '../lib/format'

export interface TrayActions {
  openWindow(): void
  openSettings(): void
  refresh(): void
  toggleAlwaysOnTop(value: boolean): void
  quit(): void
}

/** Menubar item: compact percentages in the title, full breakdown in the menu. */
export class TrayController {
  private tray: Tray | null = null

  constructor(
    private readonly iconPath: string,
    private readonly actions: TrayActions
  ) {}

  update(state: UsageState, settings: AppSettings): void {
    if (!settings.tray.enabled) {
      this.destroy()
      return
    }
    const tray = this.ensure()
    tray.setTitle(this.buildTitle(state, settings), { fontType: 'monospacedDigit' })
    tray.setToolTip(mainI18n.t('tray:tooltip'))
    tray.setContextMenu(Menu.buildFromTemplate(this.buildMenu(state, settings)))
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }

  private ensure(): Tray {
    if (this.tray) return this.tray
    const image = nativeImage.createFromPath(this.iconPath)
    image.setTemplateImage(true)
    this.tray = new Tray(image)
    this.tray.on('click', () => this.tray?.popUpContextMenu())
    return this.tray
  }

  private buildTitle(state: UsageState, settings: AppSettings): string {
    const t = mainI18n.t
    const parts = settings.tray.items
      .filter((item) => isEnabled(item.provider, settings))
      .map((item) => {
        const short = t(`tray:shortProvider.${item.provider}`)
        const window = findWindow(state[item.provider].snapshot, item.window)
        const value = window
          ? `${Math.round(remainingPercent(effectivePercent(window)))}%`
          : t('tray:noData')
        return `${short} ${value}`
      })
    return parts.length > 0 ? ` ${parts.join(' · ')}` : ''
  }

  private buildMenu(state: UsageState, settings: AppSettings): MenuItemConstructorOptions[] {
    const t = mainI18n.t
    const lines: MenuItemConstructorOptions[] = []
    for (const id of PROVIDER_IDS) {
      if (!isEnabled(id, settings)) continue
      const providerState = state[id]
      const name = t(`common:provider.${id}`)
      const session = findWindow(providerState.snapshot, 'session')
      const weekly = findWindow(providerState.snapshot, 'weekly')
      if (!providerState.snapshot) {
        lines.push({ label: t('tray:lineMissing', { provider: name }), enabled: false })
        continue
      }
      lines.push({
        label: t('tray:line', {
          provider: name,
          session: session ? Math.round(remainingPercent(effectivePercent(session))) : '--',
          weekly: weekly ? Math.round(remainingPercent(effectivePercent(weekly))) : '--'
        }),
        enabled: false
      })
      if (session?.resetsAt) {
        lines.push({
          label: `   ${t('common:window.session')}: ${t('tray:resets', { duration: formatDuration(session.resetsAt - Date.now(), mainI18n.t) })}`,
          enabled: false
        })
      }
      if (providerState.status !== 'ok') {
        lines.push({
          label: `   ${t('tray:lineStatus', { provider: name, status: t(`common:status.${providerState.status}`) })}`,
          enabled: false
        })
      }
    }
    return [
      ...lines,
      { type: 'separator' },
      { label: t('tray:open'), click: () => this.actions.openWindow() },
      { label: t('tray:refresh'), click: () => this.actions.refresh() },
      {
        label: t('tray:alwaysOnTop'),
        type: 'checkbox',
        checked: settings.alwaysOnTop,
        click: (item) => this.actions.toggleAlwaysOnTop(item.checked)
      },
      { label: t('tray:settings'), click: () => this.actions.openSettings() },
      { type: 'separator' },
      { label: t('tray:quit'), click: () => this.actions.quit() }
    ]
  }
}

function isEnabled(id: ProviderId, settings: AppSettings): boolean {
  return settings[id].enabled
}
