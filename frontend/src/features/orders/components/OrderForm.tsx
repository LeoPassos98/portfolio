import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '../../../components/ui/SearchableSelect'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Textarea } from '../../../components/ui/Textarea'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { mockClients } from '../../clients/mocks/clients'
import { mockEmployees } from '../../employees/mocks/employees'
import type { OrderEditPermissions } from '../lib/orderVisibility'
import {
  createOrderFormSchema,
  type OrderFormData,
  type OrderFormValues,
} from '../schemas/orderSchema'
import type { Order } from '../types/order'

const activeClients = mockClients.filter((client) => client.status === 'active')
const activeEmployees = mockEmployees.filter(
  (employee) => employee.status === 'active',
)
const clientOptions: SearchableSelectOption[] = activeClients.map((client) => ({
  label: client.name,
  searchTerms: client.document ? [client.document] : [],
  value: client.id,
}))
const employeeOptions: SearchableSelectOption[] = activeEmployees.map(
  (employee) => ({
    label: employee.name,
    searchTerms: [employee.contactEmail, employee.phone],
    value: employee.id,
  }),
)

type OrderFormProps = {
  order?: Order
  editPermissions?: OrderEditPermissions
}

function OrderForm({ order, editPermissions }: OrderFormProps) {
  const session = useAuthSession()
  const isEditing = order !== undefined
  const isEmployee = session?.currentUser.profile === 'employee'
  const fieldPrefix = isEditing ? 'edit-order' : 'new-order'
  const cancelLink = isEditing ? `/orders/${order.id}` : '/orders'
  const orderResponsibleId = order?.responsibleEmployeeId
  const responsibleId = isEditing
    ? orderResponsibleId
    : isEmployee
      ? session?.currentUser.employeeId
      : undefined
  const responsibleName =
    activeEmployees.find((employee) => employee.id === responsibleId)?.name ??
    order?.responsibleName
  const responsibleHelperText = isEditing
    ? 'O responsável não pode ser alterado por Funcionário.'
    : 'Definido automaticamente como responsável pela OS.'
  const canChangeResponsible =
    !isEmployee &&
    (!isEditing || editPermissions?.canChangeResponsible === true)
  const canChangeStatus =
    isEditing && editPermissions?.canChangeStatus === true
  const orderFormSchema = createOrderFormSchema({
    clientIds: activeClients.map((client) => client.id),
    requiresClient: !isEditing,
    responsibleIds: activeEmployees.map((employee) => employee.id),
  })
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData, unknown, OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientId: '',
      responsibleId: responsibleId ?? '',
      description: order?.description ?? '',
      value: order ? String(order.value) : '',
      notes: order?.notes ?? '',
      status: order?.status ?? 'awaiting',
      visibility: order?.visibility ?? 'private',
    },
  })

  function onSubmit() {}

  return (
    <form
      noValidate
      className="bg-surface mt-6 max-w-3xl space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6"
      onSubmit={handleSubmit(onSubmit)}
    >
      <section aria-labelledby={`${fieldPrefix}-client-title`}>
        <h2
          id={`${fieldPrefix}-client-title`}
          className="text-foreground text-lg font-bold"
        >
          Cliente
        </h2>

        {isEditing ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-neutral text-sm">Cliente vinculado</dt>
              <dd className="text-foreground mt-1 font-medium">
                {order.clientName}
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Número da OS</dt>
              <dd className="text-foreground mt-1 font-medium">
                {order.number}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="mt-4 space-y-2">
            <Label htmlFor={`${fieldPrefix}-client`}>Cliente</Label>
            <SearchableSelect
              id={`${fieldPrefix}-client`}
              name="clientId"
              options={clientOptions}
              placeholder="Pesquisar cliente"
              emptyMessage="Nenhum cliente ativo encontrado."
              ariaInvalid={Boolean(errors.clientId)}
              ariaDescribedBy={
                errors.clientId ? `${fieldPrefix}-client-error` : undefined
              }
              onValueChange={(value) => {
                setValue('clientId', value, { shouldValidate: true })
              }}
            />
            {errors.clientId?.message && (
              <p id={`${fieldPrefix}-client-error`} className="text-error text-sm">
                {errors.clientId.message}
              </p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby={`${fieldPrefix}-service-title`}>
        <h2
          id={`${fieldPrefix}-service-title`}
          className="text-foreground text-lg font-bold"
        >
          Dados do serviço
        </h2>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${fieldPrefix}-description`}>Descrição</Label>
            <Textarea
              id={`${fieldPrefix}-description`}
              rows={5}
              className="min-h-32"
              aria-invalid={Boolean(errors.description)}
              aria-required="true"
              aria-describedby={
                errors.description ? `${fieldPrefix}-description-error` : undefined
              }
              {...register('description')}
            />
            {errors.description?.message && (
              <p
                id={`${fieldPrefix}-description-error`}
                className="text-error text-sm"
              >
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="max-w-xs space-y-2">
            <Label htmlFor={`${fieldPrefix}-value`}>Valor</Label>
            <Input
              id={`${fieldPrefix}-value`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              aria-invalid={Boolean(errors.value)}
              aria-required="true"
              aria-describedby={
                errors.value ? `${fieldPrefix}-value-error` : undefined
              }
              {...register('value')}
            />
            {errors.value?.message && (
              <p id={`${fieldPrefix}-value-error`} className="text-error text-sm">
                {errors.value.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldPrefix}-notes`}>Observações (opcional)</Label>
            <Textarea
              id={`${fieldPrefix}-notes`}
              rows={4}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={
                errors.notes ? `${fieldPrefix}-notes-error` : undefined
              }
              {...register('notes')}
            />
            {errors.notes?.message && (
              <p id={`${fieldPrefix}-notes-error`} className="text-error text-sm">
                {errors.notes.message}
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby={`${fieldPrefix}-configuration-title`}>
        <h2
          id={`${fieldPrefix}-configuration-title`}
          className="text-foreground text-lg font-bold"
        >
          Configuração
        </h2>

        <div className="mt-4 space-y-6">
          {!canChangeResponsible ? (
            <dl className="rounded-ui bg-neutral-bg p-4">
              <div>
                <dt className="text-neutral text-sm">Responsável</dt>
                <dd className="text-foreground mt-1 font-medium">
                  {responsibleName}
                </dd>
                {isEmployee ? (
                  <p className="text-neutral mt-1 text-sm">
                    {responsibleHelperText}
                  </p>
                ) : null}
              </div>
            </dl>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`${fieldPrefix}-responsible`}>
                Responsável
              </Label>
              <SearchableSelect
                id={`${fieldPrefix}-responsible`}
                name="responsibleId"
                defaultValue={responsibleId}
                options={employeeOptions}
                placeholder="Pesquisar responsável"
                emptyMessage="Nenhum funcionário ativo encontrado."
                ariaInvalid={Boolean(errors.responsibleId)}
                ariaDescribedBy={
                  errors.responsibleId
                    ? `${fieldPrefix}-responsible-error`
                    : undefined
                }
                onValueChange={(value) => {
                  setValue('responsibleId', value, { shouldValidate: true })
                }}
              />
              {errors.responsibleId?.message && (
                <p
                  id={`${fieldPrefix}-responsible-error`}
                  className="text-error text-sm"
                >
                  {errors.responsibleId.message}
                </p>
              )}
            </div>
          )}

          {isEditing && canChangeStatus ? (
            <div className="space-y-2">
              <Label htmlFor={`${fieldPrefix}-status`}>Status</Label>
              <Select
                id={`${fieldPrefix}-status`}
                aria-invalid={Boolean(errors.status)}
                aria-required="true"
                aria-describedby={
                  errors.status ? `${fieldPrefix}-status-error` : undefined
                }
                {...register('status')}
              >
                <option value="awaiting">Aguardando</option>
                <option value="in-progress">Em andamento</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </Select>
              {errors.status?.message && (
                <p id={`${fieldPrefix}-status-error`} className="text-error text-sm">
                  {errors.status.message}
                </p>
              )}
            </div>
          ) : isEditing ? (
            <dl className="rounded-ui bg-neutral-bg p-4">
              <div>
                <dt className="text-neutral text-sm">Status</dt>
                <dd className="mt-2">
                  <StatusBadge
                    variant={
                      order.status === 'completed' ? 'success' : 'neutral'
                    }
                  >
                    {order.status === 'completed' ? 'Concluída' : 'Cancelada'}
                  </StatusBadge>
                </dd>
              </div>
            </dl>
          ) : null}

          <fieldset>
            <legend className="text-foreground text-sm font-medium">
              Visibilidade
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="has-[:checked]:border-primary has-[:checked]:bg-neutral-bg flex cursor-pointer items-center gap-3 rounded-ui border border-neutral-bg p-3">
                <input
                  type="radio"
                  value="public"
                  defaultChecked={order?.visibility === 'public'}
                  className="h-4 w-4 accent-primary"
                  aria-invalid={Boolean(errors.visibility)}
                  aria-describedby={
                    errors.visibility ? `${fieldPrefix}-visibility-error` : undefined
                  }
                  {...register('visibility')}
                />
                <span className="text-foreground font-medium">Pública</span>
              </label>
              <label className="has-[:checked]:border-primary has-[:checked]:bg-neutral-bg flex cursor-pointer items-center gap-3 rounded-ui border border-neutral-bg p-3">
                <input
                  type="radio"
                  value="private"
                  defaultChecked={order?.visibility !== 'public'}
                  className="h-4 w-4 accent-primary"
                  aria-invalid={Boolean(errors.visibility)}
                  aria-describedby={
                    errors.visibility ? `${fieldPrefix}-visibility-error` : undefined
                  }
                  {...register('visibility')}
                />
                <span className="text-foreground font-medium">Privada</span>
              </label>
            </div>
            {errors.visibility?.message && (
              <p
                id={`${fieldPrefix}-visibility-error`}
                className="text-error mt-2 text-sm"
              >
                {errors.visibility.message}
              </p>
            )}
          </fieldset>

          {isEditing ? null : (
            <dl className="grid gap-4 rounded-ui bg-neutral-bg p-4 sm:grid-cols-2">
              <div>
                <dt className="text-neutral text-sm">Status inicial</dt>
                <dd className="mt-2">
                  <StatusBadge variant="warning">Aguardando</StatusBadge>
                </dd>
              </div>
              <div>
                <dt className="text-neutral text-sm">Número da OS</dt>
                <dd className="text-foreground mt-1 font-medium">
                  Gerado automaticamente após a criação
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">
          {isEditing ? 'Salvar alterações' : 'Criar OS'}
        </Button>
        <Link
          to={cancelLink}
          className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}

export { OrderForm }
