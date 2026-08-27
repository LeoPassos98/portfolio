import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockOrderHistory } from '../mocks/orderHistory'
import { mockOrders } from '../mocks/orders'
import type { OrderStatus, OrderVisibility } from '../types/order'

const statusDetails = {
  awaiting: { label: 'Aguardando', variant: 'warning' },
  'in-progress': { label: 'Em andamento', variant: 'info' },
  completed: { label: 'Concluída', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'neutral' },
} as const satisfies Record<OrderStatus, { label: string; variant: string }>

const visibilityDetails = {
  public: { label: 'Pública', variant: 'info' },
  private: { label: 'Privada', variant: 'neutral' },
} as const satisfies Record<
  OrderVisibility,
  { label: string; variant: string }
>

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    null,
  )
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

  const orderHistory = mockOrderHistory
    .filter((snapshot) => snapshot.orderId === order.id)
    .sort(
      (firstSnapshot, secondSnapshot) =>
        new Date(secondSnapshot.changedAt).getTime() -
        new Date(firstSnapshot.changedAt).getTime(),
    )
  const selectedSnapshot = selectedSnapshotId
    ? orderHistory.find((snapshot) => snapshot.id === selectedSnapshotId)
    : undefined
  const displayedOrder = selectedSnapshot
    ? {
        ...order,
        description: selectedSnapshot.description,
        value: selectedSnapshot.value,
        notes: selectedSnapshot.notes,
        responsibleName: selectedSnapshot.responsibleName,
        status: selectedSnapshot.status,
        visibility: selectedSnapshot.visibility,
      }
    : order
  const statusDetail = statusDetails[displayedOrder.status]
  const visibilityDetail = visibilityDetails[displayedOrder.visibility]
  const updateDate = selectedSnapshot?.changedAt ?? order.updatedAt
  const updateLabel = selectedSnapshot
    ? 'Versão preservada em'
    : 'Última atualização'

  return (
    <AppLayout>
      {backLink}

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-foreground text-2xl font-bold">
              {order.number}
            </h1>
            <StatusBadge variant={statusDetail.variant}>
              {statusDetail.label}
            </StatusBadge>
            <StatusBadge variant={visibilityDetail.variant}>
              {visibilityDetail.label}
            </StatusBadge>
          </div>
          <p className="text-neutral mt-1">{order.clientName}</p>
        </div>
        {selectedSnapshot ? null : (
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/orders/${order.id}/edit`}
              className="bg-primary rounded-ui px-4 py-2 text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Editar
            </Link>
          </div>
        )}
      </header>

      {selectedSnapshot ? (
        <section
          aria-labelledby="historical-version-title"
          className="bg-info-bg mt-6 flex flex-col gap-4 rounded-ui border border-info p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2
              id="historical-version-title"
              className="text-info font-bold"
            >
              Versão {selectedSnapshot.version} — somente leitura
            </h2>
            <p className="text-info mt-1 text-sm">
              Preservada em{' '}
              <time dateTime={selectedSnapshot.changedAt}>
                {dateTimeFormatter.format(new Date(selectedSnapshot.changedAt))}
              </time>{' '}
              por {selectedSnapshot.authorName}.
            </p>
          </div>
          <Button type="button" onClick={() => setSelectedSnapshotId(null)}>
            Voltar para versão atual
          </Button>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <aside
          aria-labelledby="order-summary-title"
          className="bg-surface rounded-ui border border-neutral-bg p-4 sm:p-6 lg:order-last"
        >
          <h2
            id="order-summary-title"
            className="text-foreground text-lg font-bold"
          >
            Resumo operacional
          </h2>

          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-neutral text-sm">Valor</dt>
              <dd className="text-foreground mt-1 text-xl font-bold">
                {currencyFormatter.format(displayedOrder.value)}
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Responsável</dt>
              <dd className="text-foreground mt-1 font-medium">
                {displayedOrder.responsibleName}
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
            <div>
              <dt className="text-neutral text-sm">Visibilidade</dt>
              <dd className="mt-2">
                <StatusBadge variant={visibilityDetail.variant}>
                  {visibilityDetail.label}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Criada em</dt>
              <dd className="text-foreground mt-1 font-medium">
                <time dateTime={order.createdAt}>
                  {dateTimeFormatter.format(new Date(order.createdAt))}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">{updateLabel}</dt>
              <dd className="text-foreground mt-1 font-medium">
                <time dateTime={updateDate}>
                  {dateTimeFormatter.format(new Date(updateDate))}
                </time>
              </dd>
            </div>
          </dl>
        </aside>

        <div className="bg-surface rounded-ui border border-neutral-bg p-4 sm:p-6">
          <section aria-labelledby="order-service-title">
            <h2
              id="order-service-title"
              className="text-foreground text-lg font-bold"
            >
              Serviço
            </h2>
            <p className="text-foreground mt-4 whitespace-pre-wrap">
              {displayedOrder.description}
            </p>

            <div className="mt-6">
              <h3 className="text-foreground text-sm font-medium">
                Observações
              </h3>
              <p className="text-neutral mt-2 whitespace-pre-wrap">
                {displayedOrder.notes ?? 'Nenhuma observação informada.'}
              </p>
            </div>
          </section>

          <section
            aria-labelledby="order-client-title"
            className="mt-8 border-t border-neutral-bg pt-6"
          >
            <h2
              id="order-client-title"
              className="text-foreground text-lg font-bold"
            >
              Cliente
            </h2>
            <dl className="mt-4">
              <div>
                <dt className="text-neutral text-sm">Cliente vinculado</dt>
                <dd className="text-foreground mt-1 font-medium">
                  {order.clientName}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

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
              const isSelected = snapshot.id === selectedSnapshot?.id

              return (
                <li key={snapshot.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedSnapshotId(snapshot.id)}
                    className={
                      isSelected
                        ? 'bg-neutral-bg w-full rounded-ui border border-primary p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                        : 'bg-surface w-full rounded-ui border border-neutral-bg p-4 text-left hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-foreground font-medium">
                        Versão {snapshot.version}
                      </span>
                      <StatusBadge variant={snapshotStatusDetail.variant}>
                        {snapshotStatusDetail.label}
                      </StatusBadge>
                    </div>

                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-neutral text-sm">Preservada em</dt>
                        <dd className="text-foreground mt-1 font-medium">
                          <time dateTime={snapshot.changedAt}>
                            {dateTimeFormatter.format(
                              new Date(snapshot.changedAt),
                            )}
                          </time>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral text-sm">
                          Alterado por
                        </dt>
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
                  </button>
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
