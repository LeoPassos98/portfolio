import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockEmployees } from '../mocks/employees'
import type { EmployeeStatus } from '../types/employee'

const employeeStatuses: readonly EmployeeStatus[] = ['active', 'inactive']

const accessProfileLabels = {
  administrator: 'Administrador',
  employee: 'Funcionário',
} as const

function isEmployeeStatus(value: string | null): value is EmployeeStatus {
  return value !== null && employeeStatuses.some((status) => status === value)
}

function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = isEmployeeStatus(statusParam) ? statusParam : 'active'
  const search = searchParams.get('search') ?? ''
  const employeesByStatus =
    statusParam === 'all'
      ? mockEmployees
      : mockEmployees.filter((employee) => employee.status === status)
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const normalizedPhoneSearch = search.replaceAll(/\D/g, '')
  const visibleEmployees = normalizedSearch
    ? employeesByStatus.filter(
        (employee) =>
          [employee.name, employee.contactEmail].some((value) =>
            value.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
          ) ||
          (normalizedPhoneSearch !== '' &&
            employee.phone.replaceAll(/\D/g, '').includes(normalizedPhoneSearch)),
      )
    : employeesByStatus
  const hasActiveFilters = statusParam === 'inactive' || search.trim() !== ''

  function clearFilters() {
    setSearchParams({})
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-foreground text-2xl font-bold">
          Funcionários
        </h1>
        <Link
          to="/employees/new"
          className="bg-primary inline-flex rounded-ui px-4 py-2 text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Novo funcionário
        </Link>
      </div>

      <div className="mt-6 max-w-xs space-y-2">
        <Label htmlFor="employee-status">Status</Label>
        <Select
          id="employee-status"
          value={status}
          onChange={(event) => {
            const nextSearchParams = new URLSearchParams(searchParams)

            if (event.target.value === 'active') {
              nextSearchParams.delete('status')
            } else {
              nextSearchParams.set('status', event.target.value)
            }

            setSearchParams(nextSearchParams)
          }}
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </Select>
      </div>

      <div className="mt-4 max-w-md space-y-2">
        <Label htmlFor="employee-search">Buscar</Label>
        <Input
          id="employee-search"
          type="search"
          value={search}
          placeholder="Nome, telefone ou e-mail"
          onChange={(event) => {
            const nextSearchParams = new URLSearchParams(searchParams)

            if (event.target.value.trim() === '') {
              nextSearchParams.delete('search')
            } else {
              nextSearchParams.set('search', event.target.value)
            }

            setSearchParams(nextSearchParams)
          }}
        />
      </div>

      {visibleEmployees.length === 0 && (
        <div className="mt-8 space-y-4">
          <EmptyState
            title={
              hasActiveFilters
                ? 'Nenhum funcionário encontrado'
                : 'Nenhum funcionário cadastrado'
            }
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou os filtros.'
                : 'Cadastre um funcionário para começar a organizar a equipe.'
            }
          />
          {hasActiveFilters && (
            <div className="flex justify-center">
              <Button type="button" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      )}

      {visibleEmployees.length > 0 && (
        <ul className="mt-8 space-y-4 md:hidden">
          {visibleEmployees.map((employee) => (
            <li
              key={employee.id}
              className="bg-surface rounded-ui border border-neutral-bg p-4"
            >
              <Link
                to={`/employees/${employee.id}`}
                className="text-primary font-medium hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {employee.name}
              </Link>

              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-neutral text-xs">Contato</dt>
                  <dd className="text-foreground mt-1">{employee.phone}</dd>
                  <dd className="text-foreground mt-1 break-words">
                    {employee.contactEmail}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral text-xs">Situação do funcionário</dt>
                  <dd className="mt-1">
                    <StatusBadge
                      variant={
                        employee.status === 'active' ? 'success' : 'neutral'
                      }
                    >
                      {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral text-xs">Conta de acesso</dt>
                  <dd className="mt-1">
                    {employee.access ? (
                      <StatusBadge
                        variant={
                          employee.access.status === 'active'
                            ? 'success'
                            : 'neutral'
                        }
                      >
                        {employee.access.status === 'active'
                          ? 'Ativa'
                          : 'Inativa'}
                      </StatusBadge>
                    ) : (
                      <span className="text-foreground font-medium">
                        Sem acesso
                      </span>
                    )}
                  </dd>
                </div>
                {employee.access && (
                  <div>
                    <dt className="text-neutral text-xs">Perfil da conta</dt>
                    <dd className="text-foreground mt-1">
                      {accessProfileLabels[employee.access.profile]}
                    </dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}

      {visibleEmployees.length > 0 && (
        <div className="mt-8 hidden overflow-hidden rounded-ui border border-neutral-bg md:block">
          <table className="w-full text-left">
            <caption className="sr-only">Lista de funcionários</caption>
            <thead className="bg-neutral-bg text-neutral text-sm">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
                  Funcionário
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Contato
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Situação
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Conta de acesso
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Perfil da conta
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-neutral-bg">
              {visibleEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-4 py-3">
                    <Link
                      to={`/employees/${employee.id}`}
                      className="text-primary font-medium hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {employee.name}
                    </Link>
                  </td>
                  <td className="text-neutral px-4 py-3">
                    <p>{employee.phone}</p>
                    <p className="mt-1 break-words">{employee.contactEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={
                        employee.status === 'active' ? 'success' : 'neutral'
                      }
                    >
                      {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {employee.access ? (
                      <StatusBadge
                        variant={
                          employee.access.status === 'active'
                            ? 'success'
                            : 'neutral'
                        }
                      >
                        {employee.access.status === 'active'
                          ? 'Ativa'
                          : 'Inativa'}
                      </StatusBadge>
                    ) : (
                      <span className="text-neutral">Sem acesso</span>
                    )}
                  </td>
                  <td className="text-neutral px-4 py-3">
                    {employee.access
                      ? accessProfileLabels[employee.access.profile]
                      : 'Não aplicável'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  )
}

export { EmployeesPage }
