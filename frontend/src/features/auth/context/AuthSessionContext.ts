import { createContext } from 'react'
import type { MockAuthenticatedSession } from '../mocks/authenticatedSession'

const AuthSessionContext = createContext<
  MockAuthenticatedSession | null | undefined
>(undefined)

export { AuthSessionContext }
