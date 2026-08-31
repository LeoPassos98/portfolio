import type { Order, OrderStatus } from '../../orders/types/order'
import type { Employee } from '../types/employee'

type EmployeeStatusChangeAvailability = {
  canChangeStatus: boolean
  description: string | null
}

const activeOrderStatuses: readonly OrderStatus[] = [
  'awaiting',
  'in-progress',
]

function getEmployeeStatusChangeAvailability(
  employee: Pick<Employee, 'id' | 'status'>,
  orders: readonly Order[],
): EmployeeStatusChangeAvailability {
  if (employee.status === 'inactive') {
    return {
      canChangeStatus: true,
      description:
        'Reativar o cadastro não altera a situação da conta de acesso.',
    }
  }

  const hasActiveOrder = orders.some(
    (order) =>
      order.responsibleEmployeeId === employee.id &&
      activeOrderStatuses.includes(order.status),
  )

  if (hasActiveOrder) {
    return {
      canChangeStatus: false,
      description:
        'Não é possível inativar este funcionário porque possui uma OS aguardando ou em andamento sob sua responsabilidade.',
    }
  }

  return {
    canChangeStatus: true,
    description: null,
  }
}

export { getEmployeeStatusChangeAvailability }
