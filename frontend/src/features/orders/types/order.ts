type OrderStatus =
  | 'awaiting'
  | 'in-progress'
  | 'completed'
  | 'cancelled'

type OrderVisibility = 'public' | 'private'

type Order = {
  id: string
  number: string
  clientName: string
  responsibleName: string
  status: OrderStatus
  description: string
  value: number
  notes: string | null
  visibility: OrderVisibility
  createdAt: string
  updatedAt: string
}

export type { Order, OrderStatus, OrderVisibility }
