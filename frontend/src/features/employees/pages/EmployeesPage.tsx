import { useSearchParams } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'

function EmployeesPage() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'todos'

  return (
    <AppLayout>
      <h1>Funcionários</h1>
      <p>Filtro atual: {status}</p>
    </AppLayout>
  )
}

export { EmployeesPage }
