import { Link, type To } from 'react-router'

type AppBrandProps = {
  ariaLabel?: string
  compact?: boolean
  to?: To
}

function AppBrand({ ariaLabel, compact = false, to }: AppBrandProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-ui border border-neutral-bg bg-surface"
      >
        <span className="h-3 w-3 rounded-sm bg-primary" />
      </span>
      {compact ? null : (
        <span className="text-foreground text-lg font-bold">Sistema OS</span>
      )}
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        aria-label={ariaLabel ?? 'Ir para a página inicial'}
        className="rounded-ui flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {content}
    </div>
  )
}

export { AppBrand }
