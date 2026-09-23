import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useAuthSession } from '../../features/auth/hooks/useAuthSession'
import { AppBrand } from './AppBrand'

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard', icon: DashboardIcon },
  { label: 'Ordens de Serviço', to: '/orders', icon: OrdersIcon },
  { label: 'Clientes', to: '/clients', icon: ClientsIcon },
  {
    label: 'Funcionários',
    to: '/employees',
    icon: EmployeesIcon,
    requiresAdmin: true,
  },
]

const sidebarStorageKey = 'sistema-os-sidebar-collapsed'

type AppLayoutProps = {
  children: ReactNode
}

type NavigationOptions = {
  closeMenu?: boolean
  isCollapsed?: boolean
}

type UserMenuSurface = 'desktop' | 'mobile'

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
      {isCollapsed ? <path d="m16 12-3-3m3 3-3 3" /> : <path d="m13 12 3-3m-3 3 3 3" />}
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

function getUserInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0])
    .join('')
}

function AppLayout({ children }: AppLayoutProps) {
  const session = useAuthSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeProfileMenu, setActiveProfileMenu] =
    useState<UserMenuSurface | null>(null)
  const [isMobileHeaderHidden, setIsMobileHeaderHidden] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    getInitialSidebarState,
  )
  const drawerRef = useRef<HTMLElement>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileScrollPositionRef = useRef(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { logout } = useAuth()

  const sidebarWidthClass = isSidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
  const sidebarPaddingClass = 'p-3'
  const currentUser = session?.currentUser
  const profileLabel =
    currentUser?.profile === 'admin' ? 'Administradora' : 'Funcionário'
  const userInitials = currentUser ? getUserInitials(currentUser.name) : ''
  const handleDesktopProfileMenuOpenChange = useCallback(
    (isOpen: boolean) => {
      setActiveProfileMenu(isOpen ? 'desktop' : null)
    },
    [],
  )
  const handleMobileProfileMenuOpenChange = useCallback((isOpen: boolean) => {
    setActiveProfileMenu(isOpen ? 'mobile' : null)
    if (isOpen) {
      setIsMenuOpen(false)
    }
  }, [])

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
        setActiveProfileMenu(null)
      }

      return nextState
    })
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)
    setLogoutError(null)

    try {
      await logout()
      setActiveProfileMenu(null)
      navigate('/login', { replace: true })
    } catch {
      setLogoutError('Não foi possível encerrar a sessão. Tente novamente.')
    } finally {
      setIsLoggingOut(false)
    }
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
        activeProfileMenu !== null ||
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
  }, [activeProfileMenu, isMenuOpen])

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

  const renderNavigation = ({
    closeMenu = false,
    isCollapsed = false,
  }: NavigationOptions = {}) =>
    navigationItems
      .filter(
        (item) => !item.requiresAdmin || currentUser?.profile === 'admin',
      )
      .map((item) => (
        <NavigationLink
          key={item.to}
          icon={item.icon}
          label={item.label}
          to={item.to}
          isCollapsed={isCollapsed}
          onClick={closeMenu ? closeMobileNavigation : undefined}
        />
      ))

  if (!currentUser) {
    return null
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-surface hidden border-b border-neutral-bg md:sticky md:top-0 md:z-30 md:block">
        <div className="relative mx-auto flex h-16 max-w-[1180px] items-center">
          <div className="flex h-full w-[240px] shrink-0 items-center justify-start px-3">
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
            <AppBrand to="/dashboard" ariaLabel="Ir para o Dashboard" />
          </div>

          <div className="absolute right-0">
            <UserMenu
              currentUserName={currentUser.name}
              isLoggingOut={isLoggingOut}
              isOpen={activeProfileMenu === 'desktop'}
              logoutError={logoutError}
              profileLabel={profileLabel}
              surface="desktop"
              userInitials={userInitials}
              onLogout={() => void handleLogout()}
              onOpenChange={handleDesktopProfileMenuOpenChange}
            />
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
            <AppBrand to="/dashboard" ariaLabel="Ir para o Dashboard" />
          </div>

          <div className="ml-auto">
            <UserMenu
              compact
              currentUserName={currentUser.name}
              isLoggingOut={isLoggingOut}
              isOpen={activeProfileMenu === 'mobile'}
              logoutError={logoutError}
              profileLabel={profileLabel}
              surface="mobile"
              userInitials={userInitials}
              onLogout={() => void handleLogout()}
              onOpenChange={handleMobileProfileMenuOpenChange}
            />
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

      <div className="md:mx-auto md:flex md:max-w-[1180px] md:items-start">
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
            'md:sticky',
            'md:top-16',
            'md:h-[calc(100vh-4rem)]',
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
          className="min-w-0 p-6 md:flex-1"
        >
          {children}
        </main>
      </div>
    </div>
  )
}

