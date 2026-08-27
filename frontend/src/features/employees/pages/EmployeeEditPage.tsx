import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockEmployees } from '../mocks/employees'
import {
  employeeSchema,
  type EmployeeFormData,
  type EmployeeFormValues,
} from '../schemas/employeeSchema'

const accessStatusDetails = {
  active: { label: 'Ativa', variant: 'success' },
  inactive: { label: 'Inativa', variant: 'neutral' },
} as const

function EmployeeEditPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const employee = mockEmployees.find((item) => item.id === employeeId)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormData, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name ?? '',
      phone: employee?.phone ?? '',
      contactEmail: employee?.contactEmail ?? '',
      status: employee?.status ?? 'active',
    },
  })

  function onSubmit() {
    if (employee) {
      navigate(`/employees/${employee.id}`)
    }
  }

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

  const accessStatus = employee.access
    ? accessStatusDetails[employee.access.status]
    : null

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Editar funcionário
      </h1>
      <p className="text-neutral mt-1">{employee.name}</p>

      <form
        noValidate
        className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6"
        onSubmit={handleSubmit(onSubmit)}
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
                aria-invalid={Boolean(errors.name)}
                aria-required="true"
                aria-describedby={
                  errors.name ? 'edit-employee-name-error' : undefined
                }
                {...register('name')}
              />
              {errors.name?.message && (
                <p id="edit-employee-name-error" className="text-error text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-status">
                Situação do funcionário
              </Label>
              <Select
                id="edit-employee-status"
                aria-invalid={Boolean(errors.status)}
                aria-required="true"
                aria-describedby={
                  errors.status ? 'edit-employee-status-error' : undefined
                }
                {...register('status')}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
              {errors.status?.message && (
                <p
                  id="edit-employee-status-error"
                  className="text-error text-sm"
                >
                  {errors.status.message}
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
                aria-invalid={Boolean(errors.phone)}
                aria-required="true"
                aria-describedby={
                  errors.phone ? 'edit-employee-phone-error' : undefined
                }
                {...register('phone')}
              />
              {errors.phone?.message && (
                <p id="edit-employee-phone-error" className="text-error text-sm">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-email">E-mail de contato</Label>
              <Input
                id="edit-employee-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.contactEmail)}
                aria-required="true"
                aria-describedby={
                  errors.contactEmail ? 'edit-employee-email-error' : undefined
                }
                {...register('contactEmail')}
              />
              {errors.contactEmail?.message && (
                <p id="edit-employee-email-error" className="text-error text-sm">
                  {errors.contactEmail.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section
          id="access-management"
          aria-labelledby="edit-employee-access-title"
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
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee-login-email">E-mail de login</Label>
                <Input
                  id="employee-login-email"
                  name="loginEmail"
                  type="email"
                  defaultValue={employee.access.loginEmail}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-profile">Perfil</Label>
                <Select
                  id="employee-profile"
                  name="profile"
                  defaultValue={employee.access.profile}
                >
                  <option value="employee">Funcionário</option>
                  <option value="administrator">Administrador</option>
                </Select>
              </div>
            </div>
          ) : (
            <>
              <p className="text-neutral mt-2">
                Este funcionário ainda não possui uma conta de acesso.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employee-login-email">E-mail de login</Label>
                  <Input
                    id="employee-login-email"
                    name="loginEmail"
                    type="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-profile">Perfil</Label>
                  <Select id="employee-profile" name="profile">
                    <option value="employee">Funcionário</option>
                    <option value="administrator">Administrador</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-initial-password">
                    Senha inicial
                  </Label>
                  <Input
                    id="employee-initial-password"
                    name="initialPassword"
                    type="password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-confirm-password">
                    Confirmação da senha
                  </Label>
                  <Input
                    id="employee-confirm-password"
                    name="confirmPassword"
                    type="password"
                  />
                </div>
              </div>

              <Button className="mt-4" type="button">
                Criar acesso
              </Button>
            </>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Salvar alterações</Button>
          <Link
            to={`/employees/${employee.id}`}
            className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </AppLayout>
  )
}

export { EmployeeEditPage }
