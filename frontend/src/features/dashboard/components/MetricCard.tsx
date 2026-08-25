import { Link } from 'react-router'

type MetricCardProps = {
  label: string
  value: number
  backgroundClass: string
  valueClass: string
  to: string
}

function MetricCard({
  label,
  value,
  backgroundClass,
  valueClass,
  to,
}: MetricCardProps) {
  return (
    <Link
      to={to}
      className={[
        'block',
        'rounded-ui',
        'p-5',
        'transition-shadow',
        'hover:shadow-md',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-primary',
        'focus-visible:ring-offset-2',
        backgroundClass,
      ].join(' ')}
    >
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
    </Link>
  )
}

export { MetricCard }
