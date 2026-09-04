import { apiClient } from '../../../shared/lib/http/apiClient'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import type {
  Employee,
  EmployeeAccessProfile,
  EmployeeAccessStatus,
  EmployeeListItem,
  EmployeeStatus,
} from '../types/employee'
import type { EmployeeFormValues } from '../schemas/employeeSchema'

type EmployeeListParams = {
  status?: EmployeeStatus | 'all'
  search?: string
}

type EmployeeHttpErrorCode = 'EMPLOYEE_NOT_FOUND'

type EmployeeHttpErrorResponse = HttpErrorResponse & {
  code: EmployeeHttpErrorCode
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

type EmployeeDetailAccessHttpResponse = EmployeeAccessHttpResponse & {
  emailLogin: string
}

type EmployeeHttpResponse = {
  id: string
  nome: string
  telefone: string
  email: string
  ativo: boolean
  criadoEm: string
  conta: EmployeeDetailAccessHttpResponse | null
}

type EmployeeCreateHttpBody = {
  nome: string
  telefone: string
  email: string
  status: 'active' | 'inactive'
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

function toEmployee(employee: EmployeeHttpResponse): Employee {
  return {
    id: employee.id,
    name: employee.nome,
    phone: employee.telefone,
    contactEmail: employee.email,
    status: toEmployeeStatus(employee.ativo),
    access: employee.conta
      ? {
          loginEmail: employee.conta.emailLogin,
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

async function getEmployee(id: string): Promise<Employee> {
  const { data } = await apiClient.get<EmployeeHttpResponse>(`/employees/${id}`)

  return toEmployee(data)
}

async function createEmployee(values: EmployeeFormValues): Promise<Employee> {
  const body: EmployeeCreateHttpBody = {
    nome: values.name,
    telefone: values.phone,
    email: values.contactEmail,
    status: values.status,
  }
  const { data } = await apiClient.post<EmployeeHttpResponse>(
    '/employees',
    body,
  )

  return toEmployee(data)
}

export {
  createEmployee,
  getEmployee,
  listEmployees,
  toEmployee,
  toEmployeeListItem,
}
export type {
  EmployeeCreateHttpBody,
  EmployeeAccessHttpResponse,
  EmployeeDetailAccessHttpResponse,
  EmployeeHttpErrorCode,
  EmployeeHttpErrorResponse,
  EmployeeHttpResponse,
  EmployeeListItemHttpResponse,
  EmployeeListParams,
}
