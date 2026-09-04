import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useSuccessFeedback } from '../../../components/feedback/useSuccessFeedback'
import { useUnsavedChangesGuard } from '../../../components/feedback/useUnsavedChangesGuard'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import {
  getEmployeeAccessStatus,
  getEmployeeAccessStatusAvailability,
} from '../lib/employeeAccessStatus'
import { employeesQueryKeys } from '../api/employeeQueryKeys'
import {
  createEmployeeAccess,
  getEmployee,
  resetEmployeeAccessPassword,
  updateEmployee,
  updateEmployeeAccessLoginEmail,
  updateEmployeeAccessProfile,
  updateEmployeeAccessStatus,
  updateEmployeeStatus,
  type EmployeeHttpErrorResponse,
} from '../api/employeesApi'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import type {
  Employee,
  EmployeeAccessProfile,
  EmployeeAccessStatus,
  EmployeeStatus,
} from '../types/employee'
import {
  employeeSchema,
  type EmployeeFormData,
  type EmployeeFormValues,
} from '../schemas/employeeSchema'
import {
  employeeAccessCreationSchema,
  employeeAccessPasswordResetSchema,
  employeeAccessUpdateSchema,
  type EmployeeAccessCreationFormData,
  type EmployeeAccessCreationFormValues,
  type EmployeeAccessPasswordResetFormData,
  type EmployeeAccessPasswordResetFormValues,
  type EmployeeAccessUpdateFormData,
  type EmployeeAccessUpdateFormValues,
} from '../schemas/employeeAccessSchema'

const accessStatusDetails = {
  active: { label: 'Ativa', variant: 'success' },
  inactive: { label: 'Inativa', variant: 'neutral' },
} as const

function isEmployeeApiError(
  error: unknown,
  code: EmployeeHttpErrorResponse['code'],
) {
  return (
    isAxiosError<HttpErrorResponse>(error) && error.response?.data.code === code
  )
}

function toEmployeeFormData(employee: Employee): EmployeeFormData {
  return {
    name: employee.name,
    phone: employee.phone,
    contactEmail: employee.contactEmail,
    status: employee.status,
  }
}

