import { AppLayout } from '../../../components/layout/AppLayout'
import { OrderForm } from '../components/OrderForm'

function OrderCreatePage() {
  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Nova ordem de serviço
      </h1>

      <OrderForm />
    </AppLayout>
  )
}

export { OrderCreatePage }
