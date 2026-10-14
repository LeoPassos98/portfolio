import type { EmployeeListParams } from './employeesApi'

const employeesQueryKeys = {
  all: ['employees'] as const,
  detail: (id: string) => ['employees', 'detail', id] as const,
  list: (params: EmployeeListParams) => ['employees', 'list', params] as const,
  lists: () => ['employees', 'list'] as const,
}

export { employeesQueryKeys }
