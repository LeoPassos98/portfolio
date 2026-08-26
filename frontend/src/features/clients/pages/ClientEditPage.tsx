import { Link } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'

function ClientEditPage() {
  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">Editar cliente</h1>

      <form className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6">
        <section aria-labelledby="edit-client-data-title">
          <h2
            id="edit-client-data-title"
            className="text-foreground text-lg font-bold"
          >
            Dados do cliente
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-client-name">Nome</Label>
              <Input id="edit-client-name" name="name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-document">
                CPF/CNPJ (opcional)
              </Label>
              <Input id="edit-client-document" name="document" />
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-client-contact-title">
          <h2
            id="edit-client-contact-title"
            className="text-foreground text-lg font-bold"
          >
            Contato
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-phone">Telefone / WhatsApp</Label>
              <Input id="edit-client-phone" name="phone" type="tel" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-email">E-mail (opcional)</Label>
              <Input id="edit-client-email" name="email" type="email" />
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-client-address-title">
          <h2
            id="edit-client-address-title"
            className="text-foreground text-lg font-bold"
          >
            Endereço
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-postal-code">CEP</Label>
              <Input id="edit-client-postal-code" name="postalCode" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-client-street">Logradouro</Label>
              <Input id="edit-client-street" name="street" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-number">Número</Label>
              <Input id="edit-client-number" name="number" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-complement">
                Complemento (opcional)
              </Label>
              <Input id="edit-client-complement" name="complement" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-neighborhood">Bairro</Label>
              <Input id="edit-client-neighborhood" name="neighborhood" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-city">Cidade</Label>
              <Input id="edit-client-city" name="city" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-state">UF</Label>
              <Input id="edit-client-state" name="state" />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button">Salvar alterações</Button>
          <Link
            to="/clients"
            className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </AppLayout>
  )
}

export { ClientEditPage }
