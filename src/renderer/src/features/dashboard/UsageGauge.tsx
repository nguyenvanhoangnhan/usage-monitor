import { cn } from '@renderer/lib/utils'
import { clampPercent, usageLevel, type UsageLevel } from '@shared/usage/thresholds'

export interface UsageGaugeProps {
  /** Percentage consumed, 0 to 100. Drives the colour. */
  usedPercent: number
  /** Percentage drawn as the filled part; defaults to `usedPercent`. */
  fillPercent?: number
  className?: string
}

const LEVEL_CLASS: Record<UsageLevel, string> = {
  normal: 'bg-primary',
  warn: 'bg-warn',
  critical: 'bg-critical'
}

/** Thin horizontal gauge. Colour follows the shared thresholds; the width animates in CSS. */
export function UsageGauge({
  usedPercent,
  fillPercent = usedPercent,
  className
}: UsageGaugeProps): React.JSX.Element {
  const fill = clampPercent(fillPercent)
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(fill)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('bg-track h-1 w-full overflow-hidden rounded-full', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          LEVEL_CLASS[usageLevel(usedPercent)]
        )}
        style={{ width: `${fill}%` }}
      />
    </div>
  )
}
