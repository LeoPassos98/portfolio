import { useSearchParams } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'

function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'all'

  return (
    <AppLayout>
      <h1>Clientes</h1>

      <div className="mt-6 max-w-xs space-y-2">
        <Label htmlFor="client-status">Status</Label>
        <Select
          id="client-status"
          value={status}
          onChange={(event) => {
            const nextSearchParams = new URLSearchParams(searchParams)

            if (event.target.value === 'all') {
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
    </AppLayout>
  )
}

export { ClientsPage }
