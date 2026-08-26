type EmployeeStatus = 'active' | 'inactive'
type EmployeeAccessStatus = 'active' | 'inactive'
type EmployeeAccessProfile = 'administrator' | 'employee'

type MockEmployee = {
  id: string
  name: string
  phone: string
  contactEmail: string
  status: EmployeeStatus
  access: {
    status: EmployeeAccessStatus
    profile: EmployeeAccessProfile
  } | null
}

const mockEmployees: MockEmployee[] = [
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
]

export { mockEmployees }
