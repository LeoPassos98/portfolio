import { createContext } from 'react'
import type {
  FirstAccessPasswordInput,
  LoginInput,
} from '../api/authApi'
import type { AuthenticatedSession } from '../types/authenticatedSession'

type AuthSessionContextValue = {
  changeFirstAccessPassword: (
    input: FirstAccessPasswordInput,
  ) => Promise<AuthenticatedSession>
  clearSession: () => void
  initialSessionError: boolean
  isInitialSessionLoading: boolean
  login: (input: LoginInput) => Promise<AuthenticatedSession>
  logout: () => Promise<void>
  retrySessionCheck: () => Promise<void>
  session: AuthenticatedSession | null
  sessionExpiredMessage: boolean
}

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(
  undefined,
)

export { AuthSessionContext }
export type { AuthSessionContextValue }