type UserMenuProps = {
  compact?: boolean
  currentUserName: string
  isLoggingOut: boolean
  isOpen: boolean
  logoutError: string | null
  onLogout: () => void
  onOpenChange: (isOpen: boolean) => void
  profileLabel: string
  surface: UserMenuSurface
  userInitials: string
}

function UserMenu({
  compact = false,
  currentUserName,
  isLoggingOut,
  isOpen,
  logoutError,
  onLogout,
  onOpenChange,
  profileLabel,
  surface,
  userInitials,
}: UserMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null)
  const menuId = `${surface}-profile-menu`

  useEffect(() => {
    if (!isOpen) {
      return
    }

    firstMenuItemRef.current?.focus()

    function handleMenuKeyboard(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      onOpenChange(false)
      buttonRef.current?.focus()
    }

    function handleOutsideClick(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleMenuKeyboard)
    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('keydown', handleMenuKeyboard)
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen, onOpenChange])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${isOpen ? 'Fechar' : 'Abrir'} menu de usuário de ${currentUserName}, ${profileLabel}`}
        className="text-foreground flex h-11 items-center gap-2 rounded-ui px-2 hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-bg text-xs font-bold text-neutral">
          {userInitials}
        </span>
        <span
          className={
            compact ? 'hidden text-left min-[420px]:block' : 'text-right'
          }
        >
          <span
            className={
              compact
                ? 'block text-xs font-medium'
                : 'block text-sm font-medium'
            }
          >
            {currentUserName}
          </span>
          <span
            className={
              compact
                ? 'text-neutral block text-[11px]'
                : 'text-neutral block text-xs'
            }
          >
            {profileLabel}
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0 text-neutral"
        >
          <path d="m6 8 4 4 4-4" />
        </svg>
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Menu do usuário"
          className="bg-surface absolute right-0 top-full z-50 mt-2 w-52 rounded-ui border border-neutral-bg p-2 shadow-md"
        >
          <Link
            ref={firstMenuItemRef}
            to="/profile"
            role="menuitem"
            className="text-foreground block w-full rounded-ui px-3 py-2 text-left text-sm font-medium hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => onOpenChange(false)}
          >
            Meu perfil
          </Link>
          <div role="separator" className="my-2 border-t border-neutral-bg" />
          <button
            type="button"
            role="menuitem"
            className="text-foreground w-full rounded-ui px-3 py-2 text-left text-sm font-medium hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoggingOut}
            onClick={onLogout}
          >
            {isLoggingOut ? 'Saindo...' : 'Sair'}
          </button>
          {logoutError ? (
            <p role="alert" className="px-3 pt-2 text-sm text-error">
              {logoutError}
            </p>
          ) : null}
        </div>
      ) : null}
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
          'md:h-10',
          'md:px-[14px]',
          'md:whitespace-nowrap',
          'text-sm',
          'font-medium',
          'focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-primary',
          'focus-visible:ring-offset-2',
          isCollapsed && 'justify-center',
          isCollapsed && 'md:justify-start',
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
