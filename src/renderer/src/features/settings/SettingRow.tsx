import { cn } from '@renderer/lib/utils'

export interface SettingRowProps {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}

/** Label on the left, control on the right; stacks when the container is narrow. */
export function SettingRow({
  label,
  hint,
  children,
  className
}: SettingRowProps): React.JSX.Element {
  return (
    <div
      className={cn(
        '@sm:flex-row @sm:items-center flex flex-col justify-between gap-2 py-3',
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <h3 className="eyebrow mt-4 mb-1">{children}</h3>
}
