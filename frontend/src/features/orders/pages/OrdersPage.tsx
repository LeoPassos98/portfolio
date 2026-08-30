import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { getVisibleOrders } from '../lib/orderVisibility'
import { mockOrders } from '../mocks/orders'
import type { OrderStatus } from '../types/order'

const orderStatuses: readonly OrderStatus[] = [
  'awaiting',
  'in-progress',
  'completed',
  'cancelled',
]

const orderListStatuses = ['open', ...orderStatuses] as const

type OrderListStatus = (typeof orderListStatuses)[number]

const statusDetails = {
  awaiting: { label: 'Aguardando', variant: 'warning' },
  'in-progress': { label: 'Em andamento', variant: 'info' },
  completed: { label: 'Concluída', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'neutral' },
} as const satisfies Record<OrderStatus, { label: string; variant: string }>

const ordersPerPage = 2

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const orderDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
})

function isOrderStatus(value: string | null): value is OrderStatus {
  return value !== null && orderStatuses.some((status) => status === value)
}

function isOrderListStatus(value: string | null): value is OrderListStatus {
  return (
    value !== null && orderListStatuses.some((status) => status === value)
  )
}

function OrdersPage() {
  const session = useAuthSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = isOrderListStatus(statusParam) ? statusParam : 'all'
  const search = searchParams.get('search') ?? ''
  const visibleOrders = session
    ? getVisibleOrders(mockOrders, session.currentUser)
    : []
  const ordersFilteredByStatus = isOrderStatus(statusParam)
    ? visibleOrders.filter((order) => order.status === statusParam)
    : statusParam === 'open'
      ? visibleOrders.filter(
          (order) =>
            order.status === 'awaiting' || order.status === 'in-progress',
        )
    : visibleOrders
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filteredOrders = normalizedSearch
    ? ordersFilteredByStatus.filter((order) =>
        [order.number, order.clientName].some(
          (value) =>
            value.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
        ),
      )
    : ordersFilteredByStatus
  const hasOrders = filteredOrders.length > 0
  const hasActiveFilters = isOrderListStatus(statusParam) || search.trim() !== ''
  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ordersPerPage),
  )
  const requestedPage = Number(searchParams.get('page') ?? '1')
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, totalPages)
      : 1
  const pageStart = (currentPage - 1) * ordersPerPage
  const currentOrders = filteredOrders.slice(
    pageStart,
    pageStart + ordersPerPage,
  )

  function changePage(nextPage: number) {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (nextPage === 1) {
      nextSearchParams.delete('page')
    } else {
      nextSearchParams.set('page', String(nextPage))
    }

    setSearchParams(nextSearchParams)
  }

  function clearFilters() {
    setSearchParams({})
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-foreground text-2xl font-bold">
          Ordens de Serviço
        </h1>
        <Link
          to="/orders/new"
          className="bg-primary inline-flex rounded-ui px-4 py-2 text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Nova ordem de serviço
        </Link>
      </div>

      <div className="mt-6 max-w-xs space-y-2">
        <Label htmlFor="order-status">Status</Label>
        <Select
          id="order-status"
          value={status}
          onChange={(event) => {
            const nextSearchParams = new URLSearchParams(searchParams)

            if (event.target.value === 'all') {
              nextSearchParams.delete('status')
            } else {
              nextSearchParams.set('status', event.target.value)
            }

            nextSearchParams.delete('page')
            setSearchParams(nextSearchParams)
          }}
        >
          <option value="all">Todos</option>
          <option value="open">Em aberto</option>
          <option value="awaiting">Aguardando</option>
          <option value="in-progress">Em andamento</option>
          <option value="completed">Concluídas</option>
          <option value="cancelled">Canceladas</option>
        </Select>
      </div>

      <div className="mt-4 max-w-md space-y-2">
        <Label htmlFor="order-search">Buscar</Label>
        <Input
          id="order-search"
          type="search"
          value={search}
          placeholder="Buscar por número ou cliente"
          onChange={(event) => {
            const nextSearchParams = new URLSearchParams(searchParams)

            if (event.target.value.trim() === '') {
              nextSearchParams.delete('search')
            } else {
              nextSearchParams.set('search', event.target.value)
            }

            nextSearchParams.delete('page')
            setSearchParams(nextSearchParams)
          }}
        />
      </div>

      {!hasOrders && (
        <div className="mt-8 space-y-4">
          <EmptyState
            title="Nenhuma ordem encontrada"
            description="Tente ajustar a busca ou os filtros."
          />
          {hasActiveFilters ? (
            <div className="flex justify-center">
              <Button type="button" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {hasOrders && (
        <ul className="mt-8 space-y-4 md:hidden">
          {currentOrders.map((order) => {
            const statusDetail = statusDetails[order.status]

            return (
              <li
                key={order.id}
                className="bg-surface rounded-ui border border-neutral-bg p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <Link
                    to={`/orders/${order.id}`}
                    className="text-primary font-medium hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {order.number}
                  </Link>
                  <StatusBadge variant={statusDetail.variant}>
                    {statusDetail.label}
                  </StatusBadge>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-neutral text-xs">Cliente</dt>
                    <dd className="text-foreground mt-1">
                      {order.clientName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral text-xs">Responsável</dt>
                    <dd className="text-foreground mt-1">
                      {order.responsibleName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral text-xs">Data</dt>
                    <dd className="text-foreground mt-1">
                      <time dateTime={order.createdAt}>
                        {orderDateFormatter.format(new Date(order.createdAt))}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral text-xs">Valor</dt>
                    <dd className="text-foreground mt-1 font-medium">
                      {currencyFormatter.format(order.value)}
                    </dd>
                  </div>
                </dl>
              </li>
            )
          })}
        </ul>
      )}

      {hasOrders && (
        <div className="mt-8 hidden overflow-hidden rounded-ui border border-neutral-bg md:block">
          <table className="w-full text-left">
            <caption className="sr-only">Lista de ordens de serviço</caption>
            <thead className="bg-neutral-bg text-neutral text-sm">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
                  Ordem
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Cliente
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Status
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Responsável
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Data
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-neutral-bg">
              {currentOrders.map((order) => {
                const statusDetail = statusDetails[order.status]

                return (
                  <tr key={order.id}>
                    <td className="text-foreground px-4 py-3 font-medium">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        {order.number}
                      </Link>
                    </td>
                    <td className="text-neutral px-4 py-3">
                      {order.clientName}
                    </td>
                    <td className="text-neutral px-4 py-3">
                      <StatusBadge variant={statusDetail.variant}>
                        {statusDetail.label}
                      </StatusBadge>
                    </td>
                    <td className="text-neutral px-4 py-3">
                      {order.responsibleName}
                    </td>
                    <td className="text-neutral whitespace-nowrap px-4 py-3">
                      <time dateTime={order.createdAt}>
                        {orderDateFormatter.format(new Date(order.createdAt))}
                      </time>
                    </td>
                    <td className="text-foreground whitespace-nowrap px-4 py-3 font-medium">
                      {currencyFormatter.format(order.value)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasOrders && (
        <nav
          aria-label="Paginação de ordens"
          className="mt-6 flex items-center justify-between gap-4"
        >
          <Button
            type="button"
            disabled={currentPage === 1}
            onClick={() => changePage(currentPage - 1)}
          >
            Anterior
          </Button>
          <p className="text-neutral text-sm">
            Página {currentPage} de {totalPages}
          </p>
          <Button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => changePage(currentPage + 1)}
          >
            Próxima
          </Button>
        </nav>
      )}
    </AppLayout>
  )
}

export { OrdersPage }
