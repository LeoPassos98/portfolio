import { Link, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { OrderForm } from '../components/OrderForm'
import { mockOrders } from '../mocks/orders'

function OrderEditPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const order = mockOrders.find((item) => item.id === orderId)

  if (!order) {
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
            title="Ordem não encontrada"
            description="Não foi possível localizar a ordem solicitada."
          />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Editar {order.number}
      </h1>
      <OrderForm order={order} />
    </AppLayout>
  )
}

export { OrderEditPage }
