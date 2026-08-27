import { createContext } from 'react'
import type { MockAuthenticatedSession } from '../mocks/authenticatedSession'

const AuthSessionContext = createContext<MockAuthenticatedSession | null>(null)

export { AuthSessionContext }
