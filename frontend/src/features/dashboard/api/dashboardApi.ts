import { apiClient } from '../../../shared/lib/http/apiClient'

type DashboardPeriodRange = {
  from?: string
  before?: string
}

type DashboardOrdersSituation = {
  awaiting: number
  inProgress: number
  total: number
}

type AdministratorDashboardSituation = {
  scope: 'administrator'
  clients: { active: number; total: number }
  employees: { active: number; total: number }
  orders: DashboardOrdersSituation
}

type EmployeeDashboardSituation = {
  scope: 'employee'
  employeeId: string
  orders: DashboardOrdersSituation
}

type AdministratorDashboardPerformance = {
  scope: 'administrator'
  performance: {
    completedOrdersValue: string
    completedOrders: number
    cancelledOrders: number
    newClients: number
    newEmployees: number
    averageCompletedOrderValue: string
  }
}

type EmployeeDashboardPerformance = {
  scope: 'employee'
  employeeId: string
  performance: {
    completedOrdersValue: string
    completedOrders: number
    cancelledOrders: number
    averageCompletedOrderValue: string
    recurringDistinctClients: number
    distinctClientsServed: number
  }
}

type DashboardSituation =
  | AdministratorDashboardSituation
  | EmployeeDashboardSituation
type DashboardPerformance =
  | AdministratorDashboardPerformance
  | EmployeeDashboardPerformance

function unexpectedDashboardScope(): never {
  throw new Error('A API retornou um escopo de Dashboard inesperado.')
}

async function getAdministratorDashboardSituation(): Promise<AdministratorDashboardSituation> {
  const { data } = await apiClient.get<DashboardSituation>('/dashboard/situation')

  if (data.scope !== 'administrator') unexpectedDashboardScope()

  return data
}

async function getEmployeeDashboardSituation(employeeId: string): Promise<EmployeeDashboardSituation> {
  const { data } = await apiClient.get<DashboardSituation>('/dashboard/situation', {
    params: { employeeId },
  })

  if (data.scope !== 'employee' || data.employeeId !== employeeId) unexpectedDashboardScope()

  return data
}

async function getAdministratorDashboardPerformance(
  range: DashboardPeriodRange,
): Promise<AdministratorDashboardPerformance> {
  const { data } = await apiClient.get<DashboardPerformance>('/dashboard/performance', {
    params: range,
  })

  if (data.scope !== 'administrator') unexpectedDashboardScope()

  return data
}

async function getEmployeeDashboardPerformance(
  employeeId: string,
  range: DashboardPeriodRange,
): Promise<EmployeeDashboardPerformance> {
  const { data } = await apiClient.get<DashboardPerformance>('/dashboard/performance', {
    params: { employeeId, ...range },
  })

  if (data.scope !== 'employee' || data.employeeId !== employeeId) unexpectedDashboardScope()

  return data
}

export {
  getAdministratorDashboardPerformance,
  getAdministratorDashboardSituation,
  getEmployeeDashboardPerformance,
  getEmployeeDashboardSituation,
}
export type {
  AdministratorDashboardPerformance,
  AdministratorDashboardSituation,
  DashboardPeriodRange,
  EmployeeDashboardPerformance,
  EmployeeDashboardSituation,
}
