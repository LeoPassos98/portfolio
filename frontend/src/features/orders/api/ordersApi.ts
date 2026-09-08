import { apiClient } from '../../../shared/lib/http/apiClient'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import type {
  OrderDetail,
  OrderHistoryItem,
  OrderListItem,
  OrderStatus,
  OrderVisibility,
} from '../types/order'

type OrderListStatus = 'all' | 'open' | OrderStatus

type OrderListParams = {
  status: OrderListStatus
  search?: string
}

type OrderHttpErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_CLIENT_NOT_FOUND'
  | 'ORDER_CLIENT_INACTIVE'
  | 'ORDER_RESPONSIBLE_REQUIRED'
  | 'ORDER_RESPONSIBLE_NOT_FOUND'
  | 'ORDER_RESPONSIBLE_INACTIVE'

type OrderHttpErrorResponse = HttpErrorResponse & {
  code: OrderHttpErrorCode
}

type OrderPersonHttpResponse = {
  id: string
  nome: string
}

type OrderStatusHttpResponse =
  | 'AGUARDANDO'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO'
  | 'CANCELADO'

type OrderVisibilityHttpResponse = 'PRIVADA' | 'PUBLICA'

type OrderListItemHttpResponse = {
  id: string
  numero: string
  cliente: OrderPersonHttpResponse
  responsavel: OrderPersonHttpResponse
  status: OrderStatusHttpResponse
  valor: string
  visibilidade: OrderVisibilityHttpResponse
  criadoEm: string
  atualizadoEm: string
  versao: number
}

type OrderDetailHttpResponse = OrderListItemHttpResponse & {
  descricao: string
  observacoes: string | null
  concluidoEm: string | null
  canceladoEm: string | null
}

type OrderCreateValues = {
  clientId: string
  description: string
  value: string
  notes?: string
  visibility: OrderVisibility
  responsibleId?: string
}

type OrderCreateHttpRequest = {
  clienteId: string
  descricao: string
  valor: string
  observacoes?: string
  visibilidade: OrderVisibilityHttpResponse
  responsavelId?: string
}

type OrderHistoryItemHttpResponse = {
  id: string
  versao: number
  descricao: string
  valor: string
  observacoes: string | null
  status: OrderStatusHttpResponse
  visibilidade: OrderVisibilityHttpResponse
  concluidoEm: string | null
  canceladoEm: string | null
  snapshotEm: string
  responsavel: OrderPersonHttpResponse
  alteradoPor: OrderPersonHttpResponse
}

function toOrderStatus(status: OrderStatusHttpResponse): OrderStatus {
  const statuses = {
    AGUARDANDO: 'awaiting',
    EM_ANDAMENTO: 'in-progress',
    CONCLUIDO: 'completed',
    CANCELADO: 'cancelled',
  } as const satisfies Record<OrderStatusHttpResponse, OrderStatus>

  return statuses[status]
}

function toOrderVisibility(
  visibility: OrderVisibilityHttpResponse,
): OrderVisibility {
  const visibilities = {
    PRIVADA: 'private',
    PUBLICA: 'public',
  } as const satisfies Record<OrderVisibilityHttpResponse, OrderVisibility>

  return visibilities[visibility]
}

function toOrderCreateRequest(
  values: OrderCreateValues,
): OrderCreateHttpRequest {
  return {
    clienteId: values.clientId,
    descricao: values.description,
    valor: values.value,
    ...(values.notes ? { observacoes: values.notes } : {}),
    visibilidade: values.visibility === 'private' ? 'PRIVADA' : 'PUBLICA',
    ...(values.responsibleId ? { responsavelId: values.responsibleId } : {}),
  }
}

function toOrderDetail(order: OrderDetailHttpResponse): OrderDetail {
  return {
    ...toOrderListItem(order),
    description: order.descricao,
    notes: order.observacoes,
    value: order.valor,
    completedAt: order.concluidoEm,
    cancelledAt: order.canceladoEm,
  }
}

function toOrderHistoryItem(
  snapshot: OrderHistoryItemHttpResponse,
): OrderHistoryItem {
  return {
    id: snapshot.id,
    version: snapshot.versao,
    description: snapshot.descricao,
    value: snapshot.valor,
    notes: snapshot.observacoes,
    status: toOrderStatus(snapshot.status),
    visibility: toOrderVisibility(snapshot.visibilidade),
    completedAt: snapshot.concluidoEm,
    cancelledAt: snapshot.canceladoEm,
    changedAt: snapshot.snapshotEm,
    responsibleEmployeeId: snapshot.responsavel.id,
    responsibleName: snapshot.responsavel.nome,
    authorUserId: snapshot.alteradoPor.id,
    authorName: snapshot.alteradoPor.nome,
  }
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

async function getOrder(id: string): Promise<OrderDetail> {
  const { data } = await apiClient.get<OrderDetailHttpResponse>(`/orders/${id}`)

  return toOrderDetail(data)
}

async function createOrder(values: OrderCreateValues): Promise<OrderDetail> {
  const { data } = await apiClient.post<OrderDetailHttpResponse>(
    '/orders',
    toOrderCreateRequest(values),
  )

  return toOrderDetail(data)
}

async function getOrderHistory(id: string): Promise<OrderHistoryItem[]> {
  const { data } = await apiClient.get<OrderHistoryItemHttpResponse[]>(
    `/orders/${id}/history`,
  )

  return data.map(toOrderHistoryItem)
}

export {
  createOrder,
  getOrder,
  getOrderHistory,
  listOrders,
  toOrderDetail,
  toOrderCreateRequest,
  toOrderHistoryItem,
  toOrderListItem,
  toOrderStatus,
  toOrderVisibility,
}
export type {
  OrderDetailHttpResponse,
  OrderCreateHttpRequest,
  OrderCreateValues,
  OrderHistoryItemHttpResponse,
  OrderHttpErrorCode,
  OrderHttpErrorResponse,
  OrderListItemHttpResponse,
  OrderListParams,
  OrderListStatus,
  OrderPersonHttpResponse,
  OrderStatusHttpResponse,
  OrderVisibilityHttpResponse,
}
