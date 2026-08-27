type AppBrandProps = {
  compact?: boolean
}

function AppBrand({ compact = false }: AppBrandProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-ui border border-neutral-bg bg-surface"
      >
        <span className="h-3 w-3 rounded-sm bg-primary" />
      </span>
      {compact ? null : (
        <span className="text-foreground text-lg font-bold">Sistema OS</span>
      )}
    </div>
  )
}

export { AppBrand }
