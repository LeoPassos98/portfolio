import { useSearchParams } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'

function OrdersPage() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'todos'

  return (
    <AppLayout>
      <h1>Ordens de Serviço</h1>
      <p>Filtro atual: {status}</p>
    </AppLayout>
  )
}

export { OrdersPage }
