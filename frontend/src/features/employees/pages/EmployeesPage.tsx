import { Link, useSearchParams } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockEmployees } from '../mocks/employees'

function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'active'
  const visibleEmployees =
    status === 'all'
      ? mockEmployees
      : mockEmployees.filter((employee) => employee.status === status)

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1>Funcionários</h1>
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
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </Select>
      </div>

      {visibleEmployees.length > 0 && (
        <ul className="mt-8">
          {visibleEmployees.map((employee) => (
            <li
              key={employee.id}
              className="bg-surface flex flex-col gap-4 rounded-ui border border-neutral-bg p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-foreground font-medium">{employee.name}</p>
                <div className="mt-2">
                  <StatusBadge
                    variant={employee.status === 'active' ? 'success' : 'neutral'}
                  >
                    {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                  </StatusBadge>
                </div>
              </div>

              <Link
                to={`/employees/${employee.id}`}
                className="text-primary inline-flex rounded-ui px-4 py-2 font-medium hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Ver perfil
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  )
}

export { EmployeesPage }
