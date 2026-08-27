import type { ReactNode } from 'react'
import { activeMockAuthenticatedSession } from '../mocks/authenticatedSession'
import { AuthSessionContext } from './AuthSessionContext'

type AuthSessionProviderProps = {
  children: ReactNode
}

function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  return (
    <AuthSessionContext.Provider value={activeMockAuthenticatedSession}>
      {children}
    </AuthSessionContext.Provider>
  )
}

export { AuthSessionProvider }
