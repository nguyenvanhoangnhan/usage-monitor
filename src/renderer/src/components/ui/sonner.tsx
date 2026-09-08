import { CheckCircle, Info, CircleNotch, XCircle, Warning } from '@phosphor-icons/react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** Toast host. Theme is passed in by the app shell instead of next-themes. */
const Toaster = ({ ...props }: ToasterProps): React.JSX.Element => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CheckCircle className="size-4" />,
        info: <Info className="size-4" />,
        warning: <Warning className="size-4" />,
        error: <XCircle className="size-4" />,
        loading: <CircleNotch className="size-4 animate-spin" />
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)'
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
