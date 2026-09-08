import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { ordersQueryKeys } from '../api/orderQueryKeys'
import { listOrderResponsibles, listOrders } from '../api/ordersApi'
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

function isOrderListStatus(value: string | null): value is OrderListStatus {
  return value !== null && orderListStatuses.some((status) => status === value)
}

function parseCivilDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function toLocalDayISOString(value: string, isAfterEnd = false) {
  const date = parseCivilDate(value)

  if (!date) {
    return undefined
  }

  if (isAfterEnd) {
    date.setDate(date.getDate() + 1)
  }

  return date.toISOString()
}

function OrdersListSkeleton() {
  return (
    <>
      <ul
        className="mt-8 space-y-4 md:hidden"
        aria-label="Carregando ordens de serviço"
      >
        {[0, 1].map((item) => (
          <li
            key={item}
            className="bg-surface animate-pulse rounded-ui border border-neutral-bg p-4"
          >
            <div className="h-5 w-32 rounded bg-neutral-bg" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((detail) => (
                <div key={detail} className="h-4 w-24 rounded bg-neutral-bg" />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div
        className="mt-8 hidden overflow-hidden rounded-ui border border-neutral-bg md:block"
        aria-label="Carregando ordens de serviço"
      >
        <div className="bg-neutral-bg h-12" />
        {[0, 1].map((item) => (
          <div
            key={item}
            className="bg-surface flex animate-pulse gap-8 border-t border-neutral-bg px-4 py-4"
          >
            {[0, 1, 2, 3, 4, 5].map((column) => (
              <div key={column} className="h-4 flex-1 rounded bg-neutral-bg" />
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = isOrderListStatus(statusParam) ? statusParam : 'all'
  const search = searchParams.get('search') ?? ''
  const responsibleId = searchParams.get('responsibleId') ?? ''
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''
  const createdFrom = toLocalDayISOString(dateFrom)
  const createdBefore = toLocalDayISOString(dateTo, true)
  const isInvalidDateRange =
    dateFrom !== '' && dateTo !== '' && dateFrom > dateTo
  const listParams = {
    status,
    ...(search.trim() === '' ? {} : { search: search.trim() }),
    ...(responsibleId === '' ? {} : { responsibleId }),
    ...(createdFrom ? { createdFrom } : {}),
    ...(createdBefore ? { createdBefore } : {}),
  } as const
  const {
    data: orders = [],
    isError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ordersQueryKeys.list(listParams),
    queryFn: () => listOrders(listParams),
    enabled: !isInvalidDateRange,
  })
  const {
    data: responsibles = [],
    isError: isResponsiblesError,
    isPending: isResponsiblesPending,
    refetch: refetchResponsibles,
  } = useQuery({
    queryKey: ordersQueryKeys.responsibles(),
    queryFn: listOrderResponsibles,
  })
  const hasOrders = orders.length > 0
  const hasActiveFilters =
    status !== 'all' ||
    search.trim() !== '' ||
    responsibleId !== '' ||
    dateFrom !== '' ||
    dateTo !== ''
  const hasUnavailableResponsible =
    responsibleId !== '' &&
    !responsibles.some((responsible) => responsible.id === responsibleId)
  const totalPages = Math.max(1, Math.ceil(orders.length / ordersPerPage))
  const requestedPage = Number(searchParams.get('page') ?? '1')
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, totalPages)
      : 1
  const pageStart = (currentPage - 1) * ordersPerPage
  const currentOrders = orders.slice(pageStart, pageStart + ordersPerPage)

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

  function changeFilter(name: string, value: string) {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (value === '') {
      nextSearchParams.delete(name)
    } else {
      nextSearchParams.set(name, value)
    }

    nextSearchParams.delete('page')
    setSearchParams(nextSearchParams)
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

      <div className="mt-6 max-w-xl space-y-2">
        <Label htmlFor="order-search">Buscar</Label>
        <Input
          id="order-search"
          type="search"
          value={search}
          placeholder="Buscar por número ou cliente"
          onChange={(event) => changeFilter('search', event.target.value)}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="order-status">Status</Label>
          <Select
            id="order-status"
            value={status}
            onChange={(event) =>
              changeFilter(
                'status',
                event.target.value === 'all' ? '' : event.target.value,
              )
            }
          >
            <option value="all">Todos</option>
            <option value="open">Em aberto</option>
            <option value="awaiting">Aguardando</option>
            <option value="in-progress">Em andamento</option>
            <option value="completed">Concluídas</option>
            <option value="cancelled">Canceladas</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="order-responsible">Responsável</Label>
          <Select
            id="order-responsible"
            value={responsibleId}
            disabled={isResponsiblesPending || isResponsiblesError}
            onChange={(event) =>
              changeFilter('responsibleId', event.target.value)
            }
          >
            <option value="">Todos os responsáveis</option>
            {hasUnavailableResponsible ? (
              <option value={responsibleId}>Responsável indisponível</option>
            ) : null}
            {responsibles.map((responsible) => (
              <option key={responsible.id} value={responsible.id}>
                {responsible.name}
              </option>
            ))}
          </Select>
          {isResponsiblesPending ? (
            <p className="text-neutral text-sm">Carregando responsáveis...</p>
          ) : null}
          {isResponsiblesError ? (
            <div className="space-y-2">
              <p className="text-error text-sm">
                Não foi possível carregar os responsáveis.
              </p>
              <Button
                type="button"
                onClick={() => void refetchResponsibles()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="order-date-from">De</Label>
          <Input
            id="order-date-from"
            type="date"
            value={dateFrom}
            onChange={(event) => changeFilter('dateFrom', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="order-date-to">Até</Label>
          <Input
            id="order-date-to"
            type="date"
            value={dateTo}
            onChange={(event) => changeFilter('dateTo', event.target.value)}
          />
        </div>
      </div>

      {isInvalidDateRange ? (
        <p className="text-error mt-4" role="alert">
          A data inicial não pode ser posterior à data final.
        </p>
      ) : null}

      {!isInvalidDateRange && isPending && <OrdersListSkeleton />}

      {!isInvalidDateRange && isError && (
        <div className="mt-8 space-y-4">
          <EmptyState
            title="Não foi possível carregar as ordens de serviço"
            description="Verifique sua conexão e tente novamente."
          />
          <div className="flex justify-center">
            <Button type="button" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {!isInvalidDateRange && !isPending && !isError && !hasOrders && (
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

      {!isInvalidDateRange && !isPending && !isError && hasOrders && (
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
                    <dd className="text-foreground mt-1">{order.clientName}</dd>
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
                      {currencyFormatter.format(Number(order.value))}
                    </dd>
                  </div>
                </dl>
              </li>
            )
          })}
        </ul>
      )}

      {!isInvalidDateRange && !isPending && !isError && hasOrders && (
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
                      {currencyFormatter.format(Number(order.value))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isInvalidDateRange && !isPending && !isError && hasOrders && (
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
