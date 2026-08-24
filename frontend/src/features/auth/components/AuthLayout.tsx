import type { ReactNode } from 'react'

type AuthLayoutProps = {
  children: ReactNode
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-8">
      <div className="bg-surface rounded-ui w-full max-w-md p-6">
        {children}
      </div>
    </main>
  )
}

export { AuthLayout }
