import { Link, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { mockOrders } from '../mocks/orders'

function OrderEditPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const order = mockOrders.find((item) => item.id === orderId)

  if (!order) {
    return (
      <AppLayout>
        <EmptyState
          title="Ordem não encontrada"
          description="Não foi possível localizar a ordem solicitada."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Editar {order.number}
      </h1>

      <div className="bg-surface mt-6 rounded-ui border border-neutral-bg p-6">
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-neutral text-sm">Número da ordem</dt>
            <dd className="text-foreground mt-1 font-medium">
              {order.number}
            </dd>
          </div>
          <div>
            <dt className="text-neutral text-sm">Cliente</dt>
            <dd className="text-foreground mt-1 font-medium">
              {order.clientName}
            </dd>
          </div>
        </dl>

        <form className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="order-responsible">Responsável</Label>
            <Select
              id="order-responsible"
              name="responsibleName"
              defaultValue={order.responsibleName}
            >
              <option value="Carlos Lima">Carlos Lima</option>
              <option value="Ana Souza">Ana Souza</option>
              <option value="Beatriz Alves">Beatriz Alves</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-status">Status</Label>
            <Select
              id="order-status"
              name="status"
              defaultValue={order.status}
            >
              <option value="awaiting">Aguardando</option>
              <option value="in-progress">Em andamento</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button">Salvar alterações</Button>
            <Link
              to={`/orders/${order.id}`}
              className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}

export { OrderEditPage }
