type Profile = {
  name: string
  phone: string
  contactEmail: string
  accountProfile: 'administrator' | 'employee'
  employeeStatus: 'active' | 'inactive'
  accountStatus: 'active' | 'inactive'
}

export type { Profile }
