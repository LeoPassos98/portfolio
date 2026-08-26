import type { Client } from '../types/client'

const mockClients: Client[] = [
  {
    id: 'client-1',
    name: 'Mariana Costa',
    phone: '(11) 98888-1234',
    document: '123.456.789-09',
    status: 'active',
  },
  {
    id: 'client-2',
    name: 'Empresa Horizonte',
    phone: '(11) 3333-9000',
    document: '12.345.678/0001-90',
    status: 'active',
  },
  {
    id: 'client-3',
    name: 'Rafael Martins',
    phone: '(11) 97777-4567',
    document: null,
    status: 'active',
  },
  {
    id: 'client-4',
    name: 'Clínica Central',
    phone: '(11) 3222-1000',
    document: '98.765.432/0001-10',
    status: 'inactive',
  },
]

export { mockClients }
