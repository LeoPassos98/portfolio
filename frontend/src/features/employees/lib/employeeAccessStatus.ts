import type {
  EmployeeAccessStatus,
  EmployeeStatus,
} from '../types/employee'

type EmployeeAccessStatusAvailability = {
  canChangeAccessStatus: boolean
  description: string | null
}

function getEmployeeAccessStatus(
  employeeStatus: EmployeeStatus,
  accessStatus: EmployeeAccessStatus | null,
) {
  if (employeeStatus === 'inactive' && accessStatus) {
    return 'inactive'
  }

  return accessStatus
}

function getEmployeeAccessStatusAvailability(
  employeeStatus: EmployeeStatus,
  accessStatus: EmployeeAccessStatus | null,
): EmployeeAccessStatusAvailability {
  if (!accessStatus) {
    return {
      canChangeAccessStatus: false,
      description: null,
    }
  }

  if (employeeStatus === 'inactive') {
    return {
      canChangeAccessStatus: false,
      description:
        'A conta permanece inativa enquanto o cadastro do funcionário estiver inativo.',
    }
  }

  return {
    canChangeAccessStatus: true,
    description:
      'Suspender apenas a conta não altera a situação do cadastro do funcionário.',
  }
}

export { getEmployeeAccessStatus, getEmployeeAccessStatusAvailability }
