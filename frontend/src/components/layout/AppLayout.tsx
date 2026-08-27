import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { AppBrand } from './AppBrand'

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard', icon: DashboardIcon },
  { label: 'Ordens de Serviço', to: '/orders', icon: OrdersIcon },
  { label: 'Clientes', to: '/clients', icon: ClientsIcon },
  { label: 'Funcionários', to: '/employees', icon: EmployeesIcon },
]

const sidebarStorageKey = 'sistema-os-sidebar-collapsed'

type AppLayoutProps = {
  children: ReactNode
}

type NavigationOptions = {
  closeMenu?: boolean
  isCollapsed?: boolean
}

function DashboardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5 shrink-0"
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5 shrink-0"
    >
      <path d="M6 3.5h9l3 3v14H6z" />
      <path d="M15 3.5v3h3M9 11h6M9 15h6" />
    </svg>
  )
}

function ClientsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5 shrink-0"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" />
    </svg>
  )
}

function EmployeesIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5 shrink-0"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3 2.6-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
      <path d="M16 7h4M18 5v4M16.5 15.5c2 0 3.3 1.1 4 3.5" />
    </svg>
  )
}

function SidebarToggleIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5"
    >
      <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
      <path d="M9 4v16" />
      {isCollapsed ? <path d="m13 12 3-3m-3 3 3 3" /> : <path d="m16 12-3-3m3 3-3 3" />}
    </svg>
  )
}

function MobileMenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5"
    >
      {isOpen ? (
        <>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  )
}

function getInitialSidebarState() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(sidebarStorageKey) === 'true'
}

