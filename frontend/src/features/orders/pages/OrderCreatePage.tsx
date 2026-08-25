import { Link } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'

const clientOptions = [
  'Mariana Costa',
  'Empresa Horizonte',
  'Rafael Martins',
]

const employeeOptions = ['Carlos Lima', 'Ana Souza', 'Beatriz Alves']

function OrderCreatePage() {
  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Nova ordem de serviço
      </h1>

      <form className="bg-surface mt-6 space-y-6 rounded-ui border border-neutral-bg p-6">
        <div className="space-y-2">
          <Label htmlFor="new-order-client">Cliente</Label>
          <Select id="new-order-client" name="clientName">
            {clientOptions.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-order-responsible">Responsável</Label>
          <Select id="new-order-responsible" name="responsibleName">
            {employeeOptions.map((employee) => (
              <option key={employee} value={employee}>
                {employee}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <p className="text-foreground text-sm font-medium">Status inicial</p>
          <div className="mt-2">
            <StatusBadge variant="warning">Aguardando</StatusBadge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button">Criar ordem</Button>
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
