import { Link, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockOrderHistory } from '../mocks/orderHistory'
import { mockOrders } from '../mocks/orders'
import type { OrderStatus } from '../types/order'

const statusDetails = {
  awaiting: { label: 'Aguardando', variant: 'warning' },
  'in-progress': { label: 'Em andamento', variant: 'info' },
  completed: { label: 'Concluída', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'neutral' },
} as const satisfies Record<OrderStatus, { label: string; variant: string }>

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const order = mockOrders.find((item) => item.id === orderId)
  const backLink = (
    <Link
      to="/orders"
      className="text-primary inline-flex rounded-ui hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      Voltar para Ordens
    </Link>
  )

  if (!order) {
    return (
      <AppLayout>
        {backLink}
        <div className="mt-6">
          <EmptyState
            title="Ordem não encontrada"
            description="Não foi possível localizar a ordem solicitada."
          />
        </div>
      </AppLayout>
    )
  }

  const statusDetail = statusDetails[order.status]
  const orderHistory = mockOrderHistory
    .filter((snapshot) => snapshot.orderId === order.id)
    .sort(
      (firstSnapshot, secondSnapshot) =>
        new Date(secondSnapshot.changedAt).getTime() -
        new Date(firstSnapshot.changedAt).getTime(),
    )

  return (
    <AppLayout>
      {backLink}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-foreground text-2xl font-bold">{order.number}</h1>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/orders/${order.id}/edit`}
            className="bg-primary rounded-ui px-4 py-2 text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Editar
          </Link>
        </div>
      </div>

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

      <section aria-labelledby="order-history-title" className="mt-8">
        <h2
          id="order-history-title"
          className="text-foreground text-xl font-bold"
        >
          Histórico
        </h2>

        {orderHistory.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nenhum histórico disponível"
              description="Esta ordem ainda não possui snapshots registrados."
            />
          </div>
        ) : (
          <ol className="mt-4 space-y-4">
            {orderHistory.map((snapshot) => {
              const snapshotStatusDetail = statusDetails[snapshot.status]

              return (
                <li
                  key={snapshot.id}
                  className="bg-surface rounded-ui border border-neutral-bg p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <time
                      dateTime={snapshot.changedAt}
                      className="text-neutral text-sm"
                    >
                      {dateTimeFormatter.format(new Date(snapshot.changedAt))}
                    </time>
                    <StatusBadge variant={snapshotStatusDetail.variant}>
                      {snapshotStatusDetail.label}
                    </StatusBadge>
                  </div>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-neutral text-sm">Alterado por</dt>
                      <dd className="text-foreground mt-1 font-medium">
                        {snapshot.authorName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral text-sm">
                        Responsável naquele momento
                      </dt>
                      <dd className="text-foreground mt-1 font-medium">
                        {snapshot.responsibleName}
                      </dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </AppLayout>
  )
}

export { OrderDetailsPage }
