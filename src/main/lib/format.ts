import type { TFunction } from 'i18next'

/** Compact duration such as `2h 14m` or `3d 4h`, translated unit labels. */
export function formatDuration(ms: number, t: TFunction): string {
  if (ms <= 0) return t('common:duration.now')
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0)
    return `${t('common:duration.days', { count: days })} ${t('common:duration.hours', { count: hours })}`
  if (hours > 0)
    return `${t('common:duration.hours', { count: hours })} ${t('common:duration.minutes', { count: minutes })}`
  if (minutes > 0) return t('common:duration.minutes', { count: minutes })
  return t('common:duration.seconds', { count: Math.max(1, Math.floor(ms / 1000)) })
}
