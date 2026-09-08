import type { OrderListParams } from './ordersApi'

const ordersQueryKeys = {
  all: ['orders'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  list: (params: OrderListParams) => ['orders', 'list', params] as const,
  lists: () => ['orders', 'list'] as const,
}

export { ordersQueryKeys }
