type EmptyStateProps = {
  title: string
  description?: string
}

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="bg-surface rounded-ui border border-neutral-bg p-6 text-center"
    >
      <h2 className="text-foreground font-medium">{title}</h2>
      {description && <p className="text-neutral mt-2">{description}</p>}
    </div>
  )
}

export { EmptyState }
