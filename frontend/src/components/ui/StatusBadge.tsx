import type { ReactNode } from 'react'

type StatusBadgeVariant =
  | 'warning'
  | 'info'
  | 'success'
  | 'neutral'
  | 'error'

type StatusBadgeProps = {
  children: ReactNode
  variant: StatusBadgeVariant
}

const variantClasses: Record<StatusBadgeVariant, string[]> = {
  warning: [
    'bg-warning-bg',
    'text-warning',
  ],
  info: [
    'bg-info-bg',
    'text-info',
  ],
  success: [
    'bg-success-bg',
    'text-success',
  ],
  neutral: [
    'bg-neutral-bg',
    'text-neutral',
  ],
  error: [
    'bg-error-bg',
    'text-error',
  ],
}

function StatusBadge({ children, variant }: StatusBadgeProps) {
  const classes = [
    'inline-flex',
    'items-center',
    'rounded-ui',
    'px-2',
    'py-1',
    'text-xs',
    'font-medium',
    ...variantClasses[variant],
  ].join(' ')

  return <span className={classes}>{children}</span>
}

export { StatusBadge }
