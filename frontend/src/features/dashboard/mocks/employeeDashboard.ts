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
      // Representa o histórico completo, sem limites inicial ou final de data.
      'all-time': {
        creditedCompletedOrdersValue: 118_300,
        completedOrders: 84,
        cancelledOrders: 11,
        recurringDistinctClients: 26,
        distinctClientsServed: 43,
      },
    },
  },
  'employee-2': {
    situation: {
      orders: {
        awaiting: 3,
        inProgress: 1,
        total: 8,
      },
    },
    performance: {
      'current-month': {
        creditedCompletedOrdersValue: 18_900,
        completedOrders: 12,
        cancelledOrders: 2,
        recurringDistinctClients: 5,
        distinctClientsServed: 9,
      },
      'previous-month': {
        creditedCompletedOrdersValue: 14_200,
        completedOrders: 9,
        cancelledOrders: 1,
        recurringDistinctClients: 4,
        distinctClientsServed: 8,
      },
      'current-year': {
        creditedCompletedOrdersValue: 98_200,
        completedOrders: 67,
        cancelledOrders: 7,
        recurringDistinctClients: 23,
        distinctClientsServed: 39,
      },
      'all-time': {
        creditedCompletedOrdersValue: 172_500,
        completedOrders: 113,
        cancelledOrders: 15,
        recurringDistinctClients: 36,
        distinctClientsServed: 59,
      },
    },
  },
  'employee-3': {
    situation: {
      orders: {
        awaiting: 2,
        inProgress: 1,
        total: 7,
      },
    },
    performance: {
      'current-month': {
        creditedCompletedOrdersValue: 7_200,
        completedOrders: 6,
        cancelledOrders: 1,
        recurringDistinctClients: 3,
        distinctClientsServed: 5,
      },
      'previous-month': {
        creditedCompletedOrdersValue: 8_400,
        completedOrders: 7,
        cancelledOrders: 0,
        recurringDistinctClients: 2,
        distinctClientsServed: 6,
      },
      'current-year': {
        creditedCompletedOrdersValue: 49_000,
        completedOrders: 38,
        cancelledOrders: 4,
        recurringDistinctClients: 15,
        distinctClientsServed: 24,
      },
      'all-time': {
        creditedCompletedOrdersValue: 74_000,
        completedOrders: 59,
        cancelledOrders: 7,
        recurringDistinctClients: 21,
        distinctClientsServed: 33,
      },
    },
  },
  'employee-4': {
    situation: {
      orders: {
        awaiting: 0,
        inProgress: 0,
        total: 23,
      },
    },
    performance: {
      'current-month': {
        creditedCompletedOrdersValue: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        recurringDistinctClients: 0,
        distinctClientsServed: 0,
      },
      'previous-month': {
        creditedCompletedOrdersValue: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        recurringDistinctClients: 0,
        distinctClientsServed: 0,
      },
      'current-year': {
        creditedCompletedOrdersValue: 8_300,
        completedOrders: 6,
        cancelledOrders: 1,
        recurringDistinctClients: 2,
        distinctClientsServed: 4,
      },
      'all-time': {
        creditedCompletedOrdersValue: 45_700,
        completedOrders: 37,
        cancelledOrders: 8,
        recurringDistinctClients: 13,
        distinctClientsServed: 21,
      },
    },
  },
  'employee-5': {
    situation: {
      orders: {
        awaiting: 1,
        inProgress: 4,
        total: 10,
      },
    },
    performance: {
      'current-month': {
        creditedCompletedOrdersValue: 10_600,
        completedOrders: 8,
        cancelledOrders: 2,
        recurringDistinctClients: 3,
        distinctClientsServed: 6,
      },
      'previous-month': {
        creditedCompletedOrdersValue: 9_400,
        completedOrders: 8,
        cancelledOrders: 1,
        recurringDistinctClients: 3,
        distinctClientsServed: 7,
      },
      'current-year': {
        creditedCompletedOrdersValue: 63_800,
        completedOrders: 47,
        cancelledOrders: 5,
        recurringDistinctClients: 16,
        distinctClientsServed: 28,
      },
      'all-time': {
        creditedCompletedOrdersValue: 87_500,
        completedOrders: 66,
        cancelledOrders: 9,
        recurringDistinctClients: 22,
        distinctClientsServed: 37,
      },
    },
  },
}

export { employeeDashboardByEmployeeId }
