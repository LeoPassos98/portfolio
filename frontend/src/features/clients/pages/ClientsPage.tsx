import { useSearchParams } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'

function ClientsPage() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'todos'

  return (
    <AppLayout>
      <h1>Clientes</h1>
      <p>Filtro atual: {status}</p>
    </AppLayout>
  )
}

export { ClientsPage }
