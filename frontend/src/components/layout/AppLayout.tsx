import type { ReactNode } from 'react'
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
  return (
    <div className="bg-background flex min-h-screen">
      <aside className="bg-surface w-64 shrink-0 p-6">
        <p className="text-foreground text-lg font-bold">Sistema OS</p>

        <nav className="mt-8 space-y-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

export { AppLayout }
