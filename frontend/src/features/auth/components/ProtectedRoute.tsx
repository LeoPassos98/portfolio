import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import type { SessionProfile } from '../types/authenticatedSession'

type ProtectedRouteProps = {
  requiredProfile?: SessionProfile
}

function ProtectedRoute({ requiredProfile }: ProtectedRouteProps) {
  const { isInitialSessionLoading, session } = useAuth()
  const location = useLocation()

  if (isInitialSessionLoading) {
    return null
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (session.mustChangePassword) {
    return <Navigate to="/first-access" replace />
  }

  if (
    requiredProfile &&
    session.currentUser.profile !== requiredProfile
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ accessDenied: true, from: location.pathname }}
      />
    )
  }

  return <Outlet />
}

export { ProtectedRoute }
