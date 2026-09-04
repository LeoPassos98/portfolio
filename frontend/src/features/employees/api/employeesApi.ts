import { apiClient } from '../../../shared/lib/http/apiClient'
import type {
  EmployeeAccessProfile,
  EmployeeAccessStatus,
  EmployeeListItem,
  EmployeeStatus,
} from '../types/employee'

type EmployeeListParams = {
  status?: EmployeeStatus | 'all'
  search?: string
}

type EmployeeAccessHttpResponse = {
  ativo: boolean
  perfil: 'ADMINISTRADOR' | 'FUNCIONARIO'
}

type EmployeeListItemHttpResponse = {
  id: string
  nome: string
  telefone: string
  email: string
  ativo: boolean
  conta: EmployeeAccessHttpResponse | null
}

function toEmployeeStatus(ativo: boolean): EmployeeStatus {
  return ativo ? 'active' : 'inactive'
}

function toEmployeeAccessStatus(ativo: boolean): EmployeeAccessStatus {
  return ativo ? 'active' : 'inactive'
}

function toEmployeeAccessProfile(
  perfil: EmployeeAccessHttpResponse['perfil'],
): EmployeeAccessProfile {
  return perfil === 'ADMINISTRADOR' ? 'administrator' : 'employee'
}

function toEmployeeListItem(
  employee: EmployeeListItemHttpResponse,
): EmployeeListItem {
  return {
    id: employee.id,
    name: employee.nome,
    phone: employee.telefone,
    contactEmail: employee.email,
    status: toEmployeeStatus(employee.ativo),
    access: employee.conta
      ? {
          status: toEmployeeAccessStatus(employee.conta.ativo),
          profile: toEmployeeAccessProfile(employee.conta.perfil),
        }
      : null,
  }
}

async function listEmployees({
  status,
  search,
}: EmployeeListParams = {}): Promise<EmployeeListItem[]> {
  const { data } = await apiClient.get<EmployeeListItemHttpResponse[]>(
    '/employees',
    { params: { status, search } },
  )

  return data.map(toEmployeeListItem)
}

export { listEmployees, toEmployeeListItem }
export type {
  EmployeeAccessHttpResponse,
  EmployeeListItemHttpResponse,
  EmployeeListParams,
}
