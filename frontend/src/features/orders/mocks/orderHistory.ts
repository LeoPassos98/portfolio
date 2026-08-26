import type { OrderHistorySnapshot } from '../types/orderHistory'

const mockOrderHistory: OrderHistorySnapshot[] = [
  {
    id: 'history-1',
    orderId: '1',
    changedAt: '2026-08-20T09:00:00-03:00',
    authorName: 'Ana Souza',
    responsibleName: 'Carlos Lima',
    status: 'awaiting',
  },
  {
    id: 'history-2',
    orderId: '2',
    changedAt: '2026-08-19T14:30:00-03:00',
    authorName: 'Carlos Lima',
    responsibleName: 'Carlos Lima',
    status: 'awaiting',
  },
  {
    id: 'history-3',
    orderId: '2',
    changedAt: '2026-08-21T10:15:00-03:00',
    authorName: 'Beatriz Alves',
    responsibleName: 'Ana Souza',
    status: 'in-progress',
  },
  {
    id: 'history-4',
    orderId: '3',
    changedAt: '2026-08-18T08:45:00-03:00',
    authorName: 'Ana Souza',
    responsibleName: 'Ana Souza',
    status: 'awaiting',
  },
  {
    id: 'history-5',
    orderId: '3',
    changedAt: '2026-08-20T13:20:00-03:00',
    authorName: 'Carlos Lima',
    responsibleName: 'Carlos Lima',
    status: 'in-progress',
  },
  {
    id: 'history-6',
    orderId: '3',
    changedAt: '2026-08-22T16:40:00-03:00',
    authorName: 'Carlos Lima',
    responsibleName: 'Carlos Lima',
    status: 'completed',
  },
  {
    id: 'history-7',
    orderId: '4',
    changedAt: '2026-08-23T11:10:00-03:00',
    authorName: 'Beatriz Alves',
    responsibleName: 'Beatriz Alves',
    status: 'cancelled',
  },
  {
    id: 'history-8',
    orderId: '5',
    changedAt: '2026-08-24T15:25:00-03:00',
    authorName: 'Ana Souza',
    responsibleName: 'Ana Souza',
    status: 'in-progress',
  },
]

export { mockOrderHistory }
