import { useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockOrders } from '../mocks/orders'
import type { OrderStatus } from '../types/order'

const statusDetails = {
  awaiting: { label: 'Aguardando', variant: 'warning' },
  'in-progress': { label: 'Em andamento', variant: 'info' },
  completed: { label: 'Concluída', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'neutral' },
} as const satisfies Record<OrderStatus, { label: string; variant: string }>

function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const order = mockOrders.find((item) => item.id === orderId)

  if (!order) {
    return (
      <AppLayout>
        <EmptyState
          title="Ordem não encontrada"
          description="Não foi possível localizar a ordem solicitada."
        />
      </AppLayout>
    )
  }

  const statusDetail = statusDetails[order.status]

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">{order.number}</h1>

      <dl className="bg-surface mt-6 grid gap-6 rounded-ui border border-neutral-bg p-6 sm:grid-cols-2">
        <div>
          <dt className="text-neutral text-sm">Cliente</dt>
          <dd className="text-foreground mt-1 font-medium">
            {order.clientName}
          </dd>
        </div>
        <div>
          <dt className="text-neutral text-sm">Responsável</dt>
          <dd className="text-foreground mt-1 font-medium">
            {order.responsibleName}
          </dd>
        </div>
        <div>
          <dt className="text-neutral text-sm">Status</dt>
          <dd className="mt-2">
            <StatusBadge variant={statusDetail.variant}>
              {statusDetail.label}
            </StatusBadge>
          </dd>
        </div>
      </dl>
    </AppLayout>
  )
}

export { OrderDetailsPage }
