import type { ReactNode } from 'react'
import { AppBrand } from '../../../components/layout/AppBrand'

type AuthLayoutProps = {
  children: ReactNode
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <AppBrand to="/" ariaLabel="Ir para a página inicial" />
        <div className="bg-surface rounded-ui w-full p-6">{children}</div>
      </div>
    </main>
  )
}

export { AuthLayout }
