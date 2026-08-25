import { useSearchParams } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'

const orderStatuses = [
  'awaiting',
  'in-progress',
  'completed',
  'cancelled',
] as const

type OrderStatus = (typeof orderStatuses)[number]

type MockOrder = {
  number: string
  client: string
  responsible: string
  status: OrderStatus
}

const statusDetails = {
  awaiting: { label: 'Aguardando', variant: 'warning' },
  'in-progress': { label: 'Em andamento', variant: 'info' },
  completed: { label: 'Concluída', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'neutral' },
} as const

const mockOrders: MockOrder[] = [
  {
    number: 'OS-1001',
    client: 'Mariana Costa',
    responsible: 'Carlos Lima',
    status: 'awaiting',
  },
  {
    number: 'OS-1002',
    client: 'Empresa Horizonte',
    responsible: 'Ana Souza',
    status: 'in-progress',
  },
  {
    number: 'OS-1003',
    client: 'Rafael Martins',
    responsible: 'Carlos Lima',
    status: 'completed',
  },
  {
    number: 'OS-1004',
    client: 'Clínica Central',
    responsible: 'Beatriz Alves',
    status: 'cancelled',
  },
  {
    number: 'OS-1005',
    client: 'Oficina União',
    responsible: 'Ana Souza',
    status: 'in-progress',
  },
  {
    number: 'OS-1006',
    client: 'Paulo Mendes',
    responsible: 'Beatriz Alves',
    status: 'awaiting',
  },
]

function isOrderStatus(value: string | null): value is OrderStatus {
  return value !== null && orderStatuses.some((status) => status === value)
}

function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = statusParam ?? 'all'
  const search = searchParams.get('search') ?? ''
  const ordersFilteredByStatus = isOrderStatus(statusParam)
    ? mockOrders.filter((order) => order.status === statusParam)
    : mockOrders
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filteredOrders = normalizedSearch
    ? ordersFilteredByStatus.filter((order) =>
        [order.number, order.client, order.responsible].some((value) =>
          value.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
        ),
      )
    : ordersFilteredByStatus

  return (
    <AppLayout>
      <h1>Ordens de Serviço</h1>

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

            setSearchParams(nextSearchParams)
          }}
        >
          <option value="all">Todos</option>
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
          placeholder="Ordem, cliente ou responsável"
          onChange={(event) => {
            const nextSearchParams = new URLSearchParams(searchParams)

            if (event.target.value.trim() === '') {
              nextSearchParams.delete('search')
            } else {
              nextSearchParams.set('search', event.target.value)
            }

            setSearchParams(nextSearchParams)
          }}
        />
      </div>

      <ul className="mt-8 space-y-4 md:hidden">
        {filteredOrders.map((order) => {
          const statusDetail = statusDetails[order.status]

          return (
            <li
              key={order.number}
              className="bg-surface rounded-ui border border-neutral-bg p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-foreground font-medium">{order.number}</p>
                <StatusBadge variant={statusDetail.variant}>
                  {statusDetail.label}
                </StatusBadge>
              </div>

              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-neutral text-xs">Cliente</dt>
                  <dd className="text-foreground mt-1">{order.client}</dd>
                </div>
                <div>
                  <dt className="text-neutral text-xs">Responsável</dt>
                  <dd className="text-foreground mt-1">{order.responsible}</dd>
                </div>
              </dl>
            </li>
          )
        })}
      </ul>

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
                Responsável
              </th>
              <th className="px-4 py-3 font-medium" scope="col">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-neutral-bg">
            {filteredOrders.map((order) => {
              const statusDetail = statusDetails[order.status]

              return (
                <tr key={order.number}>
                  <td className="text-foreground px-4 py-3 font-medium">
                    {order.number}
                  </td>
                  <td className="text-neutral px-4 py-3">{order.client}</td>
                  <td className="text-neutral px-4 py-3">
                    {order.responsible}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={statusDetail.variant}>
                      {statusDetail.label}
                    </StatusBadge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}

export { OrdersPage }
