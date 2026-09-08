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

export type { Order, OrderListItem, OrderStatus, OrderVisibility }
