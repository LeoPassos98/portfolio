import { Link, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockClients } from '../mocks/clients'

const clientStatusDetails = {
  active: { label: 'Ativo', variant: 'success' },
  inactive: { label: 'Inativo', variant: 'neutral' },
} as const

function ClientEditPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const client = mockClients.find((item) => item.id === clientId)

  if (!client) {
    return (
      <AppLayout>
        <Link
          to="/clients"
          className="text-primary inline-flex rounded-ui hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Voltar para Clientes
        </Link>
        <div className="mt-6">
          <EmptyState
            title="Cliente não encontrado"
            description="Não foi possível localizar o cliente solicitado para edição."
          />
        </div>
      </AppLayout>
    )
  }

  const clientStatus = clientStatusDetails[client.status]

  return (
    <AppLayout>
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-bold">
            Editar cliente
          </h1>
          <p className="text-neutral mt-1">{client.name}</p>
        </div>
        <StatusBadge variant={clientStatus.variant}>
          {clientStatus.label}
        </StatusBadge>
      </header>

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
              <Input
                id="edit-client-name"
                name="name"
                defaultValue={client.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-document">
                CPF/CNPJ (opcional)
              </Label>
              <Input
                id="edit-client-document"
                name="document"
                defaultValue={client.document ?? ''}
              />
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
              <Input
                id="edit-client-phone"
                name="phone"
                type="tel"
                defaultValue={client.phone}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-email">E-mail (opcional)</Label>
              <Input
                id="edit-client-email"
                name="email"
                type="email"
                defaultValue={client.email ?? ''}
              />
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
              <Input
                id="edit-client-postal-code"
                name="postalCode"
                defaultValue={client.address.postalCode}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-client-street">Logradouro</Label>
              <Input
                id="edit-client-street"
                name="street"
                defaultValue={client.address.street}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-number">Número</Label>
              <Input
                id="edit-client-number"
                name="number"
                defaultValue={client.address.number}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-complement">
                Complemento (opcional)
              </Label>
              <Input
                id="edit-client-complement"
                name="complement"
                defaultValue={client.address.complement ?? ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-neighborhood">Bairro</Label>
              <Input
                id="edit-client-neighborhood"
                name="neighborhood"
                defaultValue={client.address.neighborhood}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-city">Cidade</Label>
              <Input
                id="edit-client-city"
                name="city"
                defaultValue={client.address.city}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-state">UF</Label>
              <Input
                id="edit-client-state"
                name="state"
                defaultValue={client.address.state}
              />
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
