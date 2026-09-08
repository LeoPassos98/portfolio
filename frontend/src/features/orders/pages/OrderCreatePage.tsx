import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useSuccessFeedback } from '../../../components/feedback/useSuccessFeedback'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import type { SearchableSelectOption } from '../../../components/ui/SearchableSelect'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { clientsQueryKeys } from '../../clients/api/clientQueryKeys'
import { listClients } from '../../clients/api/clientsApi'
import { employeesQueryKeys } from '../../employees/api/employeeQueryKeys'
import { listEmployees } from '../../employees/api/employeesApi'
import { OrderForm } from '../components/OrderForm'
import { ordersQueryKeys } from '../api/orderQueryKeys'
import { createOrder } from '../api/ordersApi'

const activeClientsParams = { status: 'active' } as const
const activeEmployeesParams = { status: 'active' } as const

function DependencySkeleton({ label }: { label: string }) {
  return (
    <div
      aria-label={`Carregando ${label}`}
      className="bg-surface mt-6 max-w-3xl animate-pulse rounded-ui border border-neutral-bg p-6"
    >
      <div className="h-6 w-40 rounded bg-neutral-bg" />
      <div className="mt-6 h-10 rounded bg-neutral-bg" />
      <div className="mt-8 h-6 w-48 rounded bg-neutral-bg" />
      <div className="mt-4 h-32 rounded bg-neutral-bg" />
    </div>
  )
}

function DependencyError({
  label,
  onRetry,
}: {
  label: string
  onRetry: () => void
}) {
  return (
    <div className="bg-surface mt-6 max-w-3xl rounded-ui border border-neutral-bg p-6">
      <p className="text-error" role="alert">
        Falha ao carregar {label}.
      </p>
      <Button type="button" className="mt-4" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

type OrderCreationContentProps = {
  clientOptions: readonly SearchableSelectOption[]
}

type OrderCreationFormProps = OrderCreationContentProps & {
  employeeOptions: readonly SearchableSelectOption[]
  responsibleName?: string
}

function OrderCreationForm({
  clientOptions,
  employeeOptions,
  responsibleName,
}: OrderCreationFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccess } = useSuccessFeedback()
  const createMutation = useMutation({
    mutationFn: createOrder,
  })

  return (
    <OrderForm
      creation={{
        clientOptions,
        employeeOptions,
        responsibleName,
        isPending: createMutation.isPending,
        onCreate: async (values) => {
          const order = await createMutation.mutateAsync(values)
          queryClient.setQueryData(ordersQueryKeys.detail(order.id), order)
          await queryClient.invalidateQueries({
            queryKey: ordersQueryKeys.lists(),
          })
          return order
        },
        onStaleClient: () => {
          void queryClient.invalidateQueries({
            queryKey: clientsQueryKeys.list(activeClientsParams),
          })
        },
        onStaleResponsible: () => {
          void queryClient.invalidateQueries({
            queryKey: employeesQueryKeys.list(activeEmployeesParams),
          })
        },
        onSuccess: (order) => {
          showSuccess('Ordem de serviço criada com sucesso.')
          navigate(`/orders/${order.id}`)
        },
      }}
    />
  )
}

function AdminOrderCreationContent({
  clientOptions,
}: OrderCreationContentProps) {
  const {
    data: employees = [],
    isError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: employeesQueryKeys.list(activeEmployeesParams),
    queryFn: () => listEmployees(activeEmployeesParams),
  })

  if (isPending) {
    return <DependencySkeleton label="Funcionários ativos" />
  }

  if (isError) {
    return (
      <DependencyError
        label="Funcionários ativos"
        onRetry={() => void refetch()}
      />
    )
  }

  const employeeOptions: SearchableSelectOption[] = employees.map(
    (employee) => ({
      label: employee.name,
      searchTerms: [employee.contactEmail, employee.phone],
      value: employee.id,
    }),
  )

  if (employeeOptions.length === 0) {
    return (
      <div className="bg-surface mt-6 max-w-3xl rounded-ui border border-neutral-bg p-6">
        <p className="text-foreground font-medium">
          Nenhum funcionário ativo disponível para ser responsável pela OS.
        </p>
        <p className="text-neutral mt-2 text-sm">
          Cadastre ou reative um funcionário antes de criar uma ordem de
          serviço.
        </p>
      </div>
    )
  }

  return (
    <OrderCreationForm
      clientOptions={clientOptions}
      employeeOptions={employeeOptions}
    />
  )
}

function OrderCreationContent({ clientOptions }: OrderCreationContentProps) {
  const session = useAuthSession()

  if (session?.currentUser.profile === 'admin') {
    return <AdminOrderCreationContent clientOptions={clientOptions} />
  }

  return (
    <OrderCreationForm
      clientOptions={clientOptions}
      employeeOptions={[]}
      responsibleName={session?.currentUser.name}
    />
  )
}

function OrderCreatePage() {
  const {
    data: clients = [],
    isError: isClientsError,
    isPending: isClientsPending,
    refetch: refetchClients,
  } = useQuery({
    queryKey: clientsQueryKeys.list(activeClientsParams),
    queryFn: () => listClients(activeClientsParams),
  })
  const clientOptions: SearchableSelectOption[] = clients.map((client) => ({
    label: client.name,
    searchTerms: client.document ? [client.document] : [],
    value: client.id,
  }))

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Nova ordem de serviço
      </h1>

      {isClientsPending ? <DependencySkeleton label="Clientes ativos" /> : null}
      {isClientsError ? (
        <DependencyError
          label="Clientes ativos"
          onRetry={() => void refetchClients()}
        />
      ) : null}
      {!isClientsPending && !isClientsError && clientOptions.length === 0 ? (
        <div className="bg-surface mt-6 max-w-3xl rounded-ui border border-neutral-bg p-6">
          <p className="text-foreground font-medium">
            Nenhum cliente ativo disponível para criar uma OS.
          </p>
        </div>
      ) : null}
      {!isClientsPending && !isClientsError && clientOptions.length > 0 ? (
        <OrderCreationContent clientOptions={clientOptions} />
      ) : null}
    </AppLayout>
  )
}

export { OrderCreatePage }
