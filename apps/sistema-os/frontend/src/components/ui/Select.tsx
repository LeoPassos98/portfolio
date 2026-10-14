import type { ComponentPropsWithoutRef } from 'react'

type SelectProps = ComponentPropsWithoutRef<'select'>

function Select({ children, className, ...props }: SelectProps) {
  const classes = [
    'w-full',
    'h-10',
    'rounded-ui',
    'border',
    'border-neutral',
    'aria-invalid:border-error',
    'px-3',
    'text-foreground',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-primary',
    'focus-visible:ring-offset-2',
    'aria-invalid:ring-error',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <select className={classes} {...props}>
      {children}
    </select>
  )
}

export { Select }
