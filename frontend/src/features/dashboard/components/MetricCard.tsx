import { Link } from 'react-router'

type MetricCardProps = {
  label: string
  value: number | string
  secondaryText?: string
  valueClass: string
  to?: string
}

function MetricCard({
  label,
  value,
  secondaryText,
  valueClass,
  to,
}: MetricCardProps) {
  const classes = [
    'bg-surface',
    'block',
    'rounded-ui',
    'border',
    'border-neutral-bg',
    'p-5',
    to && 'transition-shadow',
    to && 'hover:shadow-md',
    to && 'focus-visible:outline-none',
    to && 'focus-visible:ring-2',
    to && 'focus-visible:ring-primary',
    to && 'focus-visible:ring-offset-2',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <p className="text-neutral text-sm font-medium">{label}</p>
      <p
        className={[
          'mt-2',
          'text-3xl',
          'font-bold',
          valueClass,
        ].join(' ')}
      >
        {value}
      </p>
      {secondaryText && (
        <p className="text-neutral mt-2 text-sm">{secondaryText}</p>
      )}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  return <article className={classes}>{content}</article>
}

export { MetricCard }
