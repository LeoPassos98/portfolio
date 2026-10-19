import type { ReactNode } from 'react'
import { AppBrand } from '../../../components/layout/AppBrand'
import { siteHomeUrl } from '../../../shared/lib/siteLinks'

type AuthLayoutProps = {
  children: ReactNode
  wide?: boolean
}

function AuthLayout({ children, wide = false }: AuthLayoutProps) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-8">
      <div className={`flex w-full flex-col items-center gap-6 ${wide ? 'max-w-md lg:max-w-4xl' : 'max-w-md'}`}>
        <AppBrand href={siteHomeUrl} ariaLabel="Voltar ao portfólio" />
        <div className="bg-surface rounded-ui w-full p-6">{children}</div>
      </div>
    </main>
  )
}

export { AuthLayout }
