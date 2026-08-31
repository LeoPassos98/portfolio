import type {
  EmployeeAccessStatus,
  EmployeeStatus,
} from '../types/employee'

type EmployeeAccessStatusAvailability = {
  canChangeAccessStatus: boolean
  description: string | null
}

type EmployeeAccessProfileAvailability = {
  canChangeAccessProfile: boolean
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
  wouldRemoveLastActiveAdmin: boolean,
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

  if (wouldRemoveLastActiveAdmin) {
    return {
      canChangeAccessStatus: false,
      description:
        'Não é possível inativar a última conta ativa de Administrador.',
    }
  }

  return {
    canChangeAccessStatus: true,
    description:
      'Suspender apenas a conta não altera a situação do cadastro do funcionário.',
  }
}

function getEmployeeAccessProfileAvailability(
  wouldRemoveLastActiveAdmin: boolean,
): EmployeeAccessProfileAvailability {
  if (wouldRemoveLastActiveAdmin) {
    return {
      canChangeAccessProfile: false,
      description:
        'Não é possível remover o perfil da última conta ativa de Administrador.',
    }
  }

  return {
    canChangeAccessProfile: true,
    description: null,
  }
}

export {
  getEmployeeAccessProfileAvailability,
  getEmployeeAccessStatus,
  getEmployeeAccessStatusAvailability,
}
