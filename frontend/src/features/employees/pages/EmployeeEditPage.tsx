import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockOrders } from '../../orders/mocks/orders'
import {
  getEmployeeAccessStatus,
  getEmployeeAccessStatusAvailability,
} from '../lib/employeeAccessStatus'
import { getEmployeeStatusChangeAvailability } from '../lib/employeeStatus'
import { mockEmployees } from '../mocks/employees'
import type { EmployeeAccessStatus } from '../types/employee'
import {
  employeeSchema,
  type EmployeeFormData,
  type EmployeeFormValues,
} from '../schemas/employeeSchema'
import {
  employeeAccessCreationSchema,
  employeeAccessUpdateSchema,
  type EmployeeAccessCreationFormData,
  type EmployeeAccessCreationFormValues,
  type EmployeeAccessUpdateFormData,
  type EmployeeAccessUpdateFormValues,
} from '../schemas/employeeAccessSchema'

const accessStatusDetails = {
  active: { label: 'Ativa', variant: 'success' },
  inactive: { label: 'Inativa', variant: 'neutral' },
} as const

function EmployeeEditPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const employee = mockEmployees.find((item) => item.id === employeeId)
  const {
    register: registerEmployee,
    handleSubmit: handleSubmitEmployee,
    setValue: setEmployeeValue,
    formState: { errors: employeeErrors },
  } = useForm<EmployeeFormData, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name ?? '',
      phone: employee?.phone ?? '',
      contactEmail: employee?.contactEmail ?? '',
      status: employee?.status ?? 'active',
    },
  })
  const {
    register: registerAccessCreation,
    handleSubmit: handleSubmitAccessCreation,
    formState: { errors: accessCreationErrors },
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
  const [employeeStatus, setEmployeeStatus] = useState(
    employee?.status ?? 'active',
  )
  const [employeeAccessStatus, setEmployeeAccessStatus] =
    useState<EmployeeAccessStatus | null>(() =>
      getEmployeeAccessStatus(
        employee?.status ?? 'active',
        employee?.access?.status ?? null,
      ),
    )
  const {
    register: registerAccessUpdate,
    handleSubmit: handleSubmitAccessUpdate,
    setValue: setAccessUpdateValue,
    formState: { errors: accessUpdateErrors },
  } = useForm<
    EmployeeAccessUpdateFormData,
    unknown,
    EmployeeAccessUpdateFormValues
  >({
    resolver: zodResolver(employeeAccessUpdateSchema),
    defaultValues: {
      loginEmail: employee?.access?.loginEmail ?? '',
      profile: employee?.access?.profile ?? 'employee',
      status:
        getEmployeeAccessStatus(
          employee?.status ?? 'active',
          employee?.access?.status ?? null,
        ) ?? 'inactive',
    },
  })

  function onSubmit() {
    if (employee) {
      navigate(`/employees/${employee.id}`)
    }
  }

  function onCreateAccess() {}

  function onUpdateAccess() {}

  if (!employee) {
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

  const currentEmployeeAccessStatus = getEmployeeAccessStatus(
    employeeStatus,
    employeeAccessStatus,
  )
  const accessStatus = currentEmployeeAccessStatus
    ? accessStatusDetails[currentEmployeeAccessStatus]
    : null
  const accessStatusAvailability = getEmployeeAccessStatusAvailability(
    employeeStatus,
    currentEmployeeAccessStatus,
  )
  const statusChangeAvailability = getEmployeeStatusChangeAvailability(
    employee,
    mockOrders,
  )
  const employeeStatusDescriptionIds = [
    employeeErrors.status ? 'edit-employee-status-error' : null,
    statusChangeAvailability.description
      ? 'edit-employee-status-description'
      : null,
  ]
    .filter(Boolean)
    .join(' ')
  const employeeAccessStatusDescriptionIds = [
    accessUpdateErrors.status ? 'employee-access-status-error' : null,
    accessStatusAvailability.description
      ? 'employee-access-status-description'
      : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Editar funcionário
      </h1>
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
              <input type="hidden" {...registerEmployee('status')} />
              <Select
                id="edit-employee-status"
                value={employeeStatus}
                disabled={!statusChangeAvailability.canChangeStatus}
                aria-invalid={Boolean(employeeErrors.status)}
                aria-required="true"
                aria-describedby={employeeStatusDescriptionIds || undefined}
                onChange={(event) => {
                  const status = event.target.value as EmployeeFormData['status']
                  const nextAccessStatus = getEmployeeAccessStatus(
                    status,
                    employeeAccessStatus,
                  )

                  setEmployeeStatus(status)
                  setEmployeeAccessStatus(nextAccessStatus)
                  if (nextAccessStatus) {
                    setAccessUpdateValue('status', nextAccessStatus, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  setEmployeeValue(
                    'status',
                    status,
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  )
                }}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
              {employeeErrors.status?.message && (
                <p
                  id="edit-employee-status-error"
                  className="text-error text-sm"
                >
                  {employeeErrors.status.message}
                </p>
              )}
              {statusChangeAvailability.description && (
                <p
                  id="edit-employee-status-description"
                  className="text-neutral text-sm"
                >
                  {statusChangeAvailability.description}
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
                <p id="edit-employee-phone-error" className="text-error text-sm">
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
                <p id="edit-employee-email-error" className="text-error text-sm">
                  {employeeErrors.contactEmail.message}
                </p>
              )}
            </div>
          </div>
        </section>
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

          {employee.access ? (
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
                      accessUpdateErrors.loginEmail
                        ? 'employee-login-email-error'
                        : undefined
                    }
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-profile">Perfil</Label>
                  <Select
                    id="employee-profile"
                    aria-invalid={Boolean(accessUpdateErrors.profile)}
                    aria-required="true"
                    aria-describedby={
                      accessUpdateErrors.profile
                        ? 'employee-profile-error'
                        : undefined
                    }
                    {...registerAccessUpdate('profile')}
                  >
                    <option value="employee">Funcionário</option>
                    <option value="administrator">Administrador</option>
                  </Select>
                  {accessUpdateErrors.profile?.message && (
                    <p id="employee-profile-error" className="text-error text-sm">
                      {accessUpdateErrors.profile.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-access-status">
                    Situação da conta
                  </Label>
                  <input type="hidden" {...registerAccessUpdate('status')} />
                  <Select
                    id="employee-access-status"
                    value={currentEmployeeAccessStatus ?? 'inactive'}
                    disabled={!accessStatusAvailability.canChangeAccessStatus}
                    aria-invalid={Boolean(accessUpdateErrors.status)}
                    aria-required="true"
                    aria-describedby={
                      employeeAccessStatusDescriptionIds || undefined
                    }
                    onChange={(event) => {
                      const status = event.target
                        .value as EmployeeAccessStatus

                      setEmployeeAccessStatus(status)
                      setAccessUpdateValue('status', status, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                  </Select>
                  {accessUpdateErrors.status?.message && (
                    <p
                      id="employee-access-status-error"
                      className="text-error text-sm"
                    >
                      {accessUpdateErrors.status.message}
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

              <Button className="mt-4" type="submit">
                Salvar acesso
              </Button>
            </form>
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
                  <Label htmlFor="employee-initial-password">
                    Senha inicial
                  </Label>
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

              <Button className="mt-4" type="submit">
                Criar acesso
              </Button>
            </form>
          )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button form="employee-details-form" type="submit">
          Salvar alterações
        </Button>
        <Link
          to={`/employees/${employee.id}`}
          className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Cancelar
        </Link>
      </div>
    </AppLayout>
  )
}

export { EmployeeEditPage }
