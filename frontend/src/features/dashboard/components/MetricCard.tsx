type MetricCardProps = {
  label: string
  value: number
  backgroundClass: string
  valueClass: string
}

function MetricCard({
  label,
  value,
  backgroundClass,
  valueClass,
}: MetricCardProps) {
  return (
    <article
      className={[
        'rounded-ui',
        'p-5',
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
    </article>
  )
}

export { MetricCard }
