type OrderStatus =
  | 'awaiting'
  | 'in-progress'
  | 'completed'
  | 'cancelled'

type Order = {
  id: string
  number: string
  clientName: string
  responsibleName: string
  status: OrderStatus
}

export type { Order, OrderStatus }
