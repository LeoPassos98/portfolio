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
  wouldRemoveLastActiveAdmin: boolean,
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

  const blockingDescriptions = [
    hasActiveOrder
      ? 'Não é possível inativar este funcionário porque possui uma OS aguardando ou em andamento sob sua responsabilidade.'
      : null,
    wouldRemoveLastActiveAdmin
      ? 'Não é possível inativar este funcionário porque sua conta é a última conta ativa de Administrador.'
      : null,
  ].filter(Boolean)

  if (blockingDescriptions.length > 0) {
    return {
      canChangeStatus: false,
      description: blockingDescriptions.join(' '),
    }
  }

  return {
    canChangeStatus: true,
    description: null,
  }
}

export { getEmployeeStatusChangeAvailability }
