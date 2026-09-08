import { Link, Navigate, useLocation, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { mockClients } from '../../clients/mocks/clients'
import { mockEmployees } from '../../employees/mocks/employees'
import { OrderForm } from '../components/OrderForm'
import {
  canViewOrder,
  getAllowedOrderReopenStatuses,
  getOrderEditPermissions,
} from '../lib/orderVisibility'
import { mockOrders } from '../mocks/orders'
import type { OrderStatus } from '../types/order'

type ReopenOrderLocationState = {
  reopenedStatus?: OrderStatus
}

const activeClients = mockClients.filter((client) => client.status === 'active')
const activeEmployees = mockEmployees.filter(
  (employee) => employee.status === 'active',
)
const editClientOptions = activeClients.map((client) => ({
  label: client.name,
  searchTerms: client.document ? [client.document] : [],
  value: client.id,
}))
const editEmployeeOptions = activeEmployees.map((employee) => ({
  label: employee.name,
  searchTerms: [employee.contactEmail, employee.phone],
  value: employee.id,
}))

function OrderEditPage() {
  const session = useAuthSession()
  const location = useLocation()
  const { orderId } = useParams<{ orderId: string }>()
  const order = mockOrders.find((item) => item.id === orderId)
  const hasOrderAccess =
    order !== undefined &&
    session !== null &&
    canViewOrder(order, session.currentUser)

  if (!hasOrderAccess) {
    return (
      <AppLayout>
        <Link
          to="/orders"
          className="text-primary inline-flex rounded-ui hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Voltar para Ordens
        </Link>
        <div className="mt-6">
          <EmptyState
            title="Ordem não encontrada ou sem acesso"
            description="Não foi possível localizar a ordem solicitada ou ela não está acessível para você."
          />
        </div>
      </AppLayout>
    )
  }

  const reopenLocationState = location.state as ReopenOrderLocationState | null
  const allowedReopenStatuses = getAllowedOrderReopenStatuses(
    order,
    session.currentUser,
  )
  const reopenedStatus = reopenLocationState?.reopenedStatus
  const editableOrder =
    reopenedStatus !== undefined &&
    allowedReopenStatuses.includes(reopenedStatus)
      ? { ...order, status: reopenedStatus }
      : order
  const editPermissions = getOrderEditPermissions(
    editableOrder,
    session.currentUser,
  )

  if (!editPermissions.canEdit) {
    return <Navigate to={`/orders/${order.id}`} replace />
  }

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Editar {editableOrder.number}
      </h1>
      <OrderForm
        order={editableOrder}
        editPermissions={editPermissions}
        editing={{
          clientIds: activeClients.map((client) => client.id),
          clientOptions: editClientOptions,
          employeeOptions: editEmployeeOptions,
          responsibleIds: activeEmployees.map((employee) => employee.id),
        }}
      />
    </AppLayout>
  )
}

export { OrderEditPage }
