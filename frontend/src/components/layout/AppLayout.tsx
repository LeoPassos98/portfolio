import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Ordens de Serviço', to: '/orders' },
  { label: 'Clientes', to: '/clients' },
  { label: 'Funcionários', to: '/employees' },
]

type AppLayoutProps = {
  children: ReactNode
}

function AppLayout({ children }: AppLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const renderNavigation = (closeMenu = false) =>
    navigationItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={closeMenu ? () => setIsMenuOpen(false) : undefined}
        className={({ isActive }) =>
          [
            'block',
            'rounded-ui',
            'px-3',
            'py-2',
            'text-sm',
            'font-medium',
            'focus-visible:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-primary',
            'focus-visible:ring-offset-2',
            isActive && 'bg-primary',
            isActive && 'text-white',
            !isActive && 'text-neutral',
            !isActive && 'hover:bg-neutral-bg',
          ]
            .filter(Boolean)
            .join(' ')
        }
      >
        {item.label}
      </NavLink>
    ))

  return (
    <div className="bg-background min-h-screen md:flex">
      <header className="bg-surface p-4 md:hidden">
        <div className="flex items-center justify-between">
          <p className="text-foreground text-lg font-bold">Sistema OS</p>

          <button
            type="button"
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            className="text-foreground rounded-ui px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            Menu
          </button>
        </div>

        {isMenuOpen && (
          <nav id="mobile-navigation" className="mt-4 space-y-2">
            {renderNavigation(true)}
          </nav>
        )}
      </header>

      <aside className="bg-surface hidden w-64 shrink-0 p-6 md:block">
        <p className="text-foreground text-lg font-bold">Sistema OS</p>

        <nav className="mt-8 space-y-2">{renderNavigation()}</nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

export { AppLayout }
