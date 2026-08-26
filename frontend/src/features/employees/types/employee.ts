type EmployeeStatus = 'active' | 'inactive'
type EmployeeAccessStatus = 'active' | 'inactive'
type EmployeeAccessProfile = 'administrator' | 'employee'

type Employee = {
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

export type {
  Employee,
  EmployeeAccessProfile,
  EmployeeAccessStatus,
  EmployeeStatus,
}
