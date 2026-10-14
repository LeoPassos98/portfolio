import type { ComponentPropsWithoutRef } from 'react'

type TextareaProps = ComponentPropsWithoutRef<'textarea'>

function Textarea({ className, ...props }: TextareaProps) {
  const classes = [
    'w-full',
    'min-h-24',
    'resize-y',
    'rounded-ui',
    'border',
    'border-neutral',
    'aria-invalid:border-error',
    'px-3',
    'py-2',
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

  return <textarea className={classes} {...props} />
}

export { Textarea }
