type SessionProfile = 'admin' | 'employee'

type MockSessionUser = {
  id: string
  name: string
  loginEmail: string
  profile: SessionProfile
  employeeId: string
}

type MockAuthenticatedSession = {
  currentUser: MockSessionUser
}

const mockAdministratorSession: MockAuthenticatedSession = {
  currentUser: {
    id: 'user-ana-souza',
    name: 'Ana Souza',
    loginEmail: 'ana.souza@login.example.com',
    profile: 'admin',
    employeeId: 'employee-2',
  },
}

const mockEmployeeSession: MockAuthenticatedSession = {
  currentUser: {
    id: 'user-carlos-lima',
    name: 'Carlos Lima',
    loginEmail: 'carlos.lima@login.example.com',
    profile: 'employee',
    employeeId: 'employee-1',
  },
}

// Para testar o outro perfil no desenvolvimento, altere somente esta referência.
const activeMockAuthenticatedSession = mockAdministratorSession

export {
  activeMockAuthenticatedSession,
  mockAdministratorSession,
  mockEmployeeSession,
}
export type { MockAuthenticatedSession, MockSessionUser, SessionProfile }