function EmployeeEditSkeleton() {
  return (
    <AppLayout>
      <div className="animate-pulse" aria-label="Carregando funcionário">
        <div className="h-8 w-56 rounded bg-neutral-bg" />
        <div className="mt-3 h-5 w-64 rounded bg-neutral-bg" />
        <div className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6">
          {[0, 1].map((item) => (
            <div key={item} className="space-y-4">
              <div className="h-6 w-40 rounded bg-neutral-bg" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-10 rounded bg-neutral-bg" />
                <div className="h-10 rounded bg-neutral-bg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

function EmployeeEditPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const queryClient = useQueryClient()
  const { showSuccess } = useSuccessFeedback()
  const [formError, setFormError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [accessStatusError, setAccessStatusError] = useState<string | null>(
    null,
  )
  const [accessProfileError, setAccessProfileError] = useState<string | null>(
    null,
  )
  const [accessLoginEmailError, setAccessLoginEmailError] = useState<
    string | null
  >(null)
  const [accessPasswordResetError, setAccessPasswordResetError] = useState<
    string | null
  >(null)
  const [accessCreationMessage, setAccessCreationMessage] = useState<
    string | null
  >(null)
  const {
    data: employee,
    error,
    isError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: employeesQueryKeys.detail(employeeId ?? ''),
    queryFn: () => getEmployee(employeeId!),
    enabled: Boolean(employeeId),
  })
  const {
    register: registerEmployee,
    handleSubmit: handleSubmitEmployee,
    reset: resetEmployee,
    formState: { errors: employeeErrors, isDirty: isEmployeeDirty },
  } = useForm<EmployeeFormData, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    values: employee ? toEmployeeFormData(employee) : undefined,
    defaultValues: {
      name: '',
      phone: '',
      contactEmail: '',
      status: 'active',
    },
  })
  const {
    clearErrors: clearAccessCreationErrors,
    register: registerAccessCreation,
    handleSubmit: handleSubmitAccessCreation,
    reset: resetAccessCreation,
    setError: setAccessCreationFieldError,
    formState: { errors: accessCreationErrors, isDirty: isAccessCreationDirty },
  } = useForm<
    EmployeeAccessCreationFormData,
    unknown,
    EmployeeAccessCreationFormValues
  >({
    resolver: zodResolver(employeeAccessCreationSchema),
    defaultValues: {
      loginEmail: '',
      profile: 'employee',
      initialPassword: '',
      confirmPassword: '',
    },
  })
  const {
    register: registerAccessUpdate,
    handleSubmit: handleSubmitAccessUpdate,
    clearErrors: clearAccessUpdateErrors,
    formState: { errors: accessUpdateErrors, isDirty: isAccessUpdateDirty },
    reset: resetAccessUpdate,
    setError: setAccessUpdateFieldError,
  } = useForm<
    EmployeeAccessUpdateFormData,
    unknown,
    EmployeeAccessUpdateFormValues
  >({
    resolver: zodResolver(employeeAccessUpdateSchema),
    values: employee?.access
      ? {
          loginEmail: employee.access.loginEmail,
        }
      : undefined,
    defaultValues: {
      loginEmail: '',
    },
  })
  const {
    clearErrors: clearAccessPasswordResetErrors,
    register: registerAccessPasswordReset,
    handleSubmit: handleSubmitAccessPasswordReset,
    reset: resetAccessPasswordReset,
    formState: {
      errors: accessPasswordResetErrors,
      isDirty: isAccessPasswordResetDirty,
    },
  } = useForm<
    EmployeeAccessPasswordResetFormData,
    unknown,
    EmployeeAccessPasswordResetFormValues
  >({
    resolver: zodResolver(employeeAccessPasswordResetSchema),
    defaultValues: {
      temporaryPassword: '',
      confirmPassword: '',
    },
  })
  const { confirmationDialog } = useUnsavedChangesGuard(
    isEmployeeDirty ||
      isAccessCreationDirty ||
      isAccessUpdateDirty ||
      isAccessPasswordResetDirty,
  )

  const updateMutation = useMutation({
    mutationFn: (values: EmployeeFormValues) =>
      updateEmployee(employeeId!, values),
  })
  const statusMutation = useMutation({
    mutationFn: (status: EmployeeStatus) =>
      updateEmployeeStatus(employeeId!, status),
  })
  const accessStatusMutation = useMutation({
    mutationFn: (status: EmployeeAccessStatus) =>
      updateEmployeeAccessStatus(employeeId!, status),
  })
  const accessProfileMutation = useMutation({
    mutationFn: (profile: EmployeeAccessProfile) =>
      updateEmployeeAccessProfile(employeeId!, profile),
  })
  const accessLoginEmailMutation = useMutation({
    mutationFn: (loginEmail: string) =>
      updateEmployeeAccessLoginEmail(employeeId!, loginEmail),
  })
  const createAccessMutation = useMutation({
    mutationFn: (values: EmployeeAccessCreationFormValues) =>
      createEmployeeAccess(employeeId!, values),
  })
  const accessPasswordResetMutation = useMutation({
    mutationFn: (values: EmployeeAccessPasswordResetFormValues) =>
      resetEmployeeAccessPassword(employeeId!, values),
  })

  async function synchronizeEmployee(updatedEmployee: Employee) {
    queryClient.setQueryData(
      employeesQueryKeys.detail(updatedEmployee.id),
      updatedEmployee,
    )
    await queryClient.invalidateQueries({
      queryKey: employeesQueryKeys.lists(),
    })
  }

  async function onSubmit(values: EmployeeFormValues) {
    if (updateMutation.isPending) {
      return
    }

    setFormError(null)

    try {
      const updatedEmployee = await updateMutation.mutateAsync(values)

      await synchronizeEmployee(updatedEmployee)
      resetEmployee(toEmployeeFormData(updatedEmployee))
      showSuccess('Funcionário atualizado com sucesso.')
    } catch {
      setFormError('Não foi possível salvar as alterações. Tente novamente.')
    }
  }

  async function handleStatusChange(status: EmployeeStatus) {
    if (!employee || status === employee.status || statusMutation.isPending) {
      return
    }

    setStatusError(null)

    try {
      const updatedEmployee = await statusMutation.mutateAsync(status)

      await synchronizeEmployee(updatedEmployee)
      resetEmployee(toEmployeeFormData(updatedEmployee))
      showSuccess(
        updatedEmployee.status === 'inactive'
          ? 'Funcionário desativado com sucesso.'
          : 'Funcionário reativado com sucesso.',
      )
    } catch (statusMutationError) {
      if (
        isEmployeeApiError(statusMutationError, 'EMPLOYEE_HAS_ACTIVE_ORDERS')
      ) {
        setStatusError(
          'Não é possível inativar este funcionário porque possui uma OS aguardando ou em andamento sob sua responsabilidade.',
        )
        return
      }

      if (
        isEmployeeApiError(statusMutationError, 'LAST_ACTIVE_ADMIN_REQUIRED')
      ) {
        setStatusError(
          'Não é possível inativar este funcionário porque sua conta é a última conta ativa de Administrador.',
        )
        return
      }

      setStatusError('Não foi possível atualizar a situação. Tente novamente.')
    }
  }

  async function onCreateAccess(values: EmployeeAccessCreationFormValues) {
    if (!employeeId || createAccessMutation.isPending) {
      return
    }

    setAccessCreationMessage(null)
    clearAccessCreationErrors('loginEmail')

    try {
      const updatedEmployee = await createAccessMutation.mutateAsync(values)

      await synchronizeEmployee(updatedEmployee)
      resetAccessCreation()
      showSuccess('Conta de acesso criada com sucesso.')
    } catch (creationError) {
      if (isEmployeeApiError(creationError, 'LOGIN_EMAIL_ALREADY_EXISTS')) {
        setAccessCreationFieldError('loginEmail', {
          type: 'server',
          message: 'Este e-mail de login já está em uso por outra conta.',
        })
        return
      }

      if (isEmployeeApiError(creationError, 'EMPLOYEE_ACCESS_ALREADY_EXISTS')) {
        setAccessCreationMessage(
          'Este funcionário já possui uma conta de acesso.',
        )
        await refetch()
        return
      }

      setAccessCreationMessage(
        'Não foi possível criar a conta de acesso. Tente novamente.',
      )
    }
  }

  async function handleAccessStatusChange(status: EmployeeAccessStatus) {
    if (
      !employeeId ||
      !employee?.access ||
      status === employee.access.status ||
      accessStatusMutation.isPending
    ) {
      return
    }

    setAccessStatusError(null)

    try {
      const updatedEmployee = await accessStatusMutation.mutateAsync(status)

      await synchronizeEmployee(updatedEmployee)
      showSuccess(
        updatedEmployee.access?.status === 'inactive'
          ? 'Conta de acesso inativada com sucesso.'
          : 'Conta de acesso reativada com sucesso.',
      )
    } catch (accessStatusMutationError) {
      if (
        isEmployeeApiError(
          accessStatusMutationError,
          'EMPLOYEE_MUST_BE_ACTIVE_FOR_ACCOUNT_ACTIVATION',
        )
      ) {
        setAccessStatusError(
          'Não é possível ativar a conta enquanto o cadastro do funcionário estiver inativo.',
        )
        return
      }

      if (
        isEmployeeApiError(
          accessStatusMutationError,
          'LAST_ACTIVE_ADMIN_REQUIRED',
        )
      ) {
        setAccessStatusError(
          'Não é possível inativar a última conta ativa de Administrador.',
        )
        return
      }

      if (
        isEmployeeApiError(
          accessStatusMutationError,
          'EMPLOYEE_ACCESS_NOT_FOUND',
        )
      ) {
        setAccessStatusError(
          'Esta conta de acesso não foi encontrada. Atualize a página e tente novamente.',
        )
        await refetch()
        return
      }

      if (isEmployeeApiError(accessStatusMutationError, 'EMPLOYEE_NOT_FOUND')) {
        setAccessStatusError(
          'Este funcionário não foi encontrado. Atualize a página e tente novamente.',
        )
        await refetch()
        return
      }

      setAccessStatusError(
        'Não foi possível atualizar a situação da conta. Tente novamente.',
      )
    }
  }

  async function handleAccessProfileChange(profile: EmployeeAccessProfile) {
    if (
      !employeeId ||
      !employee?.access ||
      profile === employee.access.profile ||
      accessProfileMutation.isPending
    ) {
      return
    }

    setAccessProfileError(null)

    try {
      const updatedEmployee = await accessProfileMutation.mutateAsync(profile)

      await synchronizeEmployee(updatedEmployee)
      showSuccess(
        updatedEmployee.access?.profile === 'administrator'
          ? 'Perfil da conta atualizado para Administrador.'
          : 'Perfil da conta atualizado para Funcionário.',
      )
    } catch (accessProfileMutationError) {
      if (
        isEmployeeApiError(
          accessProfileMutationError,
          'LAST_ACTIVE_ADMIN_REQUIRED',
        )
      ) {
        setAccessProfileError(
          'A última conta ativa de Administrador não pode ser convertida para Funcionário.',
        )
        return
      }

      if (
        isEmployeeApiError(
          accessProfileMutationError,
          'EMPLOYEE_ACCESS_NOT_FOUND',
        )
      ) {
        setAccessProfileError(
          'Esta conta de acesso não foi encontrada. Atualize a página e tente novamente.',
        )
        await refetch()
        return
      }

      if (
        isEmployeeApiError(accessProfileMutationError, 'EMPLOYEE_NOT_FOUND')
      ) {
        setAccessProfileError(
          'Este funcionário não foi encontrado. Atualize a página e tente novamente.',
        )
        await refetch()
        return
      }

      setAccessProfileError(
        'Não foi possível atualizar o perfil. Tente novamente.',
      )
    }
  }

  async function onUpdateAccess(values: EmployeeAccessUpdateFormValues) {
    if (
      !employeeId ||
      !employee?.access ||
      accessLoginEmailMutation.isPending
    ) {
      return
    }

    setAccessLoginEmailError(null)
    clearAccessUpdateErrors('loginEmail')

    try {
      const updatedEmployee = await accessLoginEmailMutation.mutateAsync(
        values.loginEmail,
      )

      await synchronizeEmployee(updatedEmployee)
      resetAccessUpdate({
        loginEmail: updatedEmployee.access?.loginEmail ?? values.loginEmail,
      })
      showSuccess('E-mail de login atualizado com sucesso.')
    } catch (accessLoginEmailMutationError) {
      if (
        isEmployeeApiError(
          accessLoginEmailMutationError,
          'LOGIN_EMAIL_ALREADY_EXISTS',
        )
      ) {
        setAccessUpdateFieldError('loginEmail', {
          type: 'server',
          message: 'Este e-mail de login já está em uso por outra conta.',
        })
        return
      }

      if (
        isEmployeeApiError(
          accessLoginEmailMutationError,
          'EMPLOYEE_ACCESS_NOT_FOUND',
        )
      ) {
        setAccessLoginEmailError(
          'Esta conta de acesso não foi encontrada. Atualize a página e tente novamente.',
        )
        await refetch()
        return
      }

      if (
        isEmployeeApiError(accessLoginEmailMutationError, 'EMPLOYEE_NOT_FOUND')
      ) {
        setAccessLoginEmailError(
          'Este funcionário não foi encontrado. Atualize a página e tente novamente.',
        )
        await refetch()
        return
      }

      setAccessLoginEmailError(
        'Não foi possível atualizar o e-mail de login. Tente novamente.',
      )
    }
  }

  async function onResetAccessPassword(
    values: EmployeeAccessPasswordResetFormValues,
  ) {
    if (
      !employeeId ||
      !employee?.access ||
      accessPasswordResetMutation.isPending
    ) {
      return
    }

    setAccessPasswordResetError(null)
    clearAccessPasswordResetErrors()

    try {
      const updatedEmployee =
        await accessPasswordResetMutation.mutateAsync(values)

      queryClient.setQueryData(
        employeesQueryKeys.detail(updatedEmployee.id),
        updatedEmployee,
      )
      resetAccessPasswordReset()
      showSuccess(
        'A senha temporária foi redefinida. O usuário deverá alterá-la no próximo acesso.',
      )
    } catch (accessPasswordResetMutationError) {
      if (
        isEmployeeApiError(
          accessPasswordResetMutationError,
          'EMPLOYEE_ACCESS_NOT_FOUND',
        )
      ) {
        setAccessPasswordResetError(
          'Esta conta de acesso não foi encontrada. Atualize a página e tente novamente.',
        )
        await refetch()
        return
      }

      if (
        isEmployeeApiError(
          accessPasswordResetMutationError,
          'EMPLOYEE_NOT_FOUND',
        )
      ) {
        setAccessPasswordResetError(
          'Este funcionário não foi encontrado. Atualize a página e tente novamente.',
        )
        await refetch()
        return
      }

      setAccessPasswordResetError(
        'Não foi possível redefinir a senha temporária. Tente novamente.',
      )
    }
  }

  if (!employeeId || isEmployeeApiError(error, 'EMPLOYEE_NOT_FOUND')) {
    return (
      <AppLayout>
        <Link
          to="/employees"
          className="text-primary inline-flex rounded-ui hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Voltar para Funcionários
        </Link>
        <div className="mt-6">
          <EmptyState
            title="Funcionário não encontrado"
            description="Não foi possível localizar o funcionário solicitado para edição."
          />
        </div>
      </AppLayout>
    )
  }

  if (isPending) {
    return <EmployeeEditSkeleton />
  }

  if (isError || !employee) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <EmptyState
            title="Não foi possível carregar o funcionário"
            description="Verifique sua conexão e tente novamente."
          />
          <div className="flex justify-center">
            <Button type="button" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const currentEmployeeAccessStatus = getEmployeeAccessStatus(
    employee.status,
    employee.access?.status ?? null,
  )
  const accessStatus = currentEmployeeAccessStatus
    ? accessStatusDetails[currentEmployeeAccessStatus]
    : null
  const accessStatusAvailability = getEmployeeAccessStatusAvailability(
    employee.status,
    currentEmployeeAccessStatus,
  )
  const employeeAccessStatusDescriptionIds = [
    accessStatusError ? 'employee-access-status-error' : null,
    accessStatusAvailability.description
      ? 'employee-access-status-description'
      : null,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">Editar funcionário</h1>
      <p className="text-neutral mt-1">{employee.name}</p>

      <form
        id="employee-details-form"
        noValidate
        className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6"
        onSubmit={handleSubmitEmployee(onSubmit)}
      >
        <section aria-labelledby="edit-employee-data-title">
          <h2
            id="edit-employee-data-title"
            className="text-foreground text-lg font-bold"
          >
            Dados do funcionário
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-employee-name">Nome</Label>
              <Input
                id="edit-employee-name"
                autoComplete="name"
                aria-invalid={Boolean(employeeErrors.name)}
                aria-required="true"
                aria-describedby={
                  employeeErrors.name ? 'edit-employee-name-error' : undefined
                }
                {...registerEmployee('name')}
              />
              {employeeErrors.name?.message && (
                <p id="edit-employee-name-error" className="text-error text-sm">
                  {employeeErrors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-status">
                Situação do funcionário
              </Label>
              <Select
                id="edit-employee-status"
                value={employee.status}
                disabled={statusMutation.isPending}
                aria-required="true"
                onChange={(event) => {
                  const status = event.target
                    .value as EmployeeFormData['status']
                  void handleStatusChange(status)
                }}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
              {statusMutation.isPending && (
                <p className="text-neutral text-sm">Atualizando situação...</p>
              )}
              {statusError && (
                <p role="alert" className="text-error text-sm">
                  {statusError}
                </p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-employee-contact-title">
          <h2
            id="edit-employee-contact-title"
            className="text-foreground text-lg font-bold"
          >
            Contato
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-employee-phone">Telefone</Label>
              <Input
                id="edit-employee-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                aria-invalid={Boolean(employeeErrors.phone)}
                aria-required="true"
                aria-describedby={
                  employeeErrors.phone ? 'edit-employee-phone-error' : undefined
                }
                {...registerEmployee('phone')}
              />
              {employeeErrors.phone?.message && (
                <p
                  id="edit-employee-phone-error"
                  className="text-error text-sm"
                >
                  {employeeErrors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-email">E-mail de contato</Label>
              <Input
                id="edit-employee-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(employeeErrors.contactEmail)}
                aria-required="true"
                aria-describedby={
                  employeeErrors.contactEmail
                    ? 'edit-employee-email-error'
                    : undefined
                }
                {...registerEmployee('contactEmail')}
              />
              {employeeErrors.contactEmail?.message && (
                <p
                  id="edit-employee-email-error"
                  className="text-error text-sm"
                >
                  {employeeErrors.contactEmail.message}
                </p>
              )}
            </div>
          </div>
        </section>
        {formError && (
          <p role="alert" className="text-error text-sm">
            {formError}
          </p>
        )}
      </form>

      <section
        id="access-management"
        aria-labelledby="edit-employee-access-title"
        className="bg-surface mt-6 rounded-ui border border-neutral-bg p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="edit-employee-access-title"
            className="text-foreground text-lg font-bold"
          >
            Acesso ao sistema
          </h2>
          {accessStatus ? (
            <StatusBadge variant={accessStatus.variant}>
              {accessStatus.label}
            </StatusBadge>
          ) : (
            <StatusBadge variant="neutral">Sem acesso</StatusBadge>
          )}
        </div>
        {accessCreationMessage && (
          <p role="alert" className="text-error mt-4 text-sm">
            {accessCreationMessage}
          </p>
        )}

        {employee.access ? (
          <>
            <form
              noValidate
              className="mt-4"
              onSubmit={handleSubmitAccessUpdate(onUpdateAccess)}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employee-login-email">E-mail de login</Label>
                  <Input
                    id="employee-login-email"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="username"
                    aria-invalid={Boolean(accessUpdateErrors.loginEmail)}
                    aria-required="true"
                    aria-describedby={
                      accessUpdateErrors.loginEmail || accessLoginEmailError
                        ? 'employee-login-email-error'
                        : undefined
                    }
                    disabled={accessLoginEmailMutation.isPending}
                    {...registerAccessUpdate('loginEmail')}
                  />
                  {accessUpdateErrors.loginEmail?.message && (
                    <p
                      id="employee-login-email-error"
                      className="text-error text-sm"
                    >
                      {accessUpdateErrors.loginEmail.message}
                    </p>
                  )}
                  {accessLoginEmailError && (
                    <p
                      id="employee-login-email-error"
                      role="alert"
                      className="text-error text-sm"
                    >
                      {accessLoginEmailError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-profile">Perfil</Label>
                  <Select
                    id="employee-profile"
                    value={employee.access.profile}
                    disabled={accessProfileMutation.isPending}
                    aria-invalid={Boolean(accessProfileError)}
                    aria-required="true"
                    aria-describedby={
                      accessProfileError
                        ? 'employee-access-profile-error'
                        : undefined
                    }
                    onChange={(event) => {
                      const profile = event.target
                        .value as EmployeeAccessProfile

                      void handleAccessProfileChange(profile)
                    }}
                  >
                    <option value="employee">Funcionário</option>
                    <option value="administrator">Administrador</option>
                  </Select>
                  {accessProfileMutation.isPending && (
                    <p className="text-neutral text-sm">
                      Atualizando perfil...
                    </p>
                  )}
                  {accessProfileError && (
                    <p
                      id="employee-access-profile-error"
                      role="alert"
                      className="text-error text-sm"
                    >
                      {accessProfileError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-access-status">
                    Situação da conta
                  </Label>
                  <Select
                    id="employee-access-status"
                    value={currentEmployeeAccessStatus ?? 'inactive'}
                    disabled={
                      !accessStatusAvailability.canChangeAccessStatus ||
                      accessStatusMutation.isPending
                    }
                    aria-invalid={Boolean(accessStatusError)}
                    aria-required="true"
                    aria-describedby={
                      employeeAccessStatusDescriptionIds || undefined
                    }
                    onChange={(event) => {
                      const status = event.target.value as EmployeeAccessStatus

                      void handleAccessStatusChange(status)
                    }}
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                  </Select>
                  {accessStatusMutation.isPending && (
                    <p className="text-neutral text-sm">
                      Atualizando situação da conta...
                    </p>
                  )}
                  {accessStatusError && (
                    <p
                      id="employee-access-status-error"
                      role="alert"
                      className="text-error text-sm"
                    >
                      {accessStatusError}
                    </p>
                  )}
                  {accessStatusAvailability.description && (
                    <p
                      id="employee-access-status-description"
                      className="text-neutral text-sm"
                    >
                      {accessStatusAvailability.description}
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="mt-4"
                type="submit"
                disabled={accessLoginEmailMutation.isPending}
              >
                {accessLoginEmailMutation.isPending
                  ? 'Salvando e-mail...'
                  : 'Salvar e-mail de login'}
              </Button>
            </form>

            <form
              noValidate
              className="mt-8 border-t border-neutral-bg pt-6"
              onSubmit={handleSubmitAccessPasswordReset(onResetAccessPassword)}
            >
              <h3 className="text-foreground font-bold">
                Redefinição de senha
              </h3>
              <p className="text-neutral mt-1 text-sm">
                Defina uma senha temporária. O usuário deverá alterá-la no
                próximo acesso.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employee-temporary-password">
                    Nova senha temporária
                  </Label>
                  <Input
                    id="employee-temporary-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(
                      accessPasswordResetErrors.temporaryPassword,
                    )}
                    aria-required="true"
                    aria-describedby={
                      accessPasswordResetErrors.temporaryPassword
                        ? 'employee-temporary-password-error'
                        : undefined
                    }
                    disabled={accessPasswordResetMutation.isPending}
                    {...registerAccessPasswordReset('temporaryPassword')}
                  />
                  {accessPasswordResetErrors.temporaryPassword?.message && (
                    <p
                      id="employee-temporary-password-error"
                      className="text-error text-sm"
                    >
                      {accessPasswordResetErrors.temporaryPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-temporary-password-confirmation">
                    Confirmação da senha temporária
                  </Label>
                  <Input
                    id="employee-temporary-password-confirmation"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(
                      accessPasswordResetErrors.confirmPassword,
                    )}
                    aria-required="true"
                    aria-describedby={
                      accessPasswordResetErrors.confirmPassword
                        ? 'employee-temporary-password-confirmation-error'
                        : undefined
                    }
                    disabled={accessPasswordResetMutation.isPending}
                    {...registerAccessPasswordReset('confirmPassword')}
                  />
                  {accessPasswordResetErrors.confirmPassword?.message && (
                    <p
                      id="employee-temporary-password-confirmation-error"
                      className="text-error text-sm"
                    >
                      {accessPasswordResetErrors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {accessPasswordResetError && (
                <p role="alert" className="text-error mt-4 text-sm">
                  {accessPasswordResetError}
                </p>
              )}

              <Button
                className="mt-4"
                type="submit"
                disabled={accessPasswordResetMutation.isPending}
              >
                {accessPasswordResetMutation.isPending
                  ? 'Redefinindo senha...'
                  : 'Redefinir senha temporária'}
              </Button>
            </form>
          </>
        ) : (
          <form
            noValidate
            className="mt-4"
            onSubmit={handleSubmitAccessCreation(onCreateAccess)}
          >
            <p className="text-neutral mt-2">
              Este funcionário ainda não possui uma conta de acesso.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee-login-email">E-mail de login</Label>
                <Input
                  id="employee-login-email"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="username"
                  aria-invalid={Boolean(accessCreationErrors.loginEmail)}
                  aria-required="true"
                  aria-describedby={
                    accessCreationErrors.loginEmail
                      ? 'employee-login-email-error'
                      : undefined
                  }
                  {...registerAccessCreation('loginEmail')}
                />
                {accessCreationErrors.loginEmail?.message && (
                  <p
                    id="employee-login-email-error"
                    className="text-error text-sm"
                  >
                    {accessCreationErrors.loginEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-profile">Perfil</Label>
                <Select
                  id="employee-profile"
                  aria-invalid={Boolean(accessCreationErrors.profile)}
                  aria-required="true"
                  aria-describedby={
                    accessCreationErrors.profile
                      ? 'employee-profile-error'
                      : undefined
                  }
                  {...registerAccessCreation('profile')}
                >
                  <option value="employee">Funcionário</option>
                  <option value="administrator">Administrador</option>
                </Select>
                {accessCreationErrors.profile?.message && (
                  <p id="employee-profile-error" className="text-error text-sm">
                    {accessCreationErrors.profile.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-initial-password">Senha inicial</Label>
                <Input
                  id="employee-initial-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(accessCreationErrors.initialPassword)}
                  aria-required="true"
                  aria-describedby={
                    accessCreationErrors.initialPassword
                      ? 'employee-initial-password-error'
                      : undefined
                  }
                  {...registerAccessCreation('initialPassword')}
                />
                {accessCreationErrors.initialPassword?.message && (
                  <p
                    id="employee-initial-password-error"
                    className="text-error text-sm"
                  >
                    {accessCreationErrors.initialPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-confirm-password">
                  Confirmação da senha
                </Label>
                <Input
                  id="employee-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(accessCreationErrors.confirmPassword)}
                  aria-required="true"
                  aria-describedby={
                    accessCreationErrors.confirmPassword
                      ? 'employee-confirm-password-error'
                      : undefined
                  }
                  {...registerAccessCreation('confirmPassword')}
                />
                {accessCreationErrors.confirmPassword?.message && (
                  <p
                    id="employee-confirm-password-error"
                    className="text-error text-sm"
                  >
                    {accessCreationErrors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              className="mt-4"
              type="submit"
              disabled={createAccessMutation.isPending}
            >
              {createAccessMutation.isPending
                ? 'Criando acesso...'
                : 'Criar acesso'}
            </Button>
          </form>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button
          form="employee-details-form"
          type="submit"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending
            ? 'Salvando alterações...'
            : 'Salvar alterações'}
        </Button>
        <Link
          to={`/employees/${employee.id}`}
          className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Cancelar
        </Link>
      </div>
      {confirmationDialog}
    </AppLayout>
  )
}

export { EmployeeEditPage }
