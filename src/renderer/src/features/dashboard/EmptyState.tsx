import { useTranslation } from 'react-i18next'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@renderer/components/ui/button'
import type { ProviderId } from '@shared/types/usage'

export interface EmptyStateProps {
  provider: ProviderId
  onAction(): void
}

/** Shown inside a provider card when its data source is not wired up yet. */
export function EmptyState({ provider, onAction }: EmptyStateProps): React.JSX.Element {
  const { t } = useTranslation('dashboard')
  return (
    <div className="mt-4 max-w-[46ch]">
      <p className="text-[13px] font-medium">{t(`empty.${provider}.title`)}</p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        {t(`empty.${provider}.body`)}
      </p>
      <Button size="sm" variant="outline" className="mt-3 h-7 text-xs" onClick={onAction}>
        {t(`empty.${provider}.action`)}
        <ArrowRight size={12} />
      </Button>
    </div>
  )
}
