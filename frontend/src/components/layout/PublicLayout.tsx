import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { AppBrand } from './AppBrand'

type PublicLayoutProps = {
  children: ReactNode
}

function PublicLayout({ children }: PublicLayoutProps) {
  const { session } = useAuth()
  const access = session
    ? session.mustChangePassword
      ? { label: 'Continuar configuração', to: '/first-access' }
      : { label: 'Ir para o sistema', to: '/dashboard' }
    : { label: 'Entrar', to: '/login' }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="bg-surface border-b border-neutral-bg">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4">
          <AppBrand to="/" ariaLabel="Ir para a página inicial" />
          <Link
            to={access.to}
            className="bg-primary hover:bg-primary-hover rounded-ui px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {access.label}
          </Link>
        </div>
      </header>

      <main className="flex flex-1">{children}</main>

      <footer className="border-t border-neutral-bg px-4 py-6">
        <p className="text-neutral mx-auto max-w-[1180px] text-sm">
          Sistema OS
        </p>
      </footer>
    </div>
  )
}

export { PublicLayout }
