import { Link, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockEmployees } from '../mocks/employees'

const accessStatusDetails = {
  active: { label: 'Ativa', variant: 'success' },
  inactive: { label: 'Inativa', variant: 'neutral' },
} as const

function EmployeeEditPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const employee = mockEmployees.find((item) => item.id === employeeId)

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

      <form className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6">
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
                name="name"
                defaultValue={employee.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-status">
                Situação do funcionário
              </Label>
              <Select
                id="edit-employee-status"
                name="status"
                defaultValue={employee.status}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
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
                name="phone"
                type="tel"
                defaultValue={employee.phone}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-email">E-mail de contato</Label>
              <Input
                id="edit-employee-email"
                name="email"
                type="email"
                defaultValue={employee.contactEmail}
              />
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
          <Button type="button">Salvar alterações</Button>
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
