import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import { EmployeePerformancePanel } from '../../dashboard/components/EmployeePerformancePanel'
import { isAxiosError } from 'axios'
import { employeesQueryKeys } from '../api/employeeQueryKeys'
import {
  getEmployee,
  type EmployeeHttpErrorResponse,
} from '../api/employeesApi'

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

function isEmployeeApiError(
  error: unknown,
  code: EmployeeHttpErrorResponse['code'],
) {
  return (
    isAxiosError<HttpErrorResponse>(error) && error.response?.data.code === code
  )
}

function EmployeeProfileSkeleton() {
  return (
    <AppLayout>
      <div className="animate-pulse" aria-label="Carregando funcionário">
        <div className="h-5 w-48 rounded bg-neutral-bg" />
        <div className="mt-6 h-8 w-64 rounded bg-neutral-bg" />
        <div className="mt-3 h-5 w-40 rounded bg-neutral-bg" />
        <div className="bg-surface mt-6 rounded-ui border border-neutral-bg p-4 sm:p-6">
          <div className="h-6 w-56 rounded bg-neutral-bg" />
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item}>
                <div className="h-4 w-32 rounded bg-neutral-bg" />
                <div className="mt-2 h-5 w-44 rounded bg-neutral-bg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function EmployeeProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>()
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
            description="Não foi possível localizar o funcionário solicitado."
          />
        </div>
      </AppLayout>
    )
  }

  if (isPending) {
    return <EmployeeProfileSkeleton />
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

      {/* O painel de desempenho permanece mockado nesta etapa. */}
      <EmployeePerformancePanel
        employeeId={employee.id}
        context="administrative"
      />
    </AppLayout>
  )
}

export { EmployeeProfilePage }
