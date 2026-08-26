import type { DashboardPeriod } from './adminDashboard'

type EmployeeDashboardPerformance = {
  creditedCompletedOrdersValue: number
  completedOrders: number
  cancelledOrders: number
  recurringDistinctClients: number
  distinctClientsServed: number
}

// O valor concluído é creditado ao responsável pela OS no momento da conclusão.
// Cliente recorrente já possuía uma OS concluída antes da OS considerada.
// Cada entrada contém somente OS atribuídas ao funcionário identificado pela chave.
const employeeDashboardByEmployeeId: Record<
  string,
  {
    situation: {
      orders: {
        awaiting: number
        inProgress: number
        total: number
      }
    }
    performance: Record<DashboardPeriod, EmployeeDashboardPerformance>
  }
> = {
  'employee-1': {
    situation: {
      orders: {
        awaiting: 5,
        inProgress: 3,
        total: 12,
      },
    },
    performance: {
      'current-month': {
        creditedCompletedOrdersValue: 12_600,
        completedOrders: 9,
        cancelledOrders: 1,
        recurringDistinctClients: 4,
        distinctClientsServed: 7,
      },
      'previous-month': {
        creditedCompletedOrdersValue: 9_100,
        completedOrders: 7,
        cancelledOrders: 2,
        recurringDistinctClients: 3,
        distinctClientsServed: 6,
      },
      'current-year': {
        creditedCompletedOrdersValue: 75_600,
        completedOrders: 54,
        cancelledOrders: 6,
        recurringDistinctClients: 18,
        distinctClientsServed: 31,
      },
    },
  },
}

export { employeeDashboardByEmployeeId }
