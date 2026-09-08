import type { OrderListParams } from './ordersApi'

const ordersQueryKeys = {
  all: ['orders'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  history: (id: string) => ['orders', 'history', id] as const,
  list: (params: OrderListParams) => ['orders', 'list', params] as const,
  lists: () => ['orders', 'list'] as const,
  responsibles: () => ['orders', 'responsibles'] as const,
}

export { ordersQueryKeys }
