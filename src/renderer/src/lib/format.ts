import type { TFunction } from 'i18next'

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

/** `2h 14m`, `3d 4h`, `now`; unit labels come from the `common` namespace. */
export function formatDuration(ms: number, t: TFunction): string {
  if (ms <= 0) return t('duration.now')
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) {
    return `${t('duration.days', { count: days })} ${t('duration.hours', { count: hours })}`
  }
  if (hours > 0) {
    return `${t('duration.hours', { count: hours })} ${t('duration.minutes', { count: minutes })}`
  }
  if (minutes > 0) return t('duration.minutes', { count: minutes })
  return t('duration.seconds', { count: Math.max(1, Math.floor(ms / 1000)) })
}

/** Localised "3 minutes ago" using the browser's Intl support. */
export function formatRelativeTime(timestamp: number, now: number, locale: string): string {
  // File mtimes can sit a few hundred ms ahead of the last tick; never say "in 1 second".
  const diffSec = Math.min(0, Math.round((timestamp - now) / 1000))
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const abs = Math.abs(diffSec)
  if (abs < 60) return rtf.format(diffSec, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86400), 'day')
}

/** Short clock time, adding the weekday when the moment is not today. */
export function formatClock(timestamp: number, now: number, locale: string): string {
  const date = new Date(timestamp)
  const sameDay = new Date(now).toDateString() === date.toDateString()
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    ...(sameDay ? {} : { weekday: 'short' })
  }).format(date)
}
