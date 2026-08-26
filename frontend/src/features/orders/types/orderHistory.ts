import type { OrderStatus } from './order'

type OrderHistorySnapshot = {
  id: string
  orderId: string
  changedAt: string
  authorName: string
  responsibleName: string
  status: OrderStatus
}

export type { OrderHistorySnapshot }
