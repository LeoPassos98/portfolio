import type { Order } from '../types/order'

const mockOrders: Order[] = [
  {
    id: '1',
    number: 'OS-1001',
    clientName: 'Mariana Costa',
    responsibleName: 'Carlos Lima',
    status: 'awaiting',
  },
  {
    id: '2',
    number: 'OS-1002',
    clientName: 'Empresa Horizonte',
    responsibleName: 'Ana Souza',
    status: 'in-progress',
  },
  {
    id: '3',
    number: 'OS-1003',
    clientName: 'Rafael Martins',
    responsibleName: 'Carlos Lima',
    status: 'completed',
  },
  {
    id: '4',
    number: 'OS-1004',
    clientName: 'Clínica Central',
    responsibleName: 'Beatriz Alves',
    status: 'cancelled',
  },
  {
    id: '5',
    number: 'OS-1005',
    clientName: 'Oficina União',
    responsibleName: 'Ana Souza',
    status: 'in-progress',
  },
  {
    id: '6',
    number: 'OS-1006',
    clientName: 'Paulo Mendes',
    responsibleName: 'Beatriz Alves',
    status: 'awaiting',
  },
]

export { mockOrders }
