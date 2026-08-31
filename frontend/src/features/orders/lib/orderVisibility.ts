import type { MockSessionUser } from '../../auth/mocks/authenticatedSession'
import type { Order, OrderStatus } from '../types/order'

type OrderVisibilityViewer = Pick<
  MockSessionUser,
  'employeeId' | 'profile'
>

type OrderEditPermissions = {
  canEdit: boolean
  canChangeResponsible: boolean
  canChangeStatus: boolean
}

const readOnlyOrderPermissions: OrderEditPermissions = {
  canEdit: false,
  canChangeResponsible: false,
  canChangeStatus: false,
}

const allOrderStatuses: readonly OrderStatus[] = [
  'awaiting',
  'in-progress',
  'completed',
  'cancelled',
]

function canViewOrder(order: Order, viewer: OrderVisibilityViewer) {
  if (viewer.profile === 'admin') {
    return true
  }

  return (
    order.responsibleEmployeeId === viewer.employeeId ||
    order.visibility === 'public'
  )
}

function getVisibleOrders(
  orders: readonly Order[],
  viewer: OrderVisibilityViewer,
) {
  return orders.filter((order) => canViewOrder(order, viewer))
}

function getOrderEditPermissions(
  order: Order,
  viewer: OrderVisibilityViewer,
): OrderEditPermissions {
  const isOpen =
    order.status === 'awaiting' || order.status === 'in-progress'

  if (viewer.profile === 'employee') {
    if (order.responsibleEmployeeId !== viewer.employeeId || !isOpen) {
      return readOnlyOrderPermissions
    }

    return {
      canEdit: true,
      canChangeResponsible: false,
      canChangeStatus: true,
    }
  }

  if (order.status === 'cancelled') {
    return readOnlyOrderPermissions
  }

  if (order.status === 'completed') {
    return {
      canEdit: true,
      canChangeResponsible: false,
      canChangeStatus: true,
    }
  }

  return {
    canEdit: true,
    canChangeResponsible: true,
    canChangeStatus: true,
  }
}

function getAllowedOrderStatusTransitions(
  order: Order,
  viewer: OrderVisibilityViewer,
): readonly OrderStatus[] {
  const editPermissions = getOrderEditPermissions(order, viewer)

  if (!editPermissions.canChangeStatus) {
    return []
  }

  if (order.status === 'completed') {
    return ['awaiting', 'in-progress']
  }

  return allOrderStatuses
}

export {
  canViewOrder,
  getAllowedOrderStatusTransitions,
  getOrderEditPermissions,
  getVisibleOrders,
}
export type { OrderEditPermissions }
