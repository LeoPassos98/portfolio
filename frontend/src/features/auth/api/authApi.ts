import {
  apiClient,
  invalidateCsrfToken,
} from '../../../shared/lib/http/apiClient'

type AuthProfile = 'ADMINISTRADOR' | 'FUNCIONARIO'

type AuthSession = {
  id: string
  perfil: AuthProfile
  funcionarioId: string
  funcionarioNome?: string
  deveAlterarSenha: boolean
}

type LoginInput = {
  email: string
  password: string
}

type FirstAccessPasswordInput = {
  password: string
  passwordConfirmation: string
}

async function login(input: LoginInput): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>('/auth/login', input)

  invalidateCsrfToken()

  return data
}

async function getSession(): Promise<AuthSession> {
  const { data } = await apiClient.get<AuthSession>('/auth/session')

  return data
}

async function changeFirstAccessPassword(
  input: FirstAccessPasswordInput,
): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>(
    '/auth/first-access/password',
    input,
  )

  invalidateCsrfToken()

  return data
}

async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')

  invalidateCsrfToken()
}

export {
  changeFirstAccessPassword,
  getSession,
  login,
  logout,
}
export type {
  AuthProfile,
  AuthSession,
  FirstAccessPasswordInput,
  LoginInput,
}
