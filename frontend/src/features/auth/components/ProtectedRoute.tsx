import { Navigate, Outlet, useLocation } from 'react-router'
import type { SessionProfile } from '../mocks/authenticatedSession'
import { useAuthSession } from '../hooks/useAuthSession'

type ProtectedRouteProps = {
  requiredProfile?: SessionProfile
}

function ProtectedRoute({ requiredProfile }: ProtectedRouteProps) {
  const session = useAuthSession()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace />
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
