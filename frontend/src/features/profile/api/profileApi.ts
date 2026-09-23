import {
  apiClient,
  invalidateCsrfToken,
  type HttpErrorResponse,
} from '../../../shared/lib/http/apiClient'
import type { ProfilePasswordUpdateFormData } from '../schemas/profileSchema'
import type { Profile } from '../types/profile'

type ProfileHttpErrorCode = 'PROFILE_CURRENT_PASSWORD_INCORRECT'

type ProfileHttpErrorResponse = HttpErrorResponse & {
  code: ProfileHttpErrorCode
}

type ProfileResponse = {
  nome: string
  telefone: string
  email: string
  perfil: 'ADMINISTRADOR' | 'FUNCIONARIO'
  funcionarioAtivo: boolean
  contaAtiva: boolean
}

type ProfileUpdateRequest = {
  nome: string
  telefone: string
}

type ProfilePasswordUpdateRequest = {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}

function toProfile(response: ProfileResponse): Profile {
  return {
    name: response.nome,
    phone: response.telefone,
    contactEmail: response.email,
    accountProfile:
      response.perfil === 'ADMINISTRADOR' ? 'administrator' : 'employee',
    employeeStatus: response.funcionarioAtivo ? 'active' : 'inactive',
    accountStatus: response.contaAtiva ? 'active' : 'inactive',
  }
}

async function getProfile(): Promise<Profile> {
  const { data } = await apiClient.get<ProfileResponse>('/profile')

  return toProfile(data)
}

async function updateProfile(
  values: ProfileUpdateRequest,
): Promise<Profile> {
  const { data } = await apiClient.put<ProfileResponse>('/profile', values)

  return toProfile(data)
}

async function changeProfilePassword(
  values: ProfilePasswordUpdateFormData,
): Promise<void> {
  const body: ProfilePasswordUpdateRequest = {
    currentPassword: values.currentPassword,
    newPassword: values.newPassword,
    newPasswordConfirmation: values.newPasswordConfirmation,
  }

  await apiClient.put('/profile/password', body)
  invalidateCsrfToken()
}

export { changeProfilePassword, getProfile, updateProfile }
export type { ProfileHttpErrorResponse }
