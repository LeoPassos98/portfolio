type DashboardPeriod = 'current-month' | 'previous-month' | 'current-year'

type AdminDashboardPerformance = {
  completedOrdersValue: number
  completedOrders: number
  cancelledOrders: number
  newClients: number
  newEmployees: number
}

const adminDashboardSituation = {
  clients: {
    active: 128,
    total: 142,
  },
  employees: {
    active: 16,
    total: 18,
  },
  orders: {
    awaiting: 12,
    inProgress: 8,
    total: 57,
  },
} as const

const dashboardPeriodOptions: Array<{
  value: DashboardPeriod
  label: string
}> = [
  { value: 'current-month', label: 'Este mês' },
  { value: 'previous-month', label: 'Mês anterior' },
  { value: 'current-year', label: 'Este ano' },
]

const adminDashboardPerformance: Record<
  DashboardPeriod,
  AdminDashboardPerformance
> = {
  'current-month': {
    completedOrdersValue: 48_750,
    completedOrders: 34,
    cancelledOrders: 3,
    newClients: 8,
    newEmployees: 2,
  },
  'previous-month': {
    completedOrdersValue: 41_300,
    completedOrders: 29,
    cancelledOrders: 5,
    newClients: 6,
    newEmployees: 1,
  },
  'current-year': {
    completedOrdersValue: 312_480,
    completedOrders: 218,
    cancelledOrders: 22,
    newClients: 37,
    newEmployees: 5,
  },
}

export {
  adminDashboardPerformance,
  adminDashboardSituation,
  dashboardPeriodOptions,
}
export type { DashboardPeriod }
