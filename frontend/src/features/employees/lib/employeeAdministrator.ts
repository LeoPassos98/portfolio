import type {
  Employee,
  EmployeeAccessProfile,
  EmployeeAccessStatus,
} from '../types/employee'

function wouldRemoveLastActiveAdmin(
  employees: readonly Employee[],
  employeeId: string,
  nextAccessStatus: EmployeeAccessStatus | null,
  nextAccessProfile: EmployeeAccessProfile | null,
) {
  const employee = employees.find((item) => item.id === employeeId)
  const isCurrentActiveAdmin =
    employee?.access?.status === 'active' &&
    employee.access.profile === 'administrator'

  if (!isCurrentActiveAdmin) {
    return false
  }

  const remainsActiveAdmin =
    nextAccessStatus === 'active' && nextAccessProfile === 'administrator'

  if (remainsActiveAdmin) {
    return false
  }

  return !employees.some(
    (item) =>
      item.id !== employeeId &&
      item.access?.status === 'active' &&
      item.access.profile === 'administrator',
  )
}

export { wouldRemoveLastActiveAdmin }
