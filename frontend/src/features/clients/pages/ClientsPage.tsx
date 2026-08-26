import { Link, useSearchParams } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'

const mockClient = {
  id: 'client-1',
  name: 'Mariana Costa',
  status: 'active',
} as const

function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'active'
  const isMockClientVisible = status === mockClient.status || status === 'all'

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1>Clientes</h1>
        <Link
          to="/clients/new"
          className="bg-primary inline-flex rounded-ui px-4 py-2 text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Novo cliente
        </Link>
      </div>

      <div className="mt-6 max-w-xs space-y-2">
        <Label htmlFor="client-status">Status</Label>
        <Select
          id="client-status"
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

      {isMockClientVisible && (
        <ul className="mt-8">
          <li className="bg-surface flex flex-col gap-4 rounded-ui border border-neutral-bg p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-foreground font-medium">{mockClient.name}</p>
              <div className="mt-2">
                <StatusBadge variant="success">Ativo</StatusBadge>
              </div>
            </div>

            <Link
              to={`/clients/${mockClient.id}/edit`}
              className="text-primary inline-flex rounded-ui px-4 py-2 font-medium hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Editar
            </Link>
          </li>
        </ul>
      )}
    </AppLayout>
  )
}

export { ClientsPage }