function AppLayout({ children }: AppLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isMobileHeaderHidden, setIsMobileHeaderHidden] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    getInitialSidebarState,
  )
  const drawerRef = useRef<HTMLElement>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileScrollPositionRef = useRef(0)
  const logoutButtonRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  const sidebarWidthClass = isSidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
  const sidebarPaddingClass = isSidebarCollapsed ? 'p-3' : 'p-6'

  function toggleSidebar() {
    setIsSidebarCollapsed((isCollapsed) => {
      const nextState = !isCollapsed

      window.localStorage.setItem(sidebarStorageKey, String(nextState))

      return nextState
    })
  }

  function closeMobileNavigation() {
    setIsMenuOpen(false)
  }

  function toggleMobileNavigation() {
    setIsMenuOpen((isOpen) => {
      const nextState = !isOpen

      if (nextState) {
        setIsProfileMenuOpen(false)
      }

      return nextState
    })
  }

  function toggleProfileMenu() {
    setIsProfileMenuOpen((isOpen) => {
      const nextState = !isOpen

      if (nextState) {
        setIsMenuOpen(false)
      }

      return nextState
    })
  }

  function handleMockSignOut() {
    setIsProfileMenuOpen(false)
    navigate('/login')
  }

  useEffect(() => {
    function closeNavigationOnDesktop() {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
        setIsMobileHeaderHidden(false)
      }
    }

    window.addEventListener('resize', closeNavigationOnDesktop)

    return () => window.removeEventListener('resize', closeNavigationOnDesktop)
  }, [])

  useEffect(() => {
    function handleScroll() {
      const currentScrollPosition = Math.max(window.scrollY, 0)

      if (
        window.innerWidth >= 768 ||
        isMenuOpen ||
        isProfileMenuOpen ||
        currentScrollPosition <= 8
      ) {
        setIsMobileHeaderHidden(false)
        mobileScrollPositionRef.current = currentScrollPosition
        return
      }

      const scrollDifference =
        currentScrollPosition - mobileScrollPositionRef.current

      if (Math.abs(scrollDifference) < 12) {
        return
      }

      setIsMobileHeaderHidden(scrollDifference > 0)
      mobileScrollPositionRef.current = currentScrollPosition
    }

    mobileScrollPositionRef.current = Math.max(window.scrollY, 0)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMenuOpen, isProfileMenuOpen])

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const focusedElementBeforeOpen = document.activeElement as HTMLElement | null
    const drawer = drawerRef.current
    const focusableElements = drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    const firstFocusableElement = focusableElements?.[0]
    const lastFocusableElement = focusableElements?.[
      focusableElements.length - 1
    ]
    const previousBodyOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    firstFocusableElement?.focus()

    function handleDrawerKeyboardNavigation(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMobileNavigation()
        return
      }

      if (
        event.key !== 'Tab' ||
        !firstFocusableElement ||
        !lastFocusableElement
      ) {
        return
      }

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault()
        lastFocusableElement.focus()
      }

      if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault()
        firstFocusableElement.focus()
      }
    }

    document.addEventListener('keydown', handleDrawerKeyboardNavigation)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleDrawerKeyboardNavigation)
      focusedElementBeforeOpen?.focus()
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (isProfileMenuOpen) {
      logoutButtonRef.current?.focus()
    }
  }, [isProfileMenuOpen])

  const renderNavigation = ({
    closeMenu = false,
    isCollapsed = false,
  }: NavigationOptions = {}) =>
    navigationItems.map((item) => (
      <NavigationLink
        key={item.to}
        icon={item.icon}
        label={item.label}
        to={item.to}
        isCollapsed={isCollapsed}
        onClick={closeMenu ? closeMobileNavigation : undefined}
      />
    ))

  return (
    <div className="bg-background min-h-screen md:h-screen md:overflow-hidden">
      <header className="bg-surface hidden border-b border-neutral-bg md:block">
        <div className="relative mx-auto flex h-16 max-w-[1180px] items-center">
          <div
            className={[
              'flex',
              'h-full',
              'shrink-0',
              'items-center',
              'justify-center',
              'transition-[width]',
              'duration-200',
              'ease-out',
              sidebarWidthClass,
            ].join(' ')}
          >
            <button
              type="button"
              aria-label={
                isSidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'
              }
              title={
                isSidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'
              }
              className="text-foreground rounded-ui p-2 hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={toggleSidebar}
            >
              <SidebarToggleIcon isCollapsed={isSidebarCollapsed} />
            </button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2">
            <AppBrand />
          </div>

          <div className="absolute right-0 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-bg text-sm font-bold text-neutral">
              AS
            </div>
            <div className="text-right">
              <p className="text-foreground text-sm font-medium">Ana Souza</p>
              <p className="text-neutral text-xs">Administradora</p>
            </div>
          </div>
        </div>
      </header>

      <header
        className={[
          'bg-surface',
          'sticky',
          'top-0',
          'z-50',
          'border-b',
          'border-neutral-bg',
          'transition-transform',
          'duration-200',
          'ease-out',
          'md:hidden',
          isMobileHeaderHidden && '-translate-y-full',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="relative flex h-16 items-center px-4">
          <button
            ref={mobileMenuButtonRef}
            type="button"
            aria-controls="mobile-navigation-drawer"
            aria-expanded={isMenuOpen}
            aria-label={
              isMenuOpen
                ? 'Fechar navegação principal'
                : 'Abrir navegação principal'
            }
            title={
              isMenuOpen
                ? 'Fechar navegação principal'
                : 'Abrir navegação principal'
            }
            className="text-foreground flex h-10 w-10 items-center justify-center rounded-ui hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={toggleMobileNavigation}
          >
            <MobileMenuIcon isOpen={isMenuOpen} />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2">
            <AppBrand />
          </div>

          <div className="relative ml-auto">
            <button
              type="button"
              aria-controls="mobile-profile-menu"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label="Abrir menu de perfil de Ana Souza, Administradora"
              className="text-foreground flex h-10 items-center gap-2 rounded-ui px-1 hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={toggleProfileMenu}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-bg text-xs font-bold text-neutral">
                AS
              </span>
              <span className="hidden text-left min-[420px]:block">
                <span className="block text-xs font-medium">Ana Souza</span>
                <span className="text-neutral block text-[11px]">
                  Administradora
                </span>
              </span>
            </button>

            {isProfileMenuOpen ? (
              <div
                id="mobile-profile-menu"
                role="menu"
                aria-label="Menu de perfil"
                className="bg-surface absolute right-0 top-full z-50 mt-2 w-48 rounded-ui border border-neutral-bg p-2 shadow-md"
              >
                <button
                  ref={logoutButtonRef}
                  type="button"
                  role="menuitem"
                  className="text-foreground w-full rounded-ui px-3 py-2 text-left text-sm font-medium hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={handleMockSignOut}
                >
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar navegação principal"
            className="absolute inset-0 bg-foreground/30"
            onClick={closeMobileNavigation}
          />
          <aside
            ref={drawerRef}
            id="mobile-navigation-drawer"
            aria-label="Navegação principal"
            className="bg-surface absolute bottom-0 left-0 top-16 w-[min(20rem,calc(100vw-3rem))] overflow-y-auto border-r border-neutral-bg p-4 shadow-xl"
          >
            <nav className="space-y-2">
              {renderNavigation({ closeMenu: true })}
            </nav>
          </aside>
        </div>
      ) : null}

      <div className="md:mx-auto md:flex md:h-[calc(100vh-4rem)] md:max-w-[1180px]">
        <aside
          className={[
            'bg-surface',
            'hidden',
            'shrink-0',
            'overflow-y-auto',
            'border-r',
            'border-neutral-bg',
            'transition-[width,padding]',
            'duration-200',
            'ease-out',
            'md:block',
            sidebarWidthClass,
            sidebarPaddingClass,
          ].join(' ')}
        >
          <nav aria-label="Navegação principal" className="space-y-2">
            {renderNavigation({ isCollapsed: isSidebarCollapsed })}
          </nav>
        </aside>

        <main
          aria-hidden={isMenuOpen || undefined}
          className="min-w-0 p-6 md:flex-1 md:overflow-y-auto"
        >
          {children}
        </main>
      </div>
    </div>
  )
}

type NavigationLinkProps = {
  icon: () => ReactNode
  isCollapsed: boolean
  label: string
  onClick?: () => void
  to: string
}

function NavigationLink({
  icon: Icon,
  isCollapsed,
  label,
  onClick,
  to,
}: NavigationLinkProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      aria-label={isCollapsed ? label : undefined}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'flex',
          'items-center',
          'rounded-ui',
          'px-3',
          'py-2',
          'text-sm',
          'font-medium',
          'focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-primary',
          'focus-visible:ring-offset-2',
          isCollapsed && 'justify-center',
          !isCollapsed && 'gap-3',
          isActive && 'bg-primary',
          isActive && 'text-white',
          !isActive && 'text-neutral',
          !isActive && 'hover:bg-neutral-bg',
        ]
          .filter(Boolean)
          .join(' ')
      }
    >
      <Icon />
      {isCollapsed ? null : <span>{label}</span>}
    </NavLink>
  )
}

export { AppLayout }
