import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { siteHomeUrl } from '../../shared/lib/siteLinks'
import { AppBrand } from './AppBrand'

type VisitorLayoutProps = {
  children: ReactNode
}

function VisitorLayout({ children }: VisitorLayoutProps) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="bg-surface border-neutral-bg border-b">
        <div className="mx-auto flex min-h-20 max-w-[1180px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <AppBrand to="/login" ariaLabel="Ir para o login do Sistema OS" />
          <nav aria-label="Navegação do visitante" className="flex items-center gap-4">
            <a
              href={siteHomeUrl}
              className="text-neutral hover:text-primary rounded-ui text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Portfólio
            </a>
            <Link
              to="/login"
              className="border-neutral-bg text-foreground hover:border-primary hover:text-primary rounded-ui border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="flex flex-1">
        {children}
      </main>
      <footer className="border-neutral-bg text-neutral border-t px-4 py-6 text-center text-sm">
        Sistema OS · Demonstração
      </footer>
    </div>
  )
}

export { VisitorLayout }
