import { Link } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Textarea } from '../../../components/ui/Textarea'
import { mockClients } from '../../clients/mocks/clients'
import { mockEmployees } from '../../employees/mocks/employees'
import type { Order } from '../types/order'

const activeClients = mockClients.filter((client) => client.status === 'active')
const activeEmployees = mockEmployees.filter(
  (employee) => employee.status === 'active',
)

type OrderFormProps = {
  order?: Order
}

function OrderForm({ order }: OrderFormProps) {
  const isEditing = order !== undefined
  const fieldPrefix = isEditing ? 'edit-order' : 'new-order'
  const cancelLink = isEditing ? `/orders/${order.id}` : '/orders'

  return (
    <form className="bg-surface mt-6 max-w-3xl space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6">
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
            <Select id={`${fieldPrefix}-client`} name="clientName">
              {activeClients.map((client) => (
                <option key={client.id} value={client.name}>
                  {client.name}
                </option>
              ))}
            </Select>
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
              name="description"
              rows={5}
              className="min-h-32"
              defaultValue={order?.description}
            />
          </div>

          <div className="max-w-xs space-y-2">
            <Label htmlFor={`${fieldPrefix}-value`}>Valor</Label>
            <Input
              id={`${fieldPrefix}-value`}
              name="value"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={order?.value ?? ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldPrefix}-notes`}>Observações (opcional)</Label>
            <Textarea
              id={`${fieldPrefix}-notes`}
              name="notes"
              rows={4}
              defaultValue={order?.notes ?? ''}
            />
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
          <div className="space-y-2">
            <Label htmlFor={`${fieldPrefix}-responsible`}>Responsável</Label>
            <Select
              id={`${fieldPrefix}-responsible`}
              name="responsibleName"
              defaultValue={order?.responsibleName}
            >
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.name}>
                  {employee.name}
                </option>
              ))}
            </Select>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Label htmlFor={`${fieldPrefix}-status`}>Status</Label>
              <Select
                id={`${fieldPrefix}-status`}
                name="status"
                defaultValue={order.status}
              >
                <option value="awaiting">Aguardando</option>
                <option value="in-progress">Em andamento</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </Select>
            </div>
          ) : null}

          <fieldset>
            <legend className="text-foreground text-sm font-medium">
              Visibilidade
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="has-[:checked]:border-primary has-[:checked]:bg-neutral-bg flex cursor-pointer items-center gap-3 rounded-ui border border-neutral-bg p-3">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  defaultChecked={order?.visibility === 'public'}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-foreground font-medium">Pública</span>
              </label>
              <label className="has-[:checked]:border-primary has-[:checked]:bg-neutral-bg flex cursor-pointer items-center gap-3 rounded-ui border border-neutral-bg p-3">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  defaultChecked={order?.visibility !== 'public'}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-foreground font-medium">Privada</span>
              </label>
            </div>
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
        <Button type="button">
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
