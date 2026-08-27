import { Link } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Textarea } from '../../../components/ui/Textarea'
import { mockClients } from '../../clients/mocks/clients'
import { mockEmployees } from '../../employees/mocks/employees'

const activeClients = mockClients.filter((client) => client.status === 'active')
const activeEmployees = mockEmployees.filter(
  (employee) => employee.status === 'active',
)

function OrderCreatePage() {
  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Nova ordem de serviço
      </h1>

      <form className="bg-surface mt-6 max-w-3xl space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6">
        <section aria-labelledby="new-order-client-title">
          <h2
            id="new-order-client-title"
            className="text-foreground text-lg font-bold"
          >
            Cliente
          </h2>

          <div className="mt-4 space-y-2">
            <Label htmlFor="new-order-client">Cliente</Label>
            <Select id="new-order-client" name="clientName">
              {activeClients.map((client) => (
                <option key={client.id} value={client.name}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <section aria-labelledby="new-order-service-title">
          <h2
            id="new-order-service-title"
            className="text-foreground text-lg font-bold"
          >
            Dados do serviço
          </h2>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-order-description">Descrição</Label>
              <Textarea
                id="new-order-description"
                name="description"
                rows={5}
                className="min-h-32"
              />
            </div>

            <div className="max-w-xs space-y-2">
              <Label htmlFor="new-order-value">Valor</Label>
              <Input
                id="new-order-value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-order-notes">Observações (opcional)</Label>
              <Textarea id="new-order-notes" name="notes" rows={4} />
            </div>
          </div>
        </section>

        <section aria-labelledby="new-order-configuration-title">
          <h2
            id="new-order-configuration-title"
            className="text-foreground text-lg font-bold"
          >
            Configuração
          </h2>

          <div className="mt-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="new-order-responsible">Responsável</Label>
              <Select id="new-order-responsible" name="responsibleName">
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.name}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </div>

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
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-foreground font-medium">Pública</span>
                </label>
                <label className="has-[:checked]:border-primary has-[:checked]:bg-neutral-bg flex cursor-pointer items-center gap-3 rounded-ui border border-neutral-bg p-3">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    defaultChecked
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-foreground font-medium">Privada</span>
                </label>
              </div>
            </fieldset>

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
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button">Criar OS</Button>
          <Link
            to="/orders"
            className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </AppLayout>
  )
}

export { OrderCreatePage }
