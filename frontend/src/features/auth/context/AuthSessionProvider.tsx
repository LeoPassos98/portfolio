import { isAxiosError } from 'axios'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  changeFirstAccessPassword as changeFirstAccessPasswordRequest,
  getSession,
  login as loginRequest,
  logout as logoutRequest,
  type FirstAccessPasswordInput,
  type LoginInput,
} from '../api/authApi'
import { setUnauthenticatedHandler } from '../../../shared/lib/http/apiClient'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import {
  toAuthenticatedSession,
  type AuthenticatedSession,
} from '../types/authenticatedSession'
import { AuthSessionContext } from './AuthSessionContext'

type AuthSessionProviderProps = {
  children: ReactNode
}

const knownSessionStorageKey = 'auth-session-known'

function markSessionAsKnown(): void {
  sessionStorage.setItem(knownSessionStorageKey, 'true')
}

function hasKnownSession(): boolean {
  return sessionStorage.getItem(knownSessionStorageKey) === 'true'
}

function clearKnownSession(): void {
  sessionStorage.removeItem(knownSessionStorageKey)
}

function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  const [session, setSession] = useState<AuthenticatedSession | null>(null)
  const [isInitialSessionLoading, setIsInitialSessionLoading] = useState(true)
  const [initialSessionError, setInitialSessionError] = useState(false)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(false)
  const sessionCheckIdRef = useRef(0)

  const retrySessionCheck = useCallback(async (signal?: AbortSignal) => {
    const sessionCheckId = ++sessionCheckIdRef.current

    setIsInitialSessionLoading(true)
    setInitialSessionError(false)

    try {
      const response = await getSession({
        signal,
        suppressUnauthenticatedSessionHandling: true,
      })

      if (sessionCheckId !== sessionCheckIdRef.current) {
        return
      }

      setSession(toAuthenticatedSession(response))
      markSessionAsKnown()
      setSessionExpiredMessage(false)
    } catch (error) {
      if (sessionCheckId !== sessionCheckIdRef.current || isAxiosError(error) && error.code === 'ERR_CANCELED') {
        return
      }

      if (
        isAxiosError<HttpErrorResponse>(error) &&
        error.response?.status === 401 &&
        error.response.data.code === 'AUTH_UNAUTHENTICATED'
      ) {
        const hadKnownSession = hasKnownSession()

        setSession(null)
        clearKnownSession()
        setSessionExpiredMessage(hadKnownSession)
        return
      }

      setInitialSessionError(true)
    } finally {
      if (sessionCheckId === sessionCheckIdRef.current) {
        setIsInitialSessionLoading(false)
      }
    }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const response = await loginRequest(input)
    const nextSession = toAuthenticatedSession(response)

    setSession(nextSession)
    markSessionAsKnown()
    setSessionExpiredMessage(false)

    return nextSession
  }, [])

  const changeFirstAccessPassword = useCallback(
    async (input: FirstAccessPasswordInput) => {
      const response = await changeFirstAccessPasswordRequest(input)
      const nextSession = toAuthenticatedSession(response)

      setSession(nextSession)

      return nextSession
    },
    [],
  )

  const clearSession = useCallback(() => {
    setSession(null)
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setSession(null)
    clearKnownSession()
    setSessionExpiredMessage(false)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void Promise.resolve().then(() => retrySessionCheck(controller.signal))

    return () => {
      controller.abort()
      sessionCheckIdRef.current += 1
    }
  }, [retrySessionCheck])

  useEffect(
    () =>
      setUnauthenticatedHandler(() => {
        setSession(null)
        clearKnownSession()
        setInitialSessionError(false)
        setIsInitialSessionLoading(false)
        setSessionExpiredMessage(true)
      }),
    [],
  )

  return (
    <AuthSessionContext.Provider
      value={{
        changeFirstAccessPassword,
        clearSession,
        initialSessionError,
        isInitialSessionLoading,
        login,
        logout,
        retrySessionCheck: () => retrySessionCheck(),
        session,
        sessionExpiredMessage,
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  )
}

export { AuthSessionProvider }
