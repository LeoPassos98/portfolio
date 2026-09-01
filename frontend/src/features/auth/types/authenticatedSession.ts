import type { AuthSession } from '../api/authApi'

type SessionProfile = 'admin' | 'employee'

type AuthenticatedUser = {
  id: string
  name: string
  profile: SessionProfile
  employeeId: string
}

type AuthenticatedSession = {
  currentUser: AuthenticatedUser
  mustChangePassword: boolean
}

function toAuthenticatedSession(session: AuthSession): AuthenticatedSession {
  return {
    currentUser: {
      id: session.id,
      name: session.funcionarioNome ?? '',
      profile: session.perfil === 'ADMINISTRADOR' ? 'admin' : 'employee',
      employeeId: session.funcionarioId,
    },
    mustChangePassword: session.deveAlterarSenha,
  }
}

export { toAuthenticatedSession }
export type { AuthenticatedSession, AuthenticatedUser, SessionProfile }
