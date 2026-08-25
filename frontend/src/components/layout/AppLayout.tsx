import type { ReactNode } from 'react'

type AppLayoutProps = {
  children: ReactNode
}

function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="bg-background flex min-h-screen">
      <aside className="bg-surface w-64 shrink-0 p-6">
        <p className="text-foreground text-lg font-bold">Sistema OS</p>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

export { AppLayout }
