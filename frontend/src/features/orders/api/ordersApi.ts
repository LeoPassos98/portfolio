import { apiClient } from '../../../shared/lib/http/apiClient'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import type {
  OrderListItem,
  OrderStatus,
  OrderVisibility,
} from '../types/order'

type OrderListStatus = 'all' | 'open' | OrderStatus

type OrderListParams = {
  status: OrderListStatus
  search?: string
}

type OrderHttpErrorCode = 'ORDER_NOT_FOUND'

type OrderHttpErrorResponse = HttpErrorResponse & {
  code: OrderHttpErrorCode
}

type OrderPersonHttpResponse = {
  id: string
  nome: string
}

type OrderListItemHttpResponse = {
  id: string
  numero: string
  cliente: OrderPersonHttpResponse
  responsavel: OrderPersonHttpResponse
  status: 'AGUARDANDO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'
  valor: string
  visibilidade: 'PRIVADA' | 'PUBLICA'
  criadoEm: string
  atualizadoEm: string
  versao: number
}

function toOrderStatus(
  status: OrderListItemHttpResponse['status'],
): OrderStatus {
  const statuses = {
    AGUARDANDO: 'awaiting',
    EM_ANDAMENTO: 'in-progress',
    CONCLUIDO: 'completed',
    CANCELADO: 'cancelled',
  } as const satisfies Record<OrderListItemHttpResponse['status'], OrderStatus>

  return statuses[status]
}

function toOrderVisibility(
  visibility: OrderListItemHttpResponse['visibilidade'],
): OrderVisibility {
  const visibilities = {
    PRIVADA: 'private',
    PUBLICA: 'public',
  } as const satisfies Record<
    OrderListItemHttpResponse['visibilidade'],
    OrderVisibility
  >

  return visibilities[visibility]
}

function toOrderListItem(order: OrderListItemHttpResponse): OrderListItem {
  return {
    id: order.id,
    number: order.numero,
    clientId: order.cliente.id,
    clientName: order.cliente.nome,
    responsibleEmployeeId: order.responsavel.id,
    responsibleName: order.responsavel.nome,
    status: toOrderStatus(order.status),
    value: order.valor,
    visibility: toOrderVisibility(order.visibilidade),
    createdAt: order.criadoEm,
    updatedAt: order.atualizadoEm,
    version: order.versao,
  }
}

async function listOrders({
  status,
  search,
}: OrderListParams): Promise<OrderListItem[]> {
  const { data } = await apiClient.get<OrderListItemHttpResponse[]>('/orders', {
    params: { status, search },
  })

  return data.map(toOrderListItem)
}

export { listOrders, toOrderListItem, toOrderStatus, toOrderVisibility }
export type {
  OrderHttpErrorCode,
  OrderHttpErrorResponse,
  OrderListItemHttpResponse,
  OrderListParams,
  OrderListStatus,
  OrderPersonHttpResponse,
}
