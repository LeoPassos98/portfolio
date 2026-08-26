import { Link, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { EmployeePerformancePanel } from '../../dashboard/components/EmployeePerformancePanel'
import { mockEmployees } from '../mocks/employees'

const employeeStatusDetails = {
  active: { label: 'Ativo', variant: 'success' },
  inactive: { label: 'Inativo', variant: 'neutral' },
} as const

const accessStatusDetails = {
  active: { label: 'Ativa', variant: 'success' },
  inactive: { label: 'Inativa', variant: 'neutral' },
} as const

const accessProfileLabels = {
  administrator: 'Administrador',
  employee: 'Funcionário',
} as const

function EmployeeProfilePage() {
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
            description="Não foi possível localizar o funcionário solicitado."
          />
        </div>
      </AppLayout>
    )
  }

  const employeeStatus = employeeStatusDetails[employee.status]
  const accessStatus = employee.access
    ? accessStatusDetails[employee.access.status]
    : null

  return (
    <AppLayout>
      <Link
        to="/employees"
        className="text-primary inline-flex rounded-ui hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Voltar para Funcionários
      </Link>

      <header className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-foreground text-2xl font-bold">
              {employee.name}
            </h1>
            <StatusBadge variant={employeeStatus.variant}>
              {employeeStatus.label}
            </StatusBadge>
          </div>
          <p className="text-neutral mt-1">Perfil do funcionário</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={`/employees/${employee.id}/edit`}
            className="bg-primary inline-flex justify-center rounded-ui px-4 py-2 text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Editar funcionário
          </Link>
          <Link
            to={`/employees/${employee.id}/edit#access-management`}
            className="text-primary inline-flex justify-center rounded-ui border border-primary px-4 py-2 font-medium hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Gerenciar acesso
          </Link>
        </div>
      </header>

      <section
        aria-labelledby="employee-administrative-context-title"
        className="bg-surface mt-6 rounded-ui border border-neutral-bg p-4 sm:p-6"
      >
        <h2
          id="employee-administrative-context-title"
          className="text-foreground text-lg font-bold"
        >
          Contexto administrativo
        </h2>

        <dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-neutral text-sm">Telefone</dt>
            <dd className="text-foreground mt-1 font-medium">
              {employee.phone}
            </dd>
          </div>
          <div>
            <dt className="text-neutral text-sm">E-mail de contato</dt>
            <dd className="text-foreground mt-1 break-words font-medium">
              {employee.contactEmail}
            </dd>
          </div>
          <div>
            <dt className="text-neutral text-sm">Situação do funcionário</dt>
            <dd className="mt-2">
              <StatusBadge variant={employeeStatus.variant}>
                {employeeStatus.label}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt className="text-neutral text-sm">Conta de acesso</dt>
            <dd className="mt-2">
              {accessStatus ? (
                <StatusBadge variant={accessStatus.variant}>
                  {accessStatus.label}
                </StatusBadge>
              ) : (
                <span className="text-foreground font-medium">Sem acesso</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-neutral text-sm">Perfil da conta</dt>
            <dd className="text-foreground mt-1 font-medium">
              {employee.access
                ? accessProfileLabels[employee.access.profile]
                : 'Não aplicável'}
            </dd>
          </div>
        </dl>
      </section>

      {/* No protótipo, employeeId define o funcionário analisado; futuramente os dados virão da API. */}
      <EmployeePerformancePanel
        employeeId={employee.id}
        context="administrative"
      />
    </AppLayout>
  )
}

export { EmployeeProfilePage }
