type OrderStatus = 'awaiting' | 'in-progress' | 'completed' | 'cancelled'

type OrderVisibility = 'public' | 'private'

type Order = {
  id: string
  number: string
  clientId: string
  clientName: string
  responsibleEmployeeId: string
  responsibleName: string
  status: OrderStatus
  description: string
  value: number
  notes: string | null
  visibility: OrderVisibility
  createdAt: string
  updatedAt: string
}

type OrderListItem = {
  id: string
  number: string
  clientId: string
  clientName: string
  responsibleEmployeeId: string
  responsibleName: string
  status: OrderStatus
  value: string
  visibility: OrderVisibility
  createdAt: string
  updatedAt: string
  version: number
}

type OrderDetail = {
  id: string
  number: string
  clientId: string
  clientName: string
  responsibleEmployeeId: string
  responsibleName: string
  status: OrderStatus
  description: string
  value: string
  notes: string | null
  visibility: OrderVisibility
  version: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
  cancelledAt: string | null
}

type OrderHistoryItem = {
  id: string
  version: number
  description: string
  value: string
  notes: string | null
  status: OrderStatus
  visibility: OrderVisibility
  completedAt: string | null
  cancelledAt: string | null
  changedAt: string
  responsibleEmployeeId: string
  responsibleName: string
  authorUserId: string
  authorName: string
}

export type {
  Order,
  OrderDetail,
  OrderHistoryItem,
  OrderListItem,
  OrderStatus,
  OrderVisibility,
}
