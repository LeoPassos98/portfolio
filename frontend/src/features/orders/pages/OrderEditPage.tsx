import { Link, Navigate, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { OrderForm } from '../components/OrderForm'
import { canViewOrder, getOrderEditPermissions } from '../lib/orderVisibility'
import { mockOrders } from '../mocks/orders'

function OrderEditPage() {
  const session = useAuthSession()
  const { orderId } = useParams<{ orderId: string }>()
  const order = mockOrders.find((item) => item.id === orderId)
  const hasOrderAccess =
    order !== undefined &&
    session !== null &&
    canViewOrder(order, session.currentUser)

  if (!hasOrderAccess) {
    return (
      <AppLayout>
        <Link
          to="/orders"
          className="text-primary inline-flex rounded-ui hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Voltar para Ordens
        </Link>
        <div className="mt-6">
          <EmptyState
            title="Ordem não encontrada ou sem acesso"
            description="Não foi possível localizar a ordem solicitada ou ela não está acessível para você."
          />
        </div>
      </AppLayout>
    )
  }

  const editPermissions = getOrderEditPermissions(order, session.currentUser)

  if (!editPermissions.canEdit) {
    return <Navigate to={`/orders/${order.id}`} replace />
  }

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Editar {order.number}
      </h1>
      <OrderForm order={order} editPermissions={editPermissions} />
    </AppLayout>
  )
}

export { OrderEditPage }
