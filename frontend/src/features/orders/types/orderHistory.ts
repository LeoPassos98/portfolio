import type { OrderStatus, OrderVisibility } from './order'

type OrderHistorySnapshot = {
  id: string
  orderId: string
  version: number
  changedAt: string
  authorName: string
  responsibleName: string
  description: string
  value: number
  notes: string | null
  status: OrderStatus
  visibility: OrderVisibility
}

export type { OrderHistorySnapshot }
