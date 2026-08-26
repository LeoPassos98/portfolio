import { Link } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'

function ClientCreatePage() {
  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">Novo cliente</h1>

      <form className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6">
        <section aria-labelledby="new-client-data-title">
          <h2
            id="new-client-data-title"
            className="text-foreground text-lg font-bold"
          >
            Dados do cliente
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-client-name">Nome</Label>
              <Input id="new-client-name" name="name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-document">
                CPF/CNPJ (opcional)
              </Label>
              <Input id="new-client-document" name="document" />
            </div>
          </div>
        </section>

        <section aria-labelledby="new-client-contact-title">
          <h2
            id="new-client-contact-title"
            className="text-foreground text-lg font-bold"
          >
            Contato
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-client-phone">Telefone / WhatsApp</Label>
              <Input id="new-client-phone" name="phone" type="tel" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-email">E-mail (opcional)</Label>
              <Input id="new-client-email" name="email" type="email" />
            </div>
          </div>
        </section>

        <section aria-labelledby="new-client-address-title">
          <h2
            id="new-client-address-title"
            className="text-foreground text-lg font-bold"
          >
            Endereço
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-client-postal-code">CEP</Label>
              <Input id="new-client-postal-code" name="postalCode" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-client-street">Logradouro</Label>
              <Input id="new-client-street" name="street" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-number">Número</Label>
              <Input id="new-client-number" name="number" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-complement">
                Complemento (opcional)
              </Label>
              <Input id="new-client-complement" name="complement" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-neighborhood">Bairro</Label>
              <Input id="new-client-neighborhood" name="neighborhood" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-city">Cidade</Label>
              <Input id="new-client-city" name="city" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-state">UF</Label>
              <Input id="new-client-state" name="state" />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button">Cadastrar cliente</Button>
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

export { ClientCreatePage }
