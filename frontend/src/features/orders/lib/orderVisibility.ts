import type { MockSessionUser } from '../../auth/mocks/authenticatedSession'
import type { Order } from '../types/order'

type OrderVisibilityViewer = Pick<
  MockSessionUser,
  'employeeId' | 'profile'
>

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

export { canViewOrder, getVisibleOrders }
