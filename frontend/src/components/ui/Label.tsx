import type { ComponentPropsWithoutRef } from 'react'

type LabelProps = ComponentPropsWithoutRef<'label'>

function Label({ children, className, ...props }: LabelProps) {
  const classes = [
    'text-foreground',
    'text-sm',
    'font-medium',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={classes} {...props}>
      {children}
    </label>
  )
}

export { Label }
