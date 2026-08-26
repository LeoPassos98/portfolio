import { Link } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'

function EmployeeCreatePage() {
  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">Novo funcionário</h1>

      <form className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6">
        <section aria-labelledby="new-employee-data-title">
          <h2
            id="new-employee-data-title"
            className="text-foreground text-lg font-bold"
          >
            Dados do funcionário
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-employee-name">Nome</Label>
              <Input id="new-employee-name" name="name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-employee-status">
                Situação do funcionário
              </Label>
              <Select id="new-employee-status" name="status">
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
            </div>
          </div>
        </section>

        <section aria-labelledby="new-employee-contact-title">
          <h2
            id="new-employee-contact-title"
            className="text-foreground text-lg font-bold"
          >
            Contato
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-employee-phone">Telefone</Label>
              <Input id="new-employee-phone" name="phone" type="tel" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-employee-email">E-mail de contato</Label>
              <Input id="new-employee-email" name="email" type="email" />
            </div>
          </div>
        </section>

        <section aria-labelledby="new-employee-access-title">
          <h2
            id="new-employee-access-title"
            className="text-foreground text-lg font-bold"
          >
            Acesso ao sistema
          </h2>
          <p className="text-neutral mt-2">
            O funcionário será cadastrado sem uma conta de acesso. O acesso é
            criado separadamente após o cadastro.
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button">Cadastrar funcionário</Button>
          <Link
            to="/employees"
            className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </AppLayout>
  )
}

export { EmployeeCreatePage }
