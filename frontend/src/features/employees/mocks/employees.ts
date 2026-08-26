import type { Employee } from '../types/employee'

const mockEmployees: Employee[] = [
  {
    id: 'employee-1',
    name: 'Carlos Lima',
    phone: '(11) 99999-1234',
    contactEmail: 'carlos.lima@example.com',
    status: 'active',
    access: {
      status: 'active',
      profile: 'employee',
    },
  },
  {
    id: 'employee-2',
    name: 'Ana Souza',
    phone: '(11) 98888-5678',
    contactEmail: 'ana.souza@example.com',
    status: 'active',
    access: {
      status: 'active',
      profile: 'administrator',
    },
  },
  {
    id: 'employee-3',
    name: 'Beatriz Alves',
    phone: '(11) 97777-2468',
    contactEmail: 'beatriz.alves@example.com',
    status: 'active',
    access: null,
  },
  {
    id: 'employee-4',
    name: 'Paulo Mendes',
    phone: '(11) 96666-1357',
    contactEmail: 'paulo.mendes@example.com',
    status: 'inactive',
    access: {
      status: 'inactive',
      profile: 'employee',
    },
  },
  {
    id: 'employee-5',
    name: 'Fernanda Rocha',
    phone: '(11) 95555-8642',
    contactEmail: 'fernanda.rocha@example.com',
    status: 'active',
    access: {
      status: 'inactive',
      profile: 'employee',
    },
  },
]

export { mockEmployees }
